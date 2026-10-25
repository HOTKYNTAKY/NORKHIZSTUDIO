<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$q = trim($_GET['q'] ?? '');
$category = $_GET['category'] ?? null;
$quality = $_GET['quality'] ?? null;
$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $perPage;

$pdo = Database::connect();
$sql = "SELECT v.*, c.name AS category_name
        FROM videos v LEFT JOIN categories c ON c.id = v.category_id
        WHERE v.status = 'approved'";
$params = [];

if ($q !== '') {
    $sql .= " AND (v.title LIKE ? OR v.description LIKE ?)";
    $like = "%{$q}%";
    $params[] = $like;
    $params[] = $like;
}
if ($category) {
    $sql .= " AND c.slug = ?";
    $params[] = $category;
}
if ($quality) {
    $sql .= " AND v.quality_max = ?";
    $params[] = $quality;
}

$sql .= " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
$params[] = $perPage;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

foreach ($items as &$it) {
    $it['rating'] = (float)$it['rating'];
    $it['views'] = (int)$it['views'];
    unset($it['hls_manifest']);
}

echo json_encode(['ok' => true, 'q' => $q, 'page' => $page, 'data' => $items], JSON_UNESCAPED_UNICODE);