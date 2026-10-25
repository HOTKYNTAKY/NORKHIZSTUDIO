<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth($_SERVER, $_COOKIE);
if ($user['membership'] !== 'vip') {
    http_response_code(403);
    echo json_encode(['error' => 'vip_required_for_download'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = Database::connect();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$videoId = (int)($_GET['video_id'] ?? $_POST['video_id'] ?? 0);

if ($method === 'GET') {
    $stmt = $pdo->prepare("SELECT v.id, v.title, v.slug, d.created_at FROM downloads d JOIN videos v ON v.id = d.video_id WHERE d.user_id = ? ORDER BY d.created_at DESC");
    $stmt->execute([$user['id']]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
} elseif ($method === 'POST') {
    if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
    $stmt = $pdo->prepare("SELECT is_premium FROM videos WHERE id = ? LIMIT 1");
    $stmt->execute([$videoId]);
    $vid = $stmt->fetch();
    if (!$vid) { http_response_code(404); echo json_encode(['error' => 'video_not_found'], JSON_UNESCAPED_UNICODE); exit; }
    $pdo->prepare("INSERT IGNORE INTO downloads (user_id, video_id) VALUES (?, ?)")->execute([$user['id'], $videoId]);
    echo json_encode(['ok' => true, 'download_url' => "/api/videos/download/{$videoId}"], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(405);
}