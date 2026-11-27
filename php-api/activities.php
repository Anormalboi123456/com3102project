<?php

function respondJson($status, $body)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body);
}

function requiredEnvironmentVariable($name)
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException($name . ' is not configured.');
    }

    return $value;
}

function verifyBearerToken()
{
    $apiToken = getenv('STUDENTS_API_TOKEN');
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $authorization = $value;
                break;
            }
        }
    }

    if (
        $apiToken === false
        || $apiToken === ''
        || !preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)
        || !hash_equals($apiToken, trim($matches[1]))
    ) {
        respondJson(401, ['error' => 'Unauthorized.']);
        exit;
    }
}

function connectDatabase()
{
    $host = requiredEnvironmentVariable('DB_HOST');
    $database = requiredEnvironmentVariable('DB_NAME');
    $user = requiredEnvironmentVariable('DB_USER');
    $password = getenv('DB_PASSWORD');
    $password = $password === false ? '' : $password;

    $rawPort = getenv('DB_PORT');
    $port = $rawPort === false || $rawPort === ''
        ? 3306
        : filter_var($rawPort, FILTER_VALIDATE_INT);
    if ($port === false || $port < 1 || $port > 65535) {
        throw new RuntimeException('DB_PORT must be a valid TCP port number.');
    }

    return new PDO(
        'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $database . ';charset=utf8mb4',
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}

verifyBearerToken();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST', 'DELETE'], true)) {
    header('Allow: GET, POST, DELETE');
    respondJson(405, ['error' => 'Method not allowed.']);
    exit;
}

try {
    $pdo = connectDatabase();
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respondJson(500, ['error' => 'Activities API is not configured.']);
    exit;
} catch (PDOException $error) {
    error_log('Activities DB connection failed: ' . $error->getMessage());
    respondJson(503, ['error' => 'Unable to connect to the database.']);
    exit;
}

if ($method === 'GET') {
    $username = isset($_GET['username']) && is_string($_GET['username']) ? trim($_GET['username']) : '';
    $role = isset($_GET['role']) && is_string($_GET['role']) ? trim($_GET['role']) : 'Public';

    // Staff participant list lookup: ?participants=<activity_id>
    if (isset($_GET['participants'])) {
        if ($role !== 'Staff') {
            respondJson(403, ['error' => 'HSU staff access is required to view participant lists.']);
            exit;
        }
        $activityId = filter_var($_GET['participants'], FILTER_VALIDATE_INT);
        if ($activityId === false || $activityId < 1) {
            respondJson(400, ['error' => 'Invalid activity_id.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare(
                'SELECT r.registration_id, r.username, r.registered_at,
                        u.is_hsu_student, u.is_hsu_staff, u.student_id, u.programme
                 FROM activity_registrations r
                 LEFT JOIN user_accounts u ON u.username = r.username
                 WHERE r.activity_id = :activity_id
                 ORDER BY r.registered_at ASC'
            );
            $stmt->execute(['activity_id' => $activityId]);
            $participants = $stmt->fetchAll();

            respondJson(200, [
                'success' => true,
                'participants' => $participants,
            ]);
        } catch (PDOException $error) {
            error_log('Activities participants GET failed: ' . $error->getMessage());
            respondJson(503, ['error' => 'Unable to load participants.']);
        }
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT a.activity_id, a.title, a.category, a.activity_date, a.activity_time,
                    a.location, a.capacity, a.audience, a.description, a.created_by, a.created_at,
                    COUNT(r.registration_id) AS registered_count,
                    MAX(CASE WHEN r.username = :username THEN 1 ELSE 0 END) AS is_registered
             FROM activities a
             LEFT JOIN activity_registrations r ON r.activity_id = a.activity_id
             GROUP BY a.activity_id
             ORDER BY a.activity_date ASC, a.activity_id ASC'
        );
        $stmt->execute(['username' => $username]);
        $rows = $stmt->fetchAll();

        $activities = array_map(function ($row) {
            return [
                'activity_id' => (int) $row['activity_id'],
                'title' => $row['title'],
                'category' => $row['category'],
                'activity_date' => $row['activity_date'],
                'activity_time' => $row['activity_time'],
                'location' => $row['location'],
                'capacity' => (int) $row['capacity'],
                'audience' => $row['audience'],
                'description' => $row['description'],
                'created_by' => $row['created_by'],
                'created_at' => $row['created_at'],
                'registered_count' => (int) $row['registered_count'],
                'is_registered' => ((int) $row['is_registered']) === 1,
            ];
        }, $rows);

        respondJson(200, [
            'success' => true,
            'activities' => $activities,
        ]);
    } catch (PDOException $error) {
        error_log('Activities GET failed: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to load activities. Make sure calendar_activities.sql has been imported.']);
    }
    exit;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        respondJson(400, ['error' => 'Invalid JSON request body.']);
        exit;
    }

    $action = isset($payload['action']) && is_string($payload['action']) ? trim($payload['action']) : '';
    $username = isset($payload['username']) && is_string($payload['username']) ? trim($payload['username']) : '';
    $role = isset($payload['role']) && is_string($payload['role']) ? trim($payload['role']) : 'Public';

    if ($username === '') {
        respondJson(401, ['error' => 'You must be logged in to perform this action.']);
        exit;
    }

    if ($action === 'create') {
        if ($role !== 'Staff') {
            respondJson(403, ['error' => 'Only HSU Staff can create new activities.']);
            exit;
        }

        $title = isset($payload['title']) && is_string($payload['title']) ? trim($payload['title']) : '';
        $category = isset($payload['category']) && is_string($payload['category']) ? trim($payload['category']) : 'Club';
        $activityDate = isset($payload['activity_date']) && is_string($payload['activity_date']) ? trim($payload['activity_date']) : '';
        $activityTime = isset($payload['activity_time']) && is_string($payload['activity_time']) ? trim($payload['activity_time']) : '14:00 - 16:00';
        $location = isset($payload['location']) && is_string($payload['location']) ? trim($payload['location']) : 'HSU Campus';
        $capacity = isset($payload['capacity']) ? filter_var($payload['capacity'], FILTER_VALIDATE_INT) : 50;
        $audience = isset($payload['audience']) && is_string($payload['audience']) ? trim($payload['audience']) : 'Public';
        $description = isset($payload['description']) && is_string($payload['description']) ? trim($payload['description']) : '';

        $allowedCategories = ['Academic', 'Club', 'Workshop', 'Sports', 'Career', 'Social'];
        $allowedAudiences = ['Public', 'HSU Only'];

        if ($title === '' || strlen($title) > 200) {
            respondJson(400, ['error' => 'Activity title is required (max 200 characters).']);
            exit;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $activityDate)) {
            respondJson(400, ['error' => 'Activity date must be in YYYY-MM-DD format.']);
            exit;
        }
        if (!in_array($category, $allowedCategories, true)) {
            respondJson(400, ['error' => 'Invalid activity category.']);
            exit;
        }
        if (!in_array($audience, $allowedAudiences, true)) {
            respondJson(400, ['error' => 'Invalid audience setting.']);
            exit;
        }
        if ($capacity === false || $capacity < 1 || $capacity > 5000) {
            respondJson(400, ['error' => 'Capacity must be between 1 and 5000.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO activities
                    (title, category, activity_date, activity_time, location, capacity, audience, description, created_by)
                 VALUES
                    (:title, :category, :activity_date, :activity_time, :location, :capacity, :audience, :description, :created_by)'
            );
            $stmt->execute([
                'title' => $title,
                'category' => $category,
                'activity_date' => $activityDate,
                'activity_time' => $activityTime !== '' ? substr($activityTime, 0, 64) : '14:00 - 16:00',
                'location' => $location !== '' ? substr($location, 0, 150) : 'HSU Campus',
                'capacity' => $capacity,
                'audience' => $audience,
                'description' => $description !== '' ? $description : null,
                'created_by' => $username,
            ]);

            respondJson(201, [
                'success' => true,
                'activity_id' => (int) $pdo->lastInsertId(),
            ]);
        } catch (PDOException $error) {
            error_log('Activity create failed: ' . $error->getMessage());
            respondJson(503, ['error' => 'Unable to create activity.']);
        }
        exit;
    }

    if ($action === 'register') {
        $activityId = isset($payload['activity_id']) ? filter_var($payload['activity_id'], FILTER_VALIDATE_INT) : false;
        if ($activityId === false || $activityId < 1) {
            respondJson(400, ['error' => 'Valid activity_id is required.']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            $actStmt = $pdo->prepare(
                'SELECT activity_id, capacity, audience FROM activities WHERE activity_id = :activity_id FOR UPDATE'
            );
            $actStmt->execute(['activity_id' => $activityId]);
            $activity = $actStmt->fetch();

            if (!$activity) {
                $pdo->rollBack();
                respondJson(404, ['error' => 'Activity not found.']);
                exit;
            }

            if ($activity['audience'] === 'HSU Only' && $role !== 'Student' && $role !== 'Staff') {
                $pdo->rollBack();
                respondJson(403, ['error' => 'This activity is restricted to HSU students and staff.']);
                exit;
            }

            $dupStmt = $pdo->prepare(
                'SELECT registration_id FROM activity_registrations WHERE activity_id = :activity_id AND username = :username LIMIT 1'
            );
            $dupStmt->execute(['activity_id' => $activityId, 'username' => $username]);
            if ($dupStmt->fetch()) {
                $pdo->rollBack();
                respondJson(409, ['error' => 'You are already registered for this activity.']);
                exit;
            }

            $cntStmt = $pdo->prepare(
                'SELECT COUNT(*) AS cnt FROM activity_registrations WHERE activity_id = :activity_id'
            );
            $cntStmt->execute(['activity_id' => $activityId]);
            $countRow = $cntStmt->fetch();
            $currentCount = $countRow ? (int) $countRow['cnt'] : 0;

            if ($currentCount >= (int) $activity['capacity']) {
                $pdo->rollBack();
                respondJson(409, ['error' => 'This activity is already full.']);
                exit;
            }

            $insStmt = $pdo->prepare(
                'INSERT INTO activity_registrations (activity_id, username) VALUES (:activity_id, :username)'
            );
            $insStmt->execute(['activity_id' => $activityId, 'username' => $username]);

            $pdo->commit();
            respondJson(201, ['success' => true]);
        } catch (PDOException $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Activity register failed: ' . $error->getMessage());
            respondJson(503, ['error' => 'Unable to complete registration.']);
        }
        exit;
    }

    if ($action === 'unregister') {
        $activityId = isset($payload['activity_id']) ? filter_var($payload['activity_id'], FILTER_VALIDATE_INT) : false;
        if ($activityId === false || $activityId < 1) {
            respondJson(400, ['error' => 'Valid activity_id is required.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare(
                'DELETE FROM activity_registrations WHERE activity_id = :activity_id AND username = :username'
            );
            $stmt->execute(['activity_id' => $activityId, 'username' => $username]);
            respondJson(200, ['success' => true]);
        } catch (PDOException $error) {
            error_log('Activity unregister failed: ' . $error->getMessage());
            respondJson(503, ['error' => 'Unable to cancel registration.']);
        }
        exit;
    }

    respondJson(400, ['error' => 'Unknown action.']);
    exit;
}

if ($method === 'DELETE') {
    $payload = json_decode(file_get_contents('php://input'), true);
    $activityId = is_array($payload) && isset($payload['activity_id']) ? filter_var($payload['activity_id'], FILTER_VALIDATE_INT) : false;
    $role = is_array($payload) && isset($payload['role']) && is_string($payload['role']) ? trim($payload['role']) : 'Public';

    if ($role !== 'Staff') {
        respondJson(403, ['error' => 'Only HSU Staff can delete activities.']);
        exit;
    }

    if ($activityId === false || $activityId < 1) {
        respondJson(400, ['error' => 'Valid activity_id is required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM activities WHERE activity_id = :activity_id');
        $stmt->execute(['activity_id' => $activityId]);
        if ($stmt->rowCount() === 0) {
            respondJson(404, ['error' => 'Activity not found.']);
            exit;
        }
        respondJson(200, ['success' => true]);
    } catch (PDOException $error) {
        error_log('Activity DELETE failed: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to delete activity.']);
    }
    exit;
}
