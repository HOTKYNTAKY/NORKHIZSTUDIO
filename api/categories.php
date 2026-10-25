<?php
declare(strict_types=1);

require_once __DIR__ . '/config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$pdo = Database::connect();
$stmt = $pdo->query("SELECT id, name, slug, description, thumbnail, video_count, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC");
echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);