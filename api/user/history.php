<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$user = requireAuth($_SERVER, $_COOKIE);
$pdo = Database::connect();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$videoId = (int)($_GET['video_id'] ?? $_POST['video_id'] ?? 0);
$position = (int)($_POST['position_seconds'] ?? 0);

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("SELECT v.id, v.title, v.slug, v.rating, v.views, w.watched_at, w.position_seconds
                               FROM watch_history w JOIN videos v ON v.id = w.video_id
                               WHERE w.user_id = ? ORDER BY w.watched_at DESC");
        $stmt->execute([$user['id']]);
        $items = $stmt->fetchAll();
        foreach ($items as &$it) { $it['rating'] = (float)$it['rating']; $it['views'] = (int)$it['views']; }
        echo json_encode(['ok' => true, 'data' => $items], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
        if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
        $pdo->prepare("INSERT INTO watch_history (user_id, video_id, position_seconds) VALUES (?, ?, ?)
                       ON DUPLICATE KEY UPDATE watched_at = NOW(), position_seconds = VALUES(position_seconds)")
            ->execute([$user['id'], $videoId, $position]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        break;

    case 'DELETE':
        if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
        $pdo->prepare("DELETE FROM watch_history WHERE user_id = ? AND video_id = ?")->execute([$user['id'], $videoId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
}