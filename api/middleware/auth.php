<?php
declare(strict_types=1);

namespace Norkhiz\Middleware;

use Norkhiz\Config\Database;
use Norkhiz\Config\App;

function requireAuth(array $headers, array $cookies): array
{
    $token = extractBearer($headers) ?? ($cookies['session_token'] ?? null);
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'authentication_required'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $user = findUserByToken($token);
    if (!$user || $user['expires_at'] < date('Y-m-d H:i:s')) {
        http_response_code(401);
        echo json_encode(['error' => 'session_expired'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

function requireVip(array $headers, array $cookies): array
{
    $user = requireAuth($headers, $cookies);
    if ($user['membership'] !== 'vip' || ($user['membership_expires_at'] && $user['membership_expires_at'] < date('Y-m-d H:i:s'))) {
        http_response_code(403);
        echo json_encode(['error' => 'vip_required'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

function extractBearer(array $headers): ?string
{
    $auth = $headers['Authorization'] ?? $headers['HTTP_AUTHORIZATION'] ?? null;
    if (!$auth || !preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return null;
    }
    return $m[1];
}

function findUserByToken(string $token): ?array
{
    $pdo = Database::connect();
    $stmt = $pdo->prepare("SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.revoked_at IS NULL LIMIT 1");
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

function csrfCheck(array $headers): void
{
    $sent = $headers['X-CSRF-Token'] ?? $headers['HTTP_X_CSRF_TOKEN'] ?? null;
    $cookie = $_COOKIE['csrf_token'] ?? null;
    if (!$sent || !$cookie || !hash_equals($cookie, $sent)) {
        http_response_code(403);
        echo json_encode(['error' => 'csrf_invalid'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}