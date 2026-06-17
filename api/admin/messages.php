<?php
/**
 * admin/messages.php — read recent contact-form submissions (admin).
 *
 * GET /api/admin/messages.php (auth required)
 *   -> { ok:true, messages:[ { id, name, email, stage, message, created_at, ip }, ... ] }
 *
 * Returns the latest 100 messages, newest first. Values are raw; the admin UI
 * MUST htmlspecialchars() any field before rendering it into HTML.
 */

declare(strict_types=1);

require __DIR__ . '/../db.php';
require __DIR__ . '/../helpers.php';

require_auth();

try {
    $pdo  = db();
    $rows = $pdo->query(
        'SELECT `id`, `name`, `email`, `stage`, `message`, `created_at`, `ip`
           FROM `messages`
          ORDER BY `id` DESC
          LIMIT 100'
    )->fetchAll();

    $messages = [];
    foreach ($rows as $row) {
        $messages[] = [
            'id'         => (int) $row['id'],
            'name'       => (string) $row['name'],
            'email'      => (string) $row['email'],
            'stage'      => (string) ($row['stage'] ?? ''),
            'message'    => (string) $row['message'],
            'created_at' => (string) $row['created_at'],
            'ip'         => (string) ($row['ip'] ?? ''),
        ];
    }

    json_out(['ok' => true, 'messages' => $messages], 200);
} catch (Throwable $e) {
    json_out(['ok' => false, 'error' => 'server_error'], 500);
}
