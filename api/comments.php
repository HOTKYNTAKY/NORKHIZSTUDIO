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
        if (!$videoId) { http_response_code(400); echo json_encode(['error' => 'video_id_required'], JSON_UNESCAPED_UNICODE); exit; }
        $stmt = $pdo->prepare("SELECT c.id, c.body, c.likes, c.created_at, u.name AS author
                               FROM comments c JOIN users u ON u.id = c.user_id
                               WHERE c.video_id = ? AND c.parent_id IS NULL
                               ORDER BY c.created_at DESC");
        $stmt->execute([$videoId]);
        echo json_encode(['ok' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
        $body = trim($_POST['body'] ?? (json_decode(file_get_contents('php://input'), true)['body'] ?? ''));
        if (!$videoId || $body === '') { http_response_code(400); echo json_encode(['error' => 'video_and_body_required'], JSON_UNESCAPED_UNICODE); exit; }
        if (mb_strlen($body) > 1000) { http_response_code(400); echo json_encode(['error' => 'comment_too_long'], JSON_UNESCAPED_UNICODE); exit; }
        $pdo->prepare("INSERT INTO comments (video_id, user_id, body) VALUES (?, ?, ?)")->execute([$videoId, $user['id'], $body]);
        http_response_code(201);
        echo json_encode(['ok' => true, 'message' => 'نظر 등록 شد.'], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(405);
}