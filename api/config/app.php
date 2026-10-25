<?php
declare(strict_types=1);

namespace Norkhiz\Config;

use Dotenv\Dotenv;

final class App
{
    public static function boot(): void
    {
        $root = dirname(__DIR__, 2); // api/.. = project root
        $envFile = $root . '/api/.env';
        if (file_exists($envFile)) {
            Dotenv::createImmutable($root . '/api')->safeLoad();
        }

        date_default_timezone_get() === false && date_default_timezone_set($_ENV['TIMEZONE'] ?? 'Asia/Tehran');
        date_default_timezone_set($_ENV['TIMEZONE'] ?? 'Asia/Tehran');
        mb_internal_encoding('UTF-8');
        mb_http_output('UTF-8');
        header('Content-Type: application/json; charset=utf-8');
    }

    public static function env(string $key, mixed $default = null): mixed
    {
        return $_ENV[$key] ?? $default;
    }

    public static function baseUrl(): string
    {
        return rtrim($_ENV['APP_URL'] ?? 'http://localhost', '/');
    }
}