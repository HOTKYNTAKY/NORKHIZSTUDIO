<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'app' => 'NORKHIZ STUDIO API',
    'version' => '1.0.0',
    'status' => 'ok',
    'timezone' => date_default_timezone_get(),
    'time' => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);