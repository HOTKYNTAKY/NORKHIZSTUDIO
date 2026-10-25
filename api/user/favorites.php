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

switch ($method) {
    case 'GET':
        $stmt = $pdo->prepare("SELECT v.id, v.title, v.slug, v.rating, v.views, v.is_premium, f.created_at
                               FROM favorites f JOIN videos v ON v.id = f.video_id
                               WHERE f.user_id = ? ORDER BY f.created_at DESC");
        $stmt->execute([$user['id']]);
        $items = $stmt->fetchAll();
        foreach ($items as &$it) { $it['rating'] = (float)$it['rating']; $it['views'] = (int)$it['views']; }
        echo json_encode(['ok' => true, 'data' => $items], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
        if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
        $pdo->prepare("INSERT IGNORE INTO favorites (user_id, video_id) VALUES (?, ?)")->execute([$user['id'], $videoId]);
        echo json_encode(['ok' => true, 'message' => 'به علاقه‌مندی‌ها افزوده شد.'], JSON_UNESCAPED_UNICODE);
        break;

    case 'DELETE':
        if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
        $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND video_id = ?")->execute([$user['id'], $videoId]);
        echo json_encode(['ok' => true, 'message' => 'حذف شد.'], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
}