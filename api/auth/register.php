<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/app.php';
require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($input['name'] ?? '');
$phone = trim($input['phone'] ?? '');
$email = trim($input['email'] ?? null);
$password = $input['password'] ?? '';
$vip = filter_var($input['vip'] ?? false, FILTER_VALIDATE_BOOLEAN);

if ($name === '' || $phone === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'name_phone_password_required'], JSON_UNESCAPED_UNICODE);
    exit;
}
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'password_too_short'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = Database::connect();
$exists = $pdo->prepare("SELECT id FROM users WHERE phone = ? OR email = ? LIMIT 1");
$exists->execute([$phone, $email]);
if ($exists->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'user_exists'], JSON_UNESCAPED_UNICODE);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$membership = $vip ? 'vip' : 'free';
$expires = $vip ? date('Y-m-d H:i:s', strtotime('+30 days')) : null;

$pdo->prepare("INSERT INTO users (name, phone, email, password_hash, membership, membership_expires_at) VALUES (?, ?, ?, ?, ?, ?)")
    ->execute([$name, $phone, $email, $hash, $membership, $expires]);

$newId = (int)$pdo->lastInsertId();

echo json_encode([
    'ok' => true,
    'user' => ['id' => $newId, 'name' => $name, 'membership' => $membership],
    'message' => 'ثبت‌نام با موفقیت انجام شد.',
], JSON_UNESCAPED_UNICODE);