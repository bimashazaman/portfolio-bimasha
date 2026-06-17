<?php
/* ============================================================
   install.php — one-time installer for the portfolio CMS.

   Run from the browser AFTER putting real DB credentials in
   api/config.php:

       https://yoursite.com/api/install.php

   On first run (no admin password set yet) it shows a small form
   to choose the admin password, then:
     1. Connects via the shared PDO in api/db.php.
     2. Creates the tables IF NOT EXISTS.
     3. Seeds the 18 content sections from api/content.seed.json,
        but ONLY rows that don't already exist (never clobbers live edits).
     4. Sets meta_info 'global_rev' to 1 if absent.
     5. Stores the admin password as a hash (password_hash).

   SECURITY:
     - The password is accepted via POST only (never the URL/query string,
       which would leak it into server logs and browser history).
     - The admin password can only be SET while none exists yet (the true
       one-time bootstrap). Once set, this installer will NOT change it —
       so a left-behind installer cannot be used to hijack the account.
       (Forgot it? Reset the `admin_password_hash` row in phpMyAdmin.)
     - Still: DELETE this file once setup succeeds. The CI deploy already
       excludes it from uploads.

   All SQL uses PDO prepared statements.
   ============================================================ */

// --- The 18 canonical section keys (must match the seed + the rest of the API). ---
const SECTION_KEYS = [
  'meta', 'nav', 'hero', 'ticker', 'stats', 'clients', 'about',
  'services', 'engagements', 'cases', 'workIndex', 'spotlight',
  'stack', 'journey', 'process', 'voices', 'faq', 'contact',
];

// db.php sits next to this file (both under api/); include it relative to here.
require_once __DIR__ . '/db.php';

/** Small helper: escape for safe output in the HTML status report. */
function h($s) {
  return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

$report  = [];     // collected status lines: [ok(bool), message]
$fatal   = null;   // fatal error message, if any
$done    = false;  // true once a successful setup POST completes
$isPost  = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';

try {
  // db.php is expected to expose either a $pdo handle or a db() factory.
  if (isset($pdo) && $pdo instanceof PDO) {
    $db = $pdo;
  } elseif (function_exists('db')) {
    $db = db();
  } else {
    throw new RuntimeException('api/db.php did not provide a PDO connection ($pdo or db()).');
  }
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

  // --- 1. Create tables (mirrors database/schema.sql). Safe to run anytime. ---
  // `key` and `value` are reserved words → always back-quoted.
  $ddl = [
    'sections' => "CREATE TABLE IF NOT EXISTS sections (
        `key`      VARCHAR(40) NOT NULL,
        `payload`  LONGTEXT    NOT NULL,
        `rev`      INT         NOT NULL DEFAULT 1,
        updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`key`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'section_versions' => "CREATE TABLE IF NOT EXISTS section_versions (
        id         INT          NOT NULL AUTO_INCREMENT,
        `key`      VARCHAR(40)  NOT NULL,
        `payload`  LONGTEXT     NOT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_section_versions_key (`key`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'messages' => "CREATE TABLE IF NOT EXISTS messages (
        id         INT          NOT NULL AUTO_INCREMENT,
        name       VARCHAR(160) DEFAULT NULL,
        email      VARCHAR(190) DEFAULT NULL,
        stage      VARCHAR(80)  DEFAULT NULL,
        message    TEXT         DEFAULT NULL,
        ip         VARCHAR(45)  DEFAULT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_messages_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'meta_info' => "CREATE TABLE IF NOT EXISTS meta_info (
        `key`   VARCHAR(60) NOT NULL,
        `value` TEXT        DEFAULT NULL,
        PRIMARY KEY (`key`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'login_attempts' => "CREATE TABLE IF NOT EXISTS login_attempts (
        ip        VARCHAR(45) NOT NULL,
        attempts  INT         NOT NULL DEFAULT 0,
        last_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (ip)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];
  foreach ($ddl as $name => $sql) {
    $db->exec($sql);
    $report[] = [true, "Table ensured: {$name}"];
  }

  // --- 2. Seed sections from content.seed.json (idempotent) ---------------
  $seedPath = __DIR__ . '/content.seed.json';
  if (!is_file($seedPath)) {
    $report[] = [false, "Seed file missing: api/content.seed.json (run scripts/export-content.mjs). Sections NOT seeded."];
  } else {
    $raw  = file_get_contents($seedPath);
    $seed = json_decode($raw, true);
    if (!is_array($seed)) {
      $report[] = [false, 'content.seed.json did not parse as a JSON object. Sections NOT seeded.'];
    } else {
      // Insert each known section only if it doesn't already exist.
      // ON DUPLICATE KEY UPDATE `key`=`key` is a no-op on conflict, so
      // existing (possibly edited) rows are never overwritten.
      $ins = $db->prepare(
        'INSERT INTO sections (`key`, `payload`, `rev`) VALUES (:key, :payload, 1)
         ON DUPLICATE KEY UPDATE `key` = `key`'
      );
      $seeded = 0; $skipped = 0; $missing = [];
      foreach (SECTION_KEYS as $key) {
        if (!array_key_exists($key, $seed)) {
          $missing[] = $key;
          continue;
        }
        $payload = json_encode($seed[$key], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $ins->execute([':key' => $key, ':payload' => $payload]);
        // rowCount() == 1 means a fresh insert; 0 means the row already existed.
        if ($ins->rowCount() === 1) { $seeded++; } else { $skipped++; }
      }
      $report[] = [true, "Sections seeded: {$seeded} new, {$skipped} already present (left untouched)."];
      if ($missing) {
        $report[] = [false, 'Seed file missing keys: ' . implode(', ', $missing)];
      }
    }
  }

  // --- 3. meta_info: global_rev (only if absent) --------------------------
  $insMeta = $db->prepare(
    'INSERT INTO meta_info (`key`, `value`) VALUES (:key, :value)
     ON DUPLICATE KEY UPDATE `key` = `key`'
  );
  $insMeta->execute([':key' => 'global_rev', ':value' => '1']);
  $report[] = [true, $insMeta->rowCount() === 1
    ? "meta_info 'global_rev' initialised to 1."
    : "meta_info 'global_rev' already set — left untouched."];

  // --- 4. Admin password ---------------------------------------------------
  // Read the current hash (if any). The password can ONLY be set when none
  // exists yet; this installer will never overwrite an existing password.
  $sel = $db->prepare('SELECT `value` FROM meta_info WHERE `key` = :key');
  $sel->execute([':key' => 'admin_password_hash']);
  $existing = $sel->fetchColumn();
  $hasPassword = ($existing !== false && $existing !== null && $existing !== '');

  if ($hasPassword) {
    $report[] = [true, "Admin password already set — left untouched. (Forgot it? Reset the admin_password_hash row in phpMyAdmin.)"];
  } elseif ($isPost) {
    // First-run bootstrap: accept the password from the POST body only.
    $pw      = (string) ($_POST['pw'] ?? '');
    $pwConf  = (string) ($_POST['pw_confirm'] ?? '');
    if (strlen($pw) < 8) {
      $report[] = [false, 'Password must be at least 8 characters. Nothing was set — try again.'];
    } elseif ($pw !== $pwConf) {
      $report[] = [false, 'The two passwords did not match. Nothing was set — try again.'];
    } else {
      $hash = password_hash($pw, PASSWORD_DEFAULT);
      $upd  = $db->prepare('INSERT INTO meta_info (`key`, `value`) VALUES (:key, :value)');
      $upd->execute([':key' => 'admin_password_hash', ':value' => $hash]);
      $report[] = [true, 'Admin password set. You can now log in at /admin.'];
      $done = true;
    }
  } else {
    // GET with no password yet → the form below will be shown.
    $report[] = [false, 'Admin password not set yet — choose one below to finish setup.'];
  }
} catch (Throwable $e) {
  // Never leak DB stack traces to the page; show a short message only.
  $fatal = $e->getMessage();
}

// Show the password form only when setup is safe to finish via POST:
// no fatal error, and no password exists yet, and we haven't just set one.
$showForm = ($fatal === null) && !$done && empty($hasPassword);

// --- Render the HTML status report -----------------------------------------
header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Portfolio CMS — Installer</title>
  <style>
    body { font: 15px/1.6 -apple-system, system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #666; margin-top: 0; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 12px; border-radius: 6px; margin: 6px 0; }
    li.ok { background: #eaf7ee; }
    li.bad { background: #fdecec; }
    li::before { font-weight: 700; margin-right: 8px; }
    li.ok::before { content: "OK"; color: #1a7f37; }
    li.bad::before { content: "!!"; color: #b42318; }
    .fatal { background: #fdecec; border: 1px solid #f3b1b1; padding: 14px; border-radius: 8px; color: #b42318; }
    .warn { margin-top: 28px; background: #fff6e5; border: 2px solid #f0b429; padding: 16px; border-radius: 8px; }
    .warn strong { color: #8a5300; }
    code { background: #f2f2f2; padding: 1px 5px; border-radius: 4px; }
    form.setup { margin: 22px 0; padding: 18px; border: 1px solid #ddd; border-radius: 10px; background: #fafafa; }
    form.setup label { display: block; font-weight: 600; margin: 10px 0 4px; }
    form.setup input { width: 100%; padding: 10px 12px; font-size: 15px; border: 1px solid #ccc; border-radius: 8px; }
    form.setup button { margin-top: 16px; padding: 11px 20px; font-size: 15px; font-weight: 600; color: #fff; background: #ff4d00; border: 0; border-radius: 8px; cursor: pointer; }
    form.setup .hint { color: #777; font-size: 13px; margin-top: 6px; }
  </style>
</head>
<body>
  <h1>Portfolio CMS — Installer</h1>
  <p class="sub">One-time setup. Re-running is safe and never overwrites your live edits or password.</p>

  <?php if ($fatal !== null): ?>
    <div class="fatal">
      <strong>Setup could not complete.</strong><br>
      <?= h($fatal) ?><br><br>
      Check that <code>api/config.php</code> has the correct DB credentials and that the database exists in hPanel.
    </div>
  <?php else: ?>
    <ul>
      <?php foreach ($report as [$ok, $msg]): ?>
        <li class="<?= $ok ? 'ok' : 'bad' ?>"><?= h($msg) ?></li>
      <?php endforeach; ?>
    </ul>

    <?php if ($showForm): ?>
      <form class="setup" method="post" action="">
        <label for="pw">Choose an admin password</label>
        <input id="pw" name="pw" type="password" autocomplete="new-password" minlength="8" required>
        <label for="pw_confirm">Confirm password</label>
        <input id="pw_confirm" name="pw_confirm" type="password" autocomplete="new-password" minlength="8" required>
        <div class="hint">At least 8 characters. Use a long, unique password — this protects /admin.</div>
        <button type="submit">Finish setup</button>
      </form>
    <?php endif; ?>
  <?php endif; ?>

  <?php if (!$showForm): ?>
  <div class="warn">
    <strong>Now DELETE this file.</strong><br>
    For security, remove <code>api/install.php</code> from the server now that setup is done.
    (The automated deploy already excludes it, so it won't come back.)
  </div>
  <?php endif; ?>
</body>
</html>
