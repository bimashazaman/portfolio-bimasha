<?php
/**
 * admin/sections.php — read all sections (admin).
 *
 * GET /api/admin/sections.php (auth required)
 *   -> { ok:true, data:{ <key>:<payload> }, revs:{ <key>:<rev> } }
 *
 * Returns every section's decoded payload plus its per-section rev so the
 * admin editor can show what's live and detect stale edits.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

require_auth();

try {
    $pdo  = db();
    $rows = $pdo->query('SELECT `key`, `payload`, `rev` FROM `sections`')->fetchAll();

    $data = [];
    $revs = [];
    foreach ($rows as $row) {
        $key = (string) ($row['key'] ?? '');
        if (!is_valid_section_key($key)) {
            continue;
        }
        $data[$key] = json_decode((string) $row['payload'], true);
        $revs[$key] = (int) ($row['rev'] ?? 0);
    }

    json_out([
        'ok'   => true,
        'data' => $data ?: (object) [],
        'revs' => $revs ?: (object) [],
    ], 200);
} catch (Throwable $e) {
    json_out(['ok' => false, 'error' => 'server_error'], 500);
}
