<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = Database::connect();
$stmt = $pdo->prepare("SELECT v.*, c.name AS category_name, c.slug AS category_slug
                       FROM videos v LEFT JOIN categories c ON c.id = v.category_id
                       WHERE v.id = ? AND v.status = 'approved' LIMIT 1");
$stmt->execute([$id]);
$video = $stmt->fetch();

if (!$video) {
    http_response_code(404);
    echo json_encode(['error' => 'video_not_found'], JSON_UNESCAPED_UNICODE);
    exit;
}

// tags
$tags = $pdo->prepare("SELECT tag FROM video_tags WHERE video_id = ? ORDER BY id ASC");
$tags->execute([$id]);
$video['tags'] = $tags->fetchAll(PDO::FETCH_COLUMN);

// captions
$captions = $pdo->prepare("SELECT id, lang, label, file, is_default FROM video_captions WHERE video_id = ? ORDER BY is_default DESC, id ASC");
$captions->execute([$id]);
$video['captions'] = $captions->fetchAll();

// related (same category, excluding self)
$related = [];
if ($video['category_id']) {
    $r = $pdo->prepare("SELECT id, title, slug, rating, views, quality_max, is_premium, hls_manifest, poster FROM videos WHERE category_id = ? AND id != ? AND status = 'approved' ORDER BY created_at DESC LIMIT 6");
    $r->execute([$video['category_id'], $id]);
    $related = $r->fetchAll();
    foreach ($related as &$rel) {
        $rel['rating'] = (float)$rel['rating'];
        $rel['views'] = (int)$rel['views'];
    }
}

// increment view
$pdo->prepare("UPDATE videos SET views = views + 1 WHERE id = ?")->execute([$id]);
$video['views'] = (int)$video['views'] + 1;

echo json_encode([
    'ok' => true,
    'video' => array_merge($video, ['rating' => (float)$video['rating'], 'views' => (int)$video['views']]),
    'related' => $related,
], JSON_UNESCAPED_UNICODE);