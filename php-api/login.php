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
$username = is_array($payload) && isset($payload['username']) && is_string($payload['username'])
    ? trim($payload['username'])
    : '';
$password = is_array($payload) && isset($payload['password']) && is_string($payload['password'])
    ? $payload['password']
    : '';

if ($username === '' || strlen($username) > 80 || $password === '' || strlen($password) > 4096) {
    respondJson(400, ['error' => 'Username and password are required.']);
    exit;
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
        'SELECT password_hash FROM user_accounts WHERE username = :username LIMIT 1'
    );
    $statement->execute(['username' => $username]);
    $account = $statement->fetch();
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    respondJson(500, ['error' => 'Login service is not configured.']);
    exit;
} catch (PDOException $error) {
    error_log('Failed to check login credentials: ' . $error->getMessage());
    respondJson(503, ['error' => 'Login service is unavailable.']);
    exit;
}

if (!$account || !password_verify($password, $account['password_hash'])) {
    respondJson(401, ['error' => 'Incorrect username or password.']);
    exit;
}

respondJson(200, ['success' => true]);
