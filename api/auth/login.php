<?php
/**
 * auth/login.php — admin login.
 *
 * POST /api/auth/login.php  body JSON { password }
 *   on match : starts session, $_SESSION['admin']=true, regenerates id,
 *              clears the IP's failure counter, returns 200 { ok:true }
 *   on miss  : records the failure and returns 401 { ok:false } after a
 *              PROGRESSIVE delay (longer the more recent failures from this IP).
 *
 * The single admin password is stored ONLY as a hash in meta_info under the
 * key 'admin_password_hash' (created via password_hash). We verify with
 * password_verify — the plaintext is never stored or logged.
 *
 * Brute-force throttle: failures are counted per IP in `login_attempts` within
 * a 15-minute window and the response is delayed ~0.4s × attempts (capped 5s).
 * It's a delay, never a hard lockout, so a shared/NAT IP can't be used to lock
 * out the real admin. Throttle bookkeeping is best-effort and never blocks login.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

const LOGIN_WINDOW_SECONDS = 900;   // failures older than this don't count
const LOGIN_DELAY_STEP_US  = 400000; // +0.4s per prior failure this window
const LOGIN_DELAY_CAP_US   = 5000000; // never sleep more than 5s

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

start_admin_session();

$body     = read_json_body();
$password = (string) ($body['password'] ?? '');
$ip       = substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);

// How many recent failures has this IP racked up (within the window)?
$priorAttempts = 0;
$pdo = null;
try {
    $pdo  = db();
    $stmt = $pdo->prepare(
        'SELECT attempts FROM login_attempts
          WHERE ip = ? AND last_at >= (NOW() - INTERVAL ' . LOGIN_WINDOW_SECONDS . ' SECOND)'
    );
    $stmt->execute([$ip]);
    $val = $stmt->fetchColumn();
    if ($val !== false) {
        $priorAttempts = (int) $val;
    }
} catch (Throwable $e) {
    // Throttle is best-effort; ignore and continue.
}

// Generic failure: record the attempt, apply progressive delay, return 401.
// Shape/wording is identical for every failure cause so nothing is revealed.
$fail = static function () use (&$pdo, $ip, $priorAttempts): void {
    try {
        if (!($pdo instanceof PDO)) {
            $pdo = db();
        }
        // Increment within the window, or reset to 1 if the window lapsed.
        $up = $pdo->prepare(
            'INSERT INTO login_attempts (ip, attempts) VALUES (:ip, 1)
             ON DUPLICATE KEY UPDATE
               attempts = IF(last_at < (NOW() - INTERVAL ' . LOGIN_WINDOW_SECONDS . ' SECOND), 1, attempts + 1),
               last_at  = NOW()'
        );
        $up->execute([':ip' => $ip]);
    } catch (Throwable $e) {
        // best-effort
    }
    // At least one step of delay, scaling with recent failures, capped.
    $delay = min(LOGIN_DELAY_CAP_US, ($priorAttempts + 1) * LOGIN_DELAY_STEP_US);
    usleep($delay);
    json_out(['ok' => false], 401);
};

if ($password === '') {
    $fail();
}

try {
    if (!($pdo instanceof PDO)) {
        $pdo = db();
    }
    $stmt = $pdo->prepare('SELECT `value` FROM `meta_info` WHERE `key` = ? LIMIT 1');
    $stmt->execute(['admin_password_hash']);
    $hash = $stmt->fetchColumn();
} catch (Throwable $e) {
    // Treat any DB error as an auth failure; never leak details.
    $fail();
    return; // unreachable (fail exits) — keeps static analysers happy.
}

if (!is_string($hash) || $hash === '' || !password_verify($password, $hash)) {
    $fail();
}

// Success: clear this IP's failure counter and prevent session fixation.
try {
    $pdo->prepare('DELETE FROM login_attempts WHERE ip = ?')->execute([$ip]);
} catch (Throwable $e) {
    // non-fatal
}

session_regenerate_id(true);
$_SESSION['admin']    = true;
$_SESSION['login_at'] = time();

json_out(['ok' => true], 200);
