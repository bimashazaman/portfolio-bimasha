<?php
/**
 * helpers.php — shared utilities for all endpoints.
 *
 * Provides:
 *   - SECTION_KEYS          the 18 allowed content section keys (whitelist)
 *   - json_out()            emit a JSON response with the right headers + status
 *   - read_json_body()      decode the request body as a JSON object
 *   - start_admin_session() start the hardened session (httponly, SameSite=Lax)
 *   - is_authed()           whether the current session is an authenticated admin
 *   - require_auth()        401 JSON + exit when not authed (used by admin/*)
 *
 * Pure standard library — no external packages.
 */

declare(strict_types=1);

/**
 * The exact 18 top-level content sections the CMS stores. These mirror the
 * named exports in src/data/content.js. Any section key coming from a client
 * MUST be validated against this list before it touches the database.
 */
const SECTION_KEYS = [
    'meta',
    'nav',
    'hero',
    'ticker',
    'stats',
    'clients',
    'about',
    'services',
    'engagements',
    'cases',
    'workIndex',
    'spotlight',
    'stack',
    'journey',
    'process',
    'voices',
    'faq',
    'contact',
];

/**
 * True if $key is one of the allowed section keys.
 */
function is_valid_section_key(string $key): bool
{
    return in_array($key, SECTION_KEYS, true);
}

/**
 * Emit a JSON response and stop. Sets the JSON content type and HTTP status.
 *
 * @param mixed $data   Anything json_encode can serialise.
 * @param int   $status HTTP status code (default 200).
 */
function json_out($data, int $status = 200): void
{
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Read and decode the request body as a JSON object (associative array).
 * Returns an empty array if the body is empty or not valid JSON, so callers
 * can validate individual fields without worrying about fatal decode errors.
 *
 * @return array<string,mixed>
 */
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Start the admin session with hardened cookie params. Idempotent — safe to
 * call on every admin/auth request. Cookie is httponly + SameSite=Lax, and
 * marked Secure when the request arrived over HTTPS.
 */
function start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,          // session cookie (cleared when browser closes)
        'path'     => '/',
        'httponly' => true,       // not readable from JS
        'secure'   => $secure,    // only over HTTPS when available
        'samesite' => 'Lax',      // mitigates CSRF on cross-site navigations
    ]);

    session_name('pf_admin');
    session_start();
}

/**
 * Whether the current request belongs to an authenticated admin.
 */
function is_authed(): bool
{
    start_admin_session();
    return !empty($_SESSION['admin']);
}

/**
 * Guard for admin endpoints. If the caller is not an authenticated admin,
 * respond 401 JSON and stop. Otherwise returns normally.
 */
function require_auth(): void
{
    if (!is_authed()) {
        json_out(['ok' => false, 'error' => 'unauthorized'], 401);
    }
}
