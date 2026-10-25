<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$id = (int)($_GET['id'] ?? 0);
$pdo = Database::connect();

if ($id) {
    $pdo->prepare("SELECT category_id FROM videos WHERE id = ? LIMIT 1")->execute([$id]);
    $cat = $pdo->fetchColumn();
} else {
    $cat = null;
}

$sql = "SELECT id, title, slug, rating, views, quality_max, is_premium FROM videos WHERE status = 'approved'";
$params = [];
if ($cat) {
    $sql .= " AND category_id = ? AND id != ?";
    $params = [$cat, $id];
}
$sql .= " ORDER BY views DESC LIMIT 8";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();
foreach ($items as &$it) {
    $it['rating'] = (float)$it['rating'];
    $it['views'] = (int)$it['views'];
}

echo json_encode(['ok' => true, 'data' => $items], JSON_UNESCAPED_UNICODE);