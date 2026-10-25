<?php
declare(strict_types=1);

/**
 * NORKHIZ STUDIO — API front controller (modern PHP)
 * Routes /api/* requests to endpoint handlers.
 */

require __DIR__ . '/vendor/autoload.php'; // if composer installed; otherwise removed in minimal deploy

use Norkhiz\Config\App;
use Norkhiz\Config\Database;

App::boot();

// ---- minimal autoloader (fallback when no composer) ----
spl_autoload_register(function (string $class) {
    $prefix = 'Norkhiz\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $rel = str_replace($prefix, '', $class);
    $file = __DIR__ . '/' . str_replace('\\', '/', $rel) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$root = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/api'), '/');

// allow preflight
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    exit;
}

// CORS (tighten in production)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

$path = $uri === $root ? '/' : substr($uri, strlen($root));
if (str_starts_with($path, '/')) {
    $path = substr($path, 1);
}
$path = trim($path, '/');

// ---- route table ----
$routes = [
    'GET'    => [
        ''            => 'api/status.php',
        'categories'  => 'api/categories.php',
        'videos'      => 'api/videos/list.php',
        'video'       => 'api/videos/detail.php',
        'related'     => 'api/videos/related.php',
        'search'      => 'api/search.php',
        'me'          => 'api/auth/me.php',
        'membership'  => 'api/memberships.php',
        'favorites'   => 'api/user/favorites.php',
        'history'     => 'api/user/history.php',
        'downloads'   => 'api/user/downloads.php',
        'comments'    => 'api/comments.php',
        'stream'      => 'api/videos/stream.php',
    ],
    'POST'   => [
        'auth/login'   => 'api/auth/login.php',
        'auth/register'=> 'api/auth/register.php',
        'auth/logout'  => 'api/auth/logout.php',
        'videos/upload'=> 'api/videos/upload.php',
        'comments'     => 'api/comments.php',
        'favorites'    => 'api/user/favorites.php',
        'history'      => 'api/user/history.php',
    ],
    'DELETE' => [
        'favorites'    => 'api/user/favorites.php',
        'history'      => 'api/user/history.php',
    ],
];

$handler = $routes[$method][$path] ?? null;

if (!$handler) {
    // try /videos/{id}
    if ($method === 'GET' && preg_match('#^videos/(\d+)$#', $path, $m)) {
        $_GET['id'] = $m[1];
        $handler = 'api/videos/detail.php';
    } elseif ($method === 'GET' && preg_match('#^stream/(\d+)$#', $path, $m)) {
        $_GET['id'] = $m[1];
        $handler = 'api/videos/stream.php';
    } elseif ($method === 'GET' && preg_match('#^comments#', $path)) {
        $handler = 'api/comments.php';
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'not_found'], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

require __DIR__ . '/' . $handler;