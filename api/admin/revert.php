<?php
/**
 * admin/revert.php — restore a section to a previous saved version (admin).
 *
 * POST /api/admin/revert.php  body { key, version_id } (auth required)
 *
 * Flow:
 *   1. Validate key (whitelist) and version_id (positive int).
 *   2. Load the chosen version's payload from section_versions, scoped to key.
 *   3. Snapshot the CURRENT live payload into section_versions first (so the
 *      revert itself is undoable).
 *   4. Write the chosen payload as the new live value (rev+1, updated_at=NOW()).
 *   5. Bump global_rev.
 *   6. Return { ok:true, rev:<newRev> }.
 *
 * Runs in a transaction; all SQL parameterised.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

require_auth();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$body      = read_json_body();
$key       = (string) ($body['key'] ?? '');
$versionId = (int) ($body['version_id'] ?? 0);

if (!is_valid_section_key($key)) {
    json_out(['ok' => false, 'errors' => ['key' => 'Unknown section key.']], 422);
}
if ($versionId <= 0) {
    json_out(['ok' => false, 'errors' => ['version_id' => 'Invalid version id.']], 422);
}

try {
    $pdo = db();
    $pdo->beginTransaction();

    // 2. Load the requested version, scoped to the key so you can't revert one
    //    section to another section's history.
    $vsel = $pdo->prepare(
        'SELECT `payload` FROM `section_versions` WHERE `id` = :id AND `key` = :key LIMIT 1'
    );
    $vsel->execute([':id' => $versionId, ':key' => $key]);
    $versionPayload = $vsel->fetchColumn();

    if ($versionPayload === false) {
        $pdo->rollBack();
        json_out(['ok' => false, 'errors' => ['version_id' => 'Version not found for this section.']], 404);
    }

    // Load + lock the current live row.
    $sel = $pdo->prepare('SELECT `payload`, `rev` FROM `sections` WHERE `key` = ? LIMIT 1 FOR UPDATE');
    $sel->execute([$key]);
    $current = $sel->fetch();

    if ($current === false) {
        // No live row yet — create it directly from the version, rev 1.
        $ins = $pdo->prepare(
            'INSERT INTO `sections` (`key`, `payload`, `rev`, `updated_at`)
             VALUES (:key, :payload, 1, NOW())'
        );
        $ins->execute([':key' => $key, ':payload' => (string) $versionPayload]);
        $newRev = 1;
    } else {
        // 3. Snapshot current live payload so the revert can itself be undone.
        $snap = $pdo->prepare(
            'INSERT INTO `section_versions` (`key`, `payload`, `created_at`)
             VALUES (:key, :payload, NOW())'
        );
        $snap->execute([':key' => $key, ':payload' => (string) $current['payload']]);

        // 4. Write the chosen version as the new live value.
        $upd = $pdo->prepare(
            'UPDATE `sections`
                SET `payload` = :payload, `rev` = `rev` + 1, `updated_at` = NOW()
              WHERE `key` = :key'
        );
        $upd->execute([':payload' => (string) $versionPayload, ':key' => $key]);
        $newRev = ((int) $current['rev']) + 1;
    }

    // 5. Bump global rev.
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
