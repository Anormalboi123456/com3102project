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

function optionalText($payload, $key, $maximumLength)
{
    if (!array_key_exists($key, $payload)) {
        return null;
    }

    $value = $payload[$key];
    if ($value === null) {
        return null;
    }
    if (!is_string($value)) {
        return false;
    }

    $value = trim($value);
    if ($value === '') {
        return null;
    }

    preg_match_all('/./us', $value, $characters);
    if (count($characters[0]) > $maximumLength) {
        return false;
    }

    return $value;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respondJson(405, ['error' => 'Method not allowed.']);
    exit;
}

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
    respondJson(403, ['error' => 'Unauthorized.']);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respondJson(400, ['error' => 'Request body must be valid JSON.']);
    exit;
}

$username = isset($payload['username']) && is_string($payload['username'])
    ? trim($payload['username'])
    : '';
$password = isset($payload['password']) && is_string($payload['password'])
    ? $payload['password']
    : '';
$isHsuStudent = $payload['isHsuStudent'] ?? null;

if (
    $username === ''
    || preg_match_all('/./us', $username) > 80
    || $password === ''
    || strlen($password) > 72
    || !is_bool($isHsuStudent)
) {
    respondJson(400, ['error' => 'Invalid username, password, or student status.']);
    exit;
}

$studentId = optionalText($payload, 'studentId', 32);
$entranceYear = optionalText($payload, 'entranceYear', 5);
$programme = optionalText($payload, 'programme', 80);
$heardAbout = optionalText($payload, 'heardAbout', 255);

if ($studentId === false || $entranceYear === false || $programme === false || $heardAbout === false) {
    respondJson(400, ['error' => 'One or more registration fields are invalid.']);
    exit;
}

if ($isHsuStudent) {
    if (
        $studentId === null
        || $entranceYear === null
        || !preg_match('/^\d{1,5}$/', $entranceYear)
        || (int) $entranceYear > 65535
        || $programme === null
    ) {
        respondJson(400, ['error' => 'Student ID, entrance year, and programme are required for students.']);
        exit;
    }
} else {
    $studentId = null;
    $entranceYear = null;
    $programme = null;
}

try {
    $host = requiredEnvironmentVariable('DB_HOST');
    $database = requiredEnvironmentVariable('DB_NAME');
    $user = requiredEnvironmentVariable('DB_USER');
    $databasePassword = getenv('DB_PASSWORD');
    $databasePassword = $databasePassword === false ? '' : $databasePassword;

    $rawPort = getenv('DB_PORT');
    $port = $rawPort === false || $rawPort === ''
        ? 3306
        : filter_var($rawPort, FILTER_VALIDATE_INT);
    if ($port === false || $port < 1 || $port > 65535) {
        throw new RuntimeException('DB_PORT must be a valid TCP port number.');
    }

    $pdo = new PDO(
        'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $database . ';charset=utf8mb4',
        $user,
        $databasePassword,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $statement = $pdo->prepare(
        'INSERT INTO user_accounts
            (username, password_hash, is_hsu_student, student_id, entrance_year, programme, heard_about)
         VALUES
            (:username, :password_hash, :is_hsu_student, :student_id, :entrance_year, :programme, :heard_about)'
    );
    $statement->execute([
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'is_hsu_student' => $isHsuStudent ? 1 : 0,
        'student_id' => $studentId,
        'entrance_year' => $entranceYear === null ? null : (int) $entranceYear,
        'programme' => $programme,
        'heard_about' => $heardAbout,
    ]);
} catch (PDOException $error) {
    if (($error->errorInfo[1] ?? null) === 1062) {
        respondJson(409, ['error' => 'That username is already registered.']);
        exit;
    }

    error_log('Failed to register account: ' . $error->getMessage());
    respondJson(503, ['error' => 'Registration service is unavailable.']);
    exit;
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respondJson(500, ['error' => 'Registration service is not configured.']);
    exit;
}

respondJson(201, ['success' => true]);
