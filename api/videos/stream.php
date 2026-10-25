<?php
declare(strict_types=1);

/**
 * HLS stream proxy.
 * Serves .m3u8 and .ts segments from protected storage (outside web root).
 * Membership enforcement for premium videos.
 */

require_once __DIR__ . '/../../config/app.php';
require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\App;
use Norkhiz\Config\Database;

$videoId = (int)($_GET['id'] ?? 0);
if (!$videoId) {
    http_response_code(400);
    exit('video id required');
}

$pdo = Database::connect();
$stmt = $pdo->prepare("SELECT v.is_premium, v.hls_manifest, u.membership, u.membership_expires_at
                       FROM videos v LEFT JOIN users u ON u.id = ? WHERE v.id = ? LIMIT 1");
$stmt->execute([$_SESSION['user_id'] ?? null, $videoId]);
$row = $stmt->fetch();

if (!$row) {
    http_response_code(404);
    exit('not found');
}

if ($row['is_premium'] && ($row['membership'] !== 'vip' || ($row['membership_expires_at'] && $row['membership_expires_at'] < date('Y-m-d H:i:s')))) {
    http_response_code(403);
    exit('vip required');
}

$storage = App::env('STORAGE_PATH', __DIR__ . '/../storage');
$manifestRel = $row['hls_manifest'];
$manifestPath = rtrim($storage, '/') . '/' . ltrim($manifestRel, '/');

// security: only allow .m3u8 / .ts / .mp4 under storage
$allowedExt = ['m3u8', 'ts', 'mp4'];
$ext = strtolower(pathinfo($manifestPath, PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true) || strpos(realpath($manifestPath) ?? '', realpath($storage)) !== 0) {
    http_response_code(403);
    exit('forbidden');
}

if (!is_file($manifestPath)) {
    http_response_code(404);
    exit('manifest not found');
}

$mimeMap = ['m3u8' => 'application/vnd.apple.mpegurl', 'ts' => 'video/mp2t', 'mp4' => 'video/mp4'];
header('Content-Type: ' . ($mimeMap[$ext] ?? 'application/octet-stream'));
header('Cache-Control: public, max-age=3600');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Expose-Headers: Content-Length, Content-Range');

// range support for .ts/.mp4
if (in_array($ext, ['ts', 'mp4'], true) && isset($_SERVER['HTTP_RANGE'])) {
    $size = filesize($manifestPath);
    $range = $_SERVER['HTTP_RANGE'];
    if (preg_match('/bytes=(\d+)-(\d*)/', $range, $m)) {
        $start = (int)$m[1];
        $end = $m[2] !== '' ? (int)$m[2] : $size - 1;
        $end = min($end, $size - 1);
        $length = $end - $start + 1;
        header('HTTP/1.1 206 Partial Content');
        header("Content-Range: bytes {$start}-{$end}/{$size}");
        header("Content-Length: {$length}");
        $fp = fopen($manifestPath, 'rb');
        fseek($fp, $start);
        echo fread($fp, $length);
        fclose($fp);
        exit;
    }
}

readfile($manifestPath);
exit;