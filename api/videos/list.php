<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$pdo = Database::connect();

$category = $_GET['category'] ?? null;
$premium  = $_GET['premium'] ?? null;
$page     = max(1, (int)($_GET['page'] ?? 1));
$perPage  = min(50, max(1, (int)($_GET['per_page'] ?? 20)));
$offset   = ($page - 1) * $perPage;

$sql = "SELECT v.*, c.name AS category_name, c.slug AS category_slug
        FROM videos v
        LEFT JOIN categories c ON c.id = v.category_id
        WHERE v.status = 'approved'";
$params = [];

if ($category !== null && $category !== '') {
    $sql .= " AND c.slug = ?";
    $params[] = $category;
}
if ($premium !== null && $premium !== '') {
    $sql .= " AND v.is_premium = " . ($premium === 'true' || $premium === '1' ? 1 : 0);
}

$sql .= " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
$params[] = $perPage;
$params[] = $offset;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

// normalize
foreach ($items as &$item) {
    $item['rating'] = (float)$item['rating'];
    $item['views']  = (int)$item['views'];
    $item['duration_formatted'] = gmstrftime('%H:%M:%S', $item['duration_seconds']);
    unset($item['hls_manifest']); // not exposed in list
}

echo json_encode([
    'ok' => true,
    'page' => $page,
    'per_page' => $perPage,
    'data' => $items,
], JSON_UNESCAPED_UNICODE);