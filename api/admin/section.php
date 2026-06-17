<?php
/**
 * admin/section.php — update one section's payload (admin).
 *
 * POST /api/admin/section.php  body { key, payload } (auth required)
 *
 * Flow:
 *   1. key MUST be one of the 18 SECTION_KEYS (else 422).
 *   2. payload MUST be JSON-serialisable; the server re-encodes it canonically.
 *   3. Snapshot the CURRENT live row into section_versions (history) first.
 *   4. UPDATE sections set payload=?, rev=rev+1, updated_at=NOW().
 *   5. Bump the global rev counter in meta_info ('global_rev').
 *   6. Return { ok:true, rev:<newRev> } (the section's new per-section rev).
 *
 * All steps run inside a transaction so history + live + global rev stay
 * consistent. All SQL is parameterised.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

require_auth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$body = read_json_body();
$key  = (string) ($body['key'] ?? '');

// 1. Whitelist the key.
if (!is_valid_section_key($key)) {
    json_out(['ok' => false, 'errors' => ['key' => 'Unknown section key.']], 422);
}

// 2. The payload must be present (null is not a valid section value) and
//    must be JSON-serialisable. Re-encode it canonically so we control storage.
if (!array_key_exists('payload', $body)) {
    json_out(['ok' => false, 'errors' => ['payload' => 'Missing payload.']], 422);
}

$encoded = json_encode($body['payload'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($encoded === false) {
    json_out(['ok' => false, 'errors' => ['payload' => 'Payload is not valid JSON.']], 422);
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    // Load the current live row (locked for the duration of the transaction).
    $sel = $pdo->prepare('SELECT `payload`, `rev` FROM `sections` WHERE `key` = ? LIMIT 1 FOR UPDATE');
    $sel->execute([$key]);
    $current = $sel->fetch();

    if ($current === false) {
        // No row yet — insert a fresh one at rev 1, no history to snapshot.
        $ins = $pdo->prepare(
            'INSERT INTO `sections` (`key`, `payload`, `rev`, `updated_at`)
             VALUES (:key, :payload, 1, NOW())'
        );
        $ins->execute([':key' => $key, ':payload' => $encoded]);
        $newRev = 1;
    } else {
        // 3. Snapshot the existing payload into history before overwriting.
        $snap = $pdo->prepare(
            'INSERT INTO `section_versions` (`key`, `payload`, `created_at`)
             VALUES (:key, :payload, NOW())'
        );
        $snap->execute([':key' => $key, ':payload' => (string) $current['payload']]);

        // 4. Update the live row.
        $upd = $pdo->prepare(
            'UPDATE `sections`
                SET `payload` = :payload, `rev` = `rev` + 1, `updated_at` = NOW()
              WHERE `key` = :key'
        );
        $upd->execute([':payload' => $encoded, ':key' => $key]);
        $newRev = ((int) $current['rev']) + 1;
    }

    // 5. Bump the global rev counter (upsert so it works even if missing).
    $g = $pdo->prepare(
        'INSERT INTO `meta_info` (`key`, `value`) VALUES (\'global_rev\', \'1\')
         ON DUPLICATE KEY UPDATE `value` = `value` + 1'
    );
    $g->execute();

    $pdo->commit();

    json_out(['ok' => true, 'rev' => $newRev], 200);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_out(['ok' => false, 'error' => 'server_error'], 500);
}
