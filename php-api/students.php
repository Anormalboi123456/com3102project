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

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    respondJson(405, [
        'error' => true,
        'message' => 'Method not allowed.',
    ]);
    exit;
}

$apiToken = getenv('STUDENTS_API_TOKEN');
if ($apiToken === false || $apiToken === '') {
    error_log('STUDENTS_API_TOKEN is not configured.');
    respondJson(500, [
        'error' => true,
        'message' => 'Student API is not configured.',
    ]);
    exit;
}

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
    !preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)
    || !hash_equals($apiToken, trim($matches[1]))
) {
    respondJson(401, [
        'error' => true,
        'message' => 'Unauthorized. A valid bearer token is required.',
    ]);
    exit;
}

try {
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
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respondJson(500, [
        'error' => true,
        'message' => 'Student API is not configured.',
    ]);
    exit;
}

try {
    $pdo = new PDO(
        'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $database . ';charset=utf8mb4',
        $user,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $statement = $pdo->query(
        'SELECT student_name, student_id, programme, last_login, registered_at
         FROM students
         ORDER BY registered_at DESC, student_id ASC'
    );
    $students = $statement->fetchAll();
} catch (PDOException $error) {
    error_log('Failed to load students from MariaDB: ' . $error->getMessage());
    respondJson(503, [
        'error' => true,
        'message' => 'Unable to load students from the database.',
    ]);
    exit;
}

$requestedFormat = $_GET['format'] ?? '';
$format = is_string($requestedFormat) ? strtolower($requestedFormat) : '';
if ($format === 'xml') {
    $escapeXml = function ($value) {
        return htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    };

    $studentXml = '';
    foreach ($students as $student) {
        $studentXml .= '  <student>' . "\n"
            . '    <student_name>' . $escapeXml($student['student_name']) . "</student_name>\n"
            . '    <student_id>' . $escapeXml($student['student_id']) . "</student_id>\n"
            . '    <programme>' . $escapeXml($student['programme']) . "</programme>\n"
            . '    <last_login>' . $escapeXml($student['last_login'] ?? '') . "</last_login>\n"
            . '    <registered_at>' . $escapeXml($student['registered_at']) . "</registered_at>\n"
            . "  </student>\n";
    }

    header('Content-Type: application/xml; charset=utf-8');
    echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        . "<students>\n"
        . $studentXml
        . "</students>";
    exit;
}

respondJson(200, [
    'success' => true,
    'count' => count($students),
    'students' => $students,
]);
