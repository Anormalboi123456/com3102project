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
    respondJson(401, ['error' => 'Unauthorized.']);
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
        'SELECT account_id, username, is_hsu_student, is_hsu_staff, student_id, staff_number,
                entrance_year, programme, heard_about, registered_at
         FROM user_accounts
         ORDER BY registered_at DESC, account_id DESC'
    );
    $accounts = $statement->fetchAll();
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respondJson(500, ['error' => 'User accounts API is not configured.']);
    exit;
} catch (PDOException $error) {
    error_log('Failed to load user accounts from MariaDB: ' . $error->getMessage());
    respondJson(503, ['error' => 'Unable to load user accounts from the database.']);
    exit;
}

respondJson(200, [
    'success' => true,
    'count' => count($accounts),
    'accounts' => $accounts,
]);
