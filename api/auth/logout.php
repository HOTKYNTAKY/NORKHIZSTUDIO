<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth($_SERVER, $_COOKIE);
$token = $_COOKIE['session_token'] ?? null;
if ($token) {
    $pdo = Database::connect();
    $pdo->prepare("UPDATE sessions SET revoked_at = NOW() WHERE token = ?")->execute([$token]);
}
setcookie('session_token', '', ['path' => '/', 'expires' => time() - 3600]);
setcookie('csrf_token', '', ['path' => '/', 'expires' => time() - 3600]);

echo json_encode(['ok' => true, 'message' => 'با موفقیت خارج شدید.'], JSON_UNESCAPED_UNICODE);