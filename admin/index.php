<?php
/* ============================================================
   admin/index.php
   Purpose: Serves the admin single-page app shell for the
   portfolio CMS. No build step — plain PHP on shared hosting.

   Behaviour:
     - Starts a hardened PHP session (httponly, SameSite=Lax).
     - If the visitor is NOT authenticated, renders a clean
       login form that POSTs { password } to /api/auth/login.php
       via fetch (handled in app.js).
     - If authenticated, renders the editor shell; app.js takes
       over and talks to the admin API endpoints.

   Security notes:
     - Session config is set BEFORE session_start().
     - No secrets live here; auth state is the session flag
       $_SESSION['admin'] set by /api/auth/login.php.
     - Any dynamic value rendered into HTML is escaped with
       htmlspecialchars (none are user-controlled here, but the
       helper is used defensively).
   ============================================================ */

// --- Hardened session cookie params (must precede session_start) ---
$cookieParams = [
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
];
// Mark cookie secure when served over HTTPS (Hostinger serves HTTPS).
if (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
    (($_SERVER['SERVER_PORT'] ?? null) == 443) ||
    (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
) {
    $cookieParams['secure'] = true;
}
session_set_cookie_params($cookieParams);
session_name('pf_admin');
session_start();

$authed = !empty($_SESSION['admin']);

/** Small escape helper for any value rendered into HTML. */
function e(string $v): string
{
    return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
}

// Cache-busting token for static assets so edits show immediately.
$asset = function (string $path): string {
    $full = __DIR__ . '/' . $path;
    $v = is_file($full) ? (string) filemtime($full) : (string) time();
    return $path . '?v=' . $v;
};
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Content Studio · Admin</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="<?= e($asset('style.css')) ?>">
</head>
<body data-authed="<?= $authed ? '1' : '0' ?>">

<?php if (!$authed): ?>
    <!-- ============ LOGIN VIEW ============ -->
    <main class="login-wrap">
        <form id="login-form" class="login-card" autocomplete="off" novalidate>
            <div class="login-mark" aria-hidden="true">BZ</div>
            <h1 class="login-title">Content&nbsp;Studio</h1>
            <p class="login-sub">Sign in to edit the live portfolio content.</p>

            <label class="field">
                <span class="field-label">Admin password</span>
                <input
                    id="login-password"
                    type="password"
                    name="password"
                    autocomplete="current-password"
                    required
                    autofocus
                >
            </label>

            <button type="submit" class="btn btn-accent btn-block" id="login-submit">
                Sign in
            </button>

            <p class="login-error" id="login-error" role="alert" hidden></p>
        </form>
        <p class="login-foot">Portfolio CMS · protected area</p>
    </main>
<?php else: ?>
    <!-- ============ EDITOR SHELL ============ -->
    <div class="app" id="app">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-head">
                <div class="brand">
                    <span class="brand-mark">BZ</span>
                    <span class="brand-text">Content Studio</span>
                </div>
                <button class="icon-btn sidebar-close" id="sidebar-close" aria-label="Close menu">✕</button>
            </div>

            <nav class="nav-sections" id="nav-sections" aria-label="Content sections">
                <!-- section buttons injected by app.js -->
            </nav>

            <div class="nav-divider"></div>

            <nav class="nav-views" aria-label="Views">
                <button class="nav-item nav-view" data-view="messages" id="nav-messages">
                    <span class="nav-item-label">Messages</span>
                    <span class="nav-badge" id="messages-badge" hidden></span>
                </button>
            </nav>

            <div class="sidebar-foot">
                <span class="rev-pill" id="global-rev" title="Global content revision">rev —</span>
                <button class="btn btn-ghost" id="logout-btn">Log out</button>
            </div>
        </aside>

        <!-- Backdrop for mobile sidebar -->
        <div class="backdrop" id="backdrop" hidden></div>

        <!-- Main -->
        <div class="main">
            <header class="topbar">
                <button class="icon-btn menu-btn" id="menu-btn" aria-label="Open menu">☰</button>
                <div class="topbar-title">
                    <h1 id="pane-title">Content Studio</h1>
                    <span class="topbar-meta" id="pane-meta"></span>
                </div>
                <div class="topbar-actions" id="topbar-actions"><!-- contextual actions --></div>
            </header>

            <main class="pane" id="pane" tabindex="-1">
                <div class="loading" id="boot-loading">Loading content…</div>
            </main>
        </div>
    </div>

    <!-- Toast host -->
    <div class="toast-host" id="toast-host" aria-live="polite" aria-atomic="true"></div>

    <script src="<?= e($asset('app.js')) ?>" defer></script>
<?php endif; ?>

<?php if (!$authed): ?>
<script>
/* Inline login handler — kept tiny and self-contained so the
   login screen needs no extra asset. Posts to the auth endpoint
   and reloads into the editor on success. */
(function () {
    var form = document.getElementById('login-form');
    var err  = document.getElementById('login-error');
    var btn  = document.getElementById('login-submit');
    var pwd  = document.getElementById('login-password');

    function showError(msg) {
        err.textContent = msg;
        err.hidden = false;
    }

    form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        err.hidden = true;
        btn.disabled = true;
        btn.textContent = 'Signing in…';

        fetch('/api/auth/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ password: pwd.value })
        })
        .then(function (res) {
            return res.json().catch(function () { return { ok: false }; })
                .then(function (data) { return { status: res.status, data: data }; });
        })
        .then(function (r) {
            if (r.status === 200 && r.data && r.data.ok) {
                window.location.reload();
                return;
            }
            showError('Incorrect password. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Sign in';
            pwd.value = '';
            pwd.focus();
        })
        .catch(function () {
            showError('Network error. Check your connection and try again.');
            btn.disabled = false;
            btn.textContent = 'Sign in';
        });
    });
})();
</script>
<?php endif; ?>

</body>
</html>
