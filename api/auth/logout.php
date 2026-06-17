<?php
/**
 * auth/logout.php — destroy the admin session.
 *
 * POST /api/auth/logout.php -> { ok:true }
 *
 * Clears session data, expires the session cookie, and destroys the session.
 * Always returns ok:true (logging out is idempotent).
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

start_admin_session();

// Clear all session variables.
$_SESSION = [];

// Expire the session cookie in the browser, matching the params we set on start.
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        [
            'expires'  => time() - 42000,
            'path'     => $params['path'],
            'domain'   => $params['domain'],
            'secure'   => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]
    );
}

session_destroy();

json_out(['ok' => true], 200);
