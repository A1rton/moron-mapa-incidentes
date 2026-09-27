<?php

declare(strict_types=1);

/**
 * Conexión central a MySQL mediante PDO.
 *
 * Valores predeterminados para XAMPP local:
 * - host: 127.0.0.1
 * - puerto: 3306
 * - base: moron_incidentes
 * - usuario: root
 * - contraseña: vacía
 *
 * En otro entorno podés definir DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $database = getenv('DB_NAME') ?: 'moron_incidentes';
    $user = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASSWORD');
    $password = $password === false ? '' : $password;
    $charset = 'utf8mb4';

    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
