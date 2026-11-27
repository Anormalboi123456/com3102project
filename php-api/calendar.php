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
    respondJson(500, ['error' => 'Calendar API is not configured.']);
    exit;
} catch (PDOException $error) {
    error_log('Calendar DB connection failed: ' . $error->getMessage());
    respondJson(503, ['error' => 'Unable to connect to the database.']);
    exit;
}

if ($method === 'GET') {
    $username = isset($_GET['username']) && is_string($_GET['username']) ? trim($_GET['username']) : '';
    $role = isset($_GET['role']) && is_string($_GET['role']) ? trim($_GET['role']) : 'Public';
    if (!in_array($role, ['Staff', 'Student', 'Public'], true)) {
        $role = 'Public';
    }

    try {
        if ($role === 'Staff' || $role === 'Student') {
            $stmt = $pdo->prepare(
                'SELECT event_id, title, module_code, event_date, event_time, event_type,
                        visibility, description, created_by, created_by_role, created_at
                 FROM calendar_events
                 WHERE visibility IN (\'Public\', \'HSU\')
                    OR (visibility = \'Personal\' AND created_by = :username)
                 ORDER BY event_date ASC, event_id ASC'
            );
            $stmt->execute(['username' => $username]);
        } else {
            $stmt = $pdo->prepare(
                'SELECT event_id, title, module_code, event_date, event_time, event_type,
                        visibility, description, created_by, created_by_role, created_at
                 FROM calendar_events
                 WHERE visibility = \'Public\'
                    OR (visibility = \'Personal\' AND :username <> \'\' AND created_by = :username2)
                 ORDER BY event_date ASC, event_id ASC'
            );
            $stmt->execute(['username' => $username, 'username2' => $username]);
        }

        $events = $stmt->fetchAll();

        $registeredActivities = [];
        if ($username !== '') {
            $actStmt = $pdo->prepare(
                'SELECT a.activity_id, a.title, a.category, a.activity_date, a.activity_time,
                        a.location, a.audience, a.description, r.registered_at
                 FROM activity_registrations r
                 INNER JOIN activities a ON a.activity_id = r.activity_id
                 WHERE r.username = :username
                 ORDER BY a.activity_date ASC, a.activity_id ASC'
            );
            $actStmt->execute(['username' => $username]);
            $registeredActivities = $actStmt->fetchAll();
        }

        respondJson(200, [
            'success' => true,
            'events' => $events,
            'registeredActivities' => $registeredActivities,
        ]);
    } catch (PDOException $error) {
        error_log('Calendar GET failed: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to load calendar events. Make sure calendar_activities.sql has been imported.']);
    }
    exit;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        respondJson(400, ['error' => 'Invalid JSON request body.']);
        exit;
    }

    $title = isset($payload['title']) && is_string($payload['title']) ? trim($payload['title']) : '';
    $moduleCode = isset($payload['module_code']) && is_string($payload['module_code']) ? trim($payload['module_code']) : '';
    $eventDate = isset($payload['event_date']) && is_string($payload['event_date']) ? trim($payload['event_date']) : '';
    $eventTime = isset($payload['event_time']) && is_string($payload['event_time']) ? trim($payload['event_time']) : '';
    $eventType = isset($payload['event_type']) && is_string($payload['event_type']) ? trim($payload['event_type']) : 'Assignment';
    $visibility = isset($payload['visibility']) && is_string($payload['visibility']) ? trim($payload['visibility']) : 'Personal';
    $description = isset($payload['description']) && is_string($payload['description']) ? trim($payload['description']) : '';
    $createdBy = isset($payload['created_by']) && is_string($payload['created_by']) ? trim($payload['created_by']) : '';
    $createdByRole = isset($payload['created_by_role']) && is_string($payload['created_by_role']) ? trim($payload['created_by_role']) : 'Public';

    $allowedTypes = ['Assignment', 'Test', 'Exam', 'Event', 'Holiday', 'Personal'];
    $allowedVisibilities = ['Public', 'HSU', 'Personal'];
    $allowedRoles = ['Staff', 'Student', 'Public'];

    if ($createdBy === '' || !in_array($createdByRole, $allowedRoles, true)) {
        respondJson(401, ['error' => 'You must be logged in to add calendar events.']);
        exit;
    }

    if ($title === '' || strlen($title) > 200) {
        respondJson(400, ['error' => 'Title is required (max 200 characters).']);
        exit;
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $eventDate)) {
        respondJson(400, ['error' => 'Event date must be in YYYY-MM-DD format.']);
        exit;
    }

    if (!in_array($eventType, $allowedTypes, true)) {
        respondJson(400, ['error' => 'Invalid event type.']);
        exit;
    }

    if (!in_array($visibility, $allowedVisibilities, true)) {
        respondJson(400, ['error' => 'Invalid visibility value.']);
        exit;
    }

    // Only HSU Staff can publish Public or HSU-wide official calendar items
    if ($createdByRole !== 'Staff') {
        $visibility = 'Personal';
        if (!in_array($eventType, ['Personal', 'Assignment', 'Test', 'Exam', 'Event'], true)) {
            $eventType = 'Personal';
        }
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO calendar_events
                (title, module_code, event_date, event_time, event_type, visibility, description, created_by, created_by_role)
             VALUES
                (:title, :module_code, :event_date, :event_time, :event_type, :visibility, :description, :created_by, :created_by_role)'
        );
        $stmt->execute([
            'title' => $title,
            'module_code' => $moduleCode !== '' ? strtoupper(substr($moduleCode, 0, 32)) : null,
            'event_date' => $eventDate,
            'event_time' => $eventTime !== '' ? substr($eventTime, 0, 64) : null,
            'event_type' => $eventType,
            'visibility' => $visibility,
            'description' => $description !== '' ? $description : null,
            'created_by' => $createdBy,
            'created_by_role' => $createdByRole,
        ]);

        respondJson(201, [
            'success' => true,
            'event_id' => (int) $pdo->lastInsertId(),
        ]);
    } catch (PDOException $error) {
        error_log('Calendar POST failed: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to save calendar event.']);
    }
    exit;
}

if ($method === 'DELETE') {
    $payload = json_decode(file_get_contents('php://input'), true);
    $eventId = is_array($payload) && isset($payload['event_id']) ? filter_var($payload['event_id'], FILTER_VALIDATE_INT) : false;
    $username = is_array($payload) && isset($payload['username']) && is_string($payload['username']) ? trim($payload['username']) : '';
    $role = is_array($payload) && isset($payload['role']) && is_string($payload['role']) ? trim($payload['role']) : 'Public';

    if ($eventId === false || $eventId < 1 || $username === '') {
        respondJson(400, ['error' => 'Valid event_id and login session are required.']);
        exit;
    }

    try {
        if ($role === 'Staff') {
            $stmt = $pdo->prepare('DELETE FROM calendar_events WHERE event_id = :event_id');
            $stmt->execute(['event_id' => $eventId]);
        } else {
            $stmt = $pdo->prepare(
                'DELETE FROM calendar_events
                 WHERE event_id = :event_id AND visibility = \'Personal\' AND created_by = :username'
            );
            $stmt->execute(['event_id' => $eventId, 'username' => $username]);
        }

        if ($stmt->rowCount() === 0) {
            respondJson(403, ['error' => 'Event not found or you do not have permission to delete it.']);
            exit;
        }

        respondJson(200, ['success' => true]);
    } catch (PDOException $error) {
        error_log('Calendar DELETE failed: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to delete calendar event.']);
    }
    exit;
}
