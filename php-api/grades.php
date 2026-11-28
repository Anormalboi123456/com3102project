<?php
/**
 * Grades API — students upload results; aggregated stats for module difficulty (Big Data concept).
 *
 * GET  ?username=...&role=...           → own grades + module statistics
 * GET  ?stats=1                         → module statistics only
 * POST { moduleCode, moduleName?, grade, semester?, academicYear?, comment?, isAnonymous? }
 * DELETE ?grade_id=...&username=...     → delete own grade entry
 */

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

function isValidGrade($grade)
{
    static $allowed = [
        'A+', 'A', 'A-',
        'B+', 'B', 'B-',
        'C+', 'C', 'C-',
        'D', 'F',
        'Pass', 'Fail',
    ];
    return in_array($grade, $allowed, true);
}

/** Map letter grades to points for averaging (HSU-style scale). */
function gradeToPoints($grade)
{
    $map = [
        'A+' => 4.3, 'A' => 4.0, 'A-' => 3.7,
        'B+' => 3.3, 'B' => 3.0, 'B-' => 2.7,
        'C+' => 2.3, 'C' => 2.0, 'C-' => 1.7,
        'D' => 1.0, 'F' => 0.0,
        'Pass' => 2.0, 'Fail' => 0.0,
    ];
    return $map[$grade] ?? null;
}

function isPassGrade($grade)
{
    return !in_array($grade, ['F', 'Fail'], true);
}

function isAGrade($grade)
{
    return in_array($grade, ['A+', 'A', 'A-'], true);
}

function fetchModuleStats(PDO $pdo)
{
    $statement = $pdo->query(
        'SELECT module_code, module_name, grade
         FROM grades
         ORDER BY module_code, grade_id'
    );
    $rows = $statement->fetchAll();

    $byModule = [];
    foreach ($rows as $row) {
        $code = $row['module_code'];
        if (!isset($byModule[$code])) {
            $byModule[$code] = [
                'module_code' => $code,
                'module_name' => $row['module_name'],
                'total' => 0,
                'pass_count' => 0,
                'a_count' => 0,
                'grade_counts' => [],
                'points_sum' => 0.0,
                'points_n' => 0,
            ];
        }
        $byModule[$code]['total']++;
        if ($row['module_name'] && !$byModule[$code]['module_name']) {
            $byModule[$code]['module_name'] = $row['module_name'];
        }
        $g = $row['grade'];
        if (!isset($byModule[$code]['grade_counts'][$g])) {
            $byModule[$code]['grade_counts'][$g] = 0;
        }
        $byModule[$code]['grade_counts'][$g]++;
        if (isPassGrade($g)) {
            $byModule[$code]['pass_count']++;
        }
        if (isAGrade($g)) {
            $byModule[$code]['a_count']++;
        }
        $pts = gradeToPoints($g);
        if ($pts !== null) {
            $byModule[$code]['points_sum'] += $pts;
            $byModule[$code]['points_n']++;
        }
    }

    $stats = [];
    foreach ($byModule as $code => $m) {
        $total = max(1, $m['total']);
        $avg = $m['points_n'] > 0 ? round($m['points_sum'] / $m['points_n'], 2) : null;
        $stats[] = [
            'module_code' => $m['module_code'],
            'module_name' => $m['module_name'],
            'sample_size' => $m['total'],
            'pass_rate' => round(100.0 * $m['pass_count'] / $total, 1),
            'a_rate' => round(100.0 * $m['a_count'] / $total, 1),
            'average_gpa_points' => $avg,
            'grade_distribution' => $m['grade_counts'],
        ];
    }

    // Sort by A-rate descending (easier modules first)
    usort($stats, function ($a, $b) {
        if ($a['a_rate'] === $b['a_rate']) {
            return $b['pass_rate'] <=> $a['pass_rate'];
        }
        return $b['a_rate'] <=> $a['a_rate'];
    });

    return $stats;
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
    respondJson(500, ['error' => 'Grades API is not configured.']);
    exit;
} catch (PDOException $error) {
    error_log('Grades DB connection failed: ' . $error->getMessage());
    respondJson(503, ['error' => 'Unable to connect to the database.']);
    exit;
}

// ---------- GET ----------
if ($method === 'GET') {
    $username = isset($_GET['username']) && is_string($_GET['username'])
        ? trim($_GET['username'])
        : '';
    $statsOnly = isset($_GET['stats']) && $_GET['stats'] === '1';

    try {
        $moduleStats = fetchModuleStats($pdo);

        $myGrades = [];
        if ($username !== '' && !$statsOnly) {
            $stmt = $pdo->prepare(
                'SELECT grade_id, username, module_code, module_name, grade, semester,
                        academic_year, comment, is_anonymous, created_at
                 FROM grades
                 WHERE username = :username
                 ORDER BY created_at DESC, grade_id DESC'
            );
            $stmt->execute(['username' => $username]);
            $myGrades = $stmt->fetchAll();
            foreach ($myGrades as &$g) {
                $g['is_anonymous'] = (int) $g['is_anonymous'] === 1;
            }
            unset($g);
        }

        respondJson(200, [
            'success' => true,
            'my_grades' => $myGrades,
            'module_stats' => $moduleStats,
            'total_submissions' => array_sum(array_column($moduleStats, 'sample_size')),
            'modules_covered' => count($moduleStats),
        ]);
    } catch (PDOException $error) {
        error_log('Failed to load grades: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to load grades from the database.']);
    }
    exit;
}

// ---------- POST (submit grade) ----------
if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        respondJson(400, ['error' => 'Request body must be valid JSON.']);
        exit;
    }

    $username = isset($payload['username']) && is_string($payload['username'])
        ? trim($payload['username'])
        : '';
    $moduleCode = isset($payload['moduleCode']) && is_string($payload['moduleCode'])
        ? strtoupper(trim($payload['moduleCode']))
        : '';
    $moduleName = isset($payload['moduleName']) && is_string($payload['moduleName'])
        ? trim($payload['moduleName'])
        : null;
    $grade = isset($payload['grade']) && is_string($payload['grade'])
        ? trim($payload['grade'])
        : '';
    $semester = isset($payload['semester']) && is_string($payload['semester'])
        ? trim($payload['semester'])
        : null;
    $academicYear = isset($payload['academicYear']) ? $payload['academicYear'] : null;
    $comment = isset($payload['comment']) && is_string($payload['comment'])
        ? trim($payload['comment'])
        : null;
    $isAnonymous = array_key_exists('isAnonymous', $payload)
        ? (bool) $payload['isAnonymous']
        : true;

    if ($username === '' || preg_match_all('/./us', $username) > 80) {
        respondJson(400, ['error' => 'Valid username is required.']);
        exit;
    }
    if ($moduleCode === '' || preg_match_all('/./us', $moduleCode) > 32) {
        respondJson(400, ['error' => 'Module code is required (max 32 characters).']);
        exit;
    }
    if (!isValidGrade($grade)) {
        respondJson(400, [
            'error' => 'Invalid grade. Allowed: A+, A, A-, B+, B, B-, C+, C, C-, D, F, Pass, Fail.',
        ]);
        exit;
    }
    if ($moduleName !== null && preg_match_all('/./us', $moduleName) > 150) {
        respondJson(400, ['error' => 'Module name is too long.']);
        exit;
    }
    if ($semester !== null && preg_match_all('/./us', $semester) > 40) {
        respondJson(400, ['error' => 'Semester is too long.']);
        exit;
    }
    if ($comment !== null && preg_match_all('/./us', $comment) > 2000) {
        respondJson(400, ['error' => 'Comment is too long (max 2000 characters).']);
        exit;
    }
    if ($academicYear !== null) {
        if (!is_numeric($academicYear)) {
            respondJson(400, ['error' => 'Academic year must be a number.']);
            exit;
        }
        $academicYear = (int) $academicYear;
        if ($academicYear < 2000 || $academicYear > 2100) {
            respondJson(400, ['error' => 'Academic year out of range.']);
            exit;
        }
    }

    if ($moduleName === '') {
        $moduleName = null;
    }
    if ($semester === '') {
        $semester = null;
    }
    if ($comment === '') {
        $comment = null;
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO grades
                (username, module_code, module_name, grade, semester, academic_year, comment, is_anonymous)
             VALUES
                (:username, :module_code, :module_name, :grade, :semester, :academic_year, :comment, :is_anonymous)'
        );
        $stmt->execute([
            'username' => $username,
            'module_code' => $moduleCode,
            'module_name' => $moduleName,
            'grade' => $grade,
            'semester' => $semester,
            'academic_year' => $academicYear,
            'comment' => $comment,
            'is_anonymous' => $isAnonymous ? 1 : 0,
        ]);

        $id = (int) $pdo->lastInsertId();
        respondJson(201, [
            'success' => true,
            'message' => 'Grade submitted successfully.',
            'grade_id' => $id,
        ]);
    } catch (PDOException $error) {
        error_log('Failed to insert grade: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to save grade to the database.']);
    }
    exit;
}

// ---------- DELETE ----------
if ($method === 'DELETE') {
    $gradeId = isset($_GET['grade_id']) ? filter_var($_GET['grade_id'], FILTER_VALIDATE_INT) : false;
    $username = isset($_GET['username']) && is_string($_GET['username'])
        ? trim($_GET['username'])
        : '';

    if ($gradeId === false || $gradeId < 1 || $username === '') {
        respondJson(400, ['error' => 'grade_id and username are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare(
            'DELETE FROM grades WHERE grade_id = :id AND username = :username'
        );
        $stmt->execute(['id' => $gradeId, 'username' => $username]);
        if ($stmt->rowCount() === 0) {
            respondJson(404, ['error' => 'Grade not found or you do not own it.']);
            exit;
        }
        respondJson(200, ['success' => true, 'message' => 'Grade deleted.']);
    } catch (PDOException $error) {
        error_log('Failed to delete grade: ' . $error->getMessage());
        respondJson(503, ['error' => 'Unable to delete grade.']);
    }
    exit;
}