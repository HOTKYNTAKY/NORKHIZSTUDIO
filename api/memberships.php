<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/database.php';

use Norkhiz\Config\Database;

header('Content-Type: application/json; charset=utf-8');

$plans = [
    [
        'id' => 'free',
        'name' => 'رایگان',
        'price' => 0,
        'currency' => 'IRR',
        'quality' => '720p',
        'features' => ['تبلیغات محدود', 'دسترسی به محتوای رایگان'],
        'premium' => false,
    ],
    [
        'id' => 'vip_monthly',
        'name' => 'VIP ماهانه',
        'price' => 49000,
        'currency' => 'IRR',
        'quality' => '4K UHD',
        'features' => ['بدون تبلیغ', 'دسترسی نامحدود ۴K', 'دانلود ویدیو', 'پشتیبانی 우선'],
        'premium' => true,
    ],
];

echo json_encode(['ok' => true, 'plans' => $plans], JSON_UNESCAPED_UNICODE);