<?php
declare(strict_types=1);

namespace Norkhiz\Config;

use PDO;

final class Database
{
    private static ?PDO $pdo = null;

    public static function connect(): PDO
    {
        if (self::$pdo === null) {
            $dsn = 'mysql:host=' . ($_ENV['DB_HOST'] ?? '127.0.0.1')
                . ';port=' . ($_ENV['DB_PORT'] ?? 3306)
                . ';dbname=' . ($_ENV['DB_DATABASE'] ?? 'norkhiz')
                . ';charset=utf8mb4';
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            self::$pdo = new PDO($dsn, $_ENV['DB_USERNAME'] ?? '', $_ENV['DB_PASSWORD'] ?? '', $options);
        }
        return self::$pdo;
    }
}