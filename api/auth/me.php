<?php
/**
 * auth/me.php — session status probe.
 *
 * GET /api/auth/me.php -> { ok:true, authed:<bool> }
 *
 * Lets the admin UI decide whether to show the login screen or the dashboard
 * without exposing any other detail.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

json_out(['ok' => true, 'authed' => is_authed()], 200);
