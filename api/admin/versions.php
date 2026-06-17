<?php
/**
 * admin/versions.php — list recent saved versions for one section (admin).
 *
 * GET /api/admin/versions.php?key=<sectionKey> (auth required)
 *   -> { ok:true, versions:[ { id, created_at, preview }, ... ] }  (latest 20)
 *
 * `preview` is a short, plain-text snippet of the stored payload so the editor
 * can show a human-readable hint of each historical version. It is truncated
 * server-side; the admin UI must still htmlspecialchars() it before rendering.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

require_auth();

$key = (string) ($_GET['key'] ?? '');

if (!is_valid_section_key($key)) {
    json_out(['ok' => false, 'errors' => ['key' => 'Unknown section key.']], 422);
}

try {
    $pdo  = db();
    $stmt = $pdo->prepare(
        'SELECT `id`, `payload`, `created_at`
           FROM `section_versions`
          WHERE `key` = :key
          ORDER BY `id` DESC
          LIMIT 20'
    );
    $stmt->execute([':key' => $key]);
    $rows = $stmt->fetchAll();

    $versions = [];
    foreach ($rows as $row) {
        $payload = (string) ($row['payload'] ?? '');
        // Build a compact one-line preview (no newlines, capped length).
        $preview = trim(preg_replace('/\s+/', ' ', $payload) ?? '');
        if (mb_strlen($preview) > 120) {
            $preview = mb_substr($preview, 0, 117) . '…';
        }
        $versions[] = [
            'id'         => (int) $row['id'],
            'created_at' => (string) $row['created_at'],
            'preview'    => $preview,
        ];
    }

    json_out(['ok' => true, 'versions' => $versions], 200);
} catch (Throwable $e) {
    json_out(['ok' => false, 'error' => 'server_error'], 500);
}
