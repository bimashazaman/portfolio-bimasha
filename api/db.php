<?php
/**
 * db.php — shared PDO bootstrap.
 *
 * Loads credentials from config.php (gitignored) and returns a single PDO
 * instance configured for utf8mb4 and exception-based error reporting.
 * Every endpoint includes this via db() so connection logic lives in one place.
 *
 * Throws PDOException on failure — callers MUST catch this (public endpoints
 * degrade gracefully to ok:false; they never leak the message to the client).
 */

declare(strict_types=1);

/**
 * Build (once) and return the shared PDO connection.
 *
 * @return PDO
 * @throws RuntimeException if config is missing
 * @throws PDOException     if the connection fails
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $configPath = __DIR__ . '/config.php';
    if (!is_file($configPath)) {
        // Surfaced to the caller, which decides how to respond. Never echoed raw.
        throw new RuntimeException('Missing api/config.php — copy config.example.php and fill it in.');
    }

    /** @var array<string,string> $cfg */
    $cfg = require $configPath;

    $host    = $cfg['DB_HOST']    ?? 'localhost';
    $name    = $cfg['DB_NAME']    ?? '';
    $user    = $cfg['DB_USER']    ?? '';
    $pass    = $cfg['DB_PASS']    ?? '';
    $charset = $cfg['DB_CHARSET'] ?? 'utf8mb4';

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $host, $name, $charset);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Use real prepared statements (no client-side emulation) so bound
        // params are never interpolated into the SQL string.
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    return $pdo;
}
