<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/app.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

use Norkhiz\Config\App;
use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$identifier = trim($input['identifier'] ?? '');
$password   = $input['password'] ?? '';

if ($identifier === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'identifier_and_password_required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = Database::connect();
$stmt = $pdo->prepare("SELECT * FROM users WHERE phone = ? OR email = ? LIMIT 1");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'invalid_credentials'], JSON_UNESCAPED_UNICODE);
    exit;
}

// create session
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+' . (int)(App::env('SESSION_LIFETIME', 120)) . ' minutes'));
$pdo->prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)")
    ->execute([$user['id'], $token, $expires]);

setcookie('session_token', $token, [
    'expires' => strtotime($expires),
    'path' => '/',
    'same_site' => 'Lax',
    'secure' => parse_url(App::baseUrl(), PHP_URL_SCHEME) === 'https',
    'httponly' => true,
]);
setcookie('csrf_token', bin2hex(random_bytes(16)), [
    'expires' => strtotime($expires),
    'path' => '/',
    'same_site' => 'Lax',
    'secure' => parse_url(App::baseUrl(), PHP_URL_SCHEME) === 'https',
    'httponly' => false,
]);

echo json_encode([
    'ok' => true,
    'user' => [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'membership' => $user['membership'],
        'avatar' => $user['avatar'],
    ],
    'token' => $token,
], JSON_UNESCAPED_UNICODE);