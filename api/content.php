<?php
/**
 * content.php — PUBLIC read endpoint for the whole site.
 *
 * GET /api/content.php
 *   200 { ok:true, rev:<int>, data:{ <sectionKey>:<payload>, ... } }
 *
 * Reads every row from the `sections` table and JSON-decodes each payload into
 * data[key]. `rev` is the global revision counter from meta_info.
 *
 * Resilience: this powers the live site, so it must NEVER return a 5xx. On any
 * database problem it returns 200 with { ok:false, rev:0, data:{} } and the
 * React app falls back to its bundled copy of content.js.
 */

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

// Short public cache so edits show up quickly but repeat hits are cheap.
header('Cache-Control: public, max-age=30');

try {
    $pdo = db();

    // Pull all section payloads.
    $rows = $pdo->query('SELECT `key`, `payload` FROM `sections`')->fetchAll();

    $data = [];
    foreach ($rows as $row) {
        $key = $row['key'] ?? '';
        // Only surface known section keys; ignore anything unexpected in the table.
        if (!is_valid_section_key((string) $key)) {
            continue;
        }
        $decoded = json_decode((string) $row['payload'], true);
        // If a payload somehow isn't valid JSON, expose null rather than failing.
        $data[$key] = $decoded;
    }

    // Global revision counter (used by the client to detect content changes).
    $rev = 0;
    $stmt = $pdo->prepare('SELECT `value` FROM `meta_info` WHERE `key` = ? LIMIT 1');
    $stmt->execute(['global_rev']);
    $val = $stmt->fetchColumn();
    if ($val !== false) {
        $rev = (int) $val;
    }

    // Coerce empty to {} (not []) so the JSON shape is always an object.
    json_out(['ok' => true, 'rev' => $rev, 'data' => $data ?: (object) []], 200);
} catch (Throwable $e) {
    // Never leak details to the public; never 500 the live site.
    json_out(['ok' => false, 'rev' => 0, 'data' => (object) []], 200);
}
