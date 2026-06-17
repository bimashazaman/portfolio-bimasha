<?php
/**
 * contact.php — PUBLIC contact-form submission endpoint.
 *
 * POST /api/contact.php
 *   body JSON: { name, email, stage, message }
 *
 * Validation:
 *   - name    : non-empty (after trim)
 *   - email   : matches a basic email regex
 *   - message : length >= 10
 * Anti-abuse:
 *   - reject if the message contains more than 8 URLs
 *
 * Responses:
 *   200 { ok:true }                            on success
 *   422 { ok:false, errors:{ field:msg, ... } } on validation failure
 *   405 { ok:false, error:"method_not_allowed" } for non-POST
 *
 * Stores into `messages` (name, email, stage, message, created_at, ip).
 */

declare(strict_types=1);

require __DIR__ . '/db.php';
require __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$body = read_json_body();

$name    = trim((string) ($body['name'] ?? ''));
$email   = trim((string) ($body['email'] ?? ''));
$stage   = trim((string) ($body['stage'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

$errors = [];

if ($name === '') {
    $errors['name'] = 'Please tell me your name.';
}

// Basic email shape check — deliberately permissive, just rejects obvious junk.
if ($email === '' || !preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email)) {
    $errors['email'] = 'Please enter a valid email address.';
}

if (mb_strlen($message) < 10) {
    $errors['message'] = 'A little more detail, please (at least 10 characters).';
}

// Anti-abuse: reject messages stuffed with links.
if (preg_match_all('#https?://#i', $message) > 8) {
    $errors['message'] = 'Too many links — please send a real message.';
}

if (!empty($errors)) {
    json_out(['ok' => false, 'errors' => $errors], 422);
}

try {
    $pdo = db();
    $stmt = $pdo->prepare(
        'INSERT INTO `messages` (`name`, `email`, `stage`, `message`, `created_at`, `ip`)
         VALUES (:name, :email, :stage, :message, NOW(), :ip)'
    );
    $stmt->execute([
        ':name'    => $name,
        ':email'   => $email,
        ':stage'   => $stage,
        ':message' => $message,
        ':ip'      => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
    ]);

    json_out(['ok' => true], 200);
} catch (Throwable $e) {
    // Don't leak internals; report a generic failure the form can show.
    json_out(['ok' => false, 'errors' => ['message' => 'Something went wrong sending your message. Please try again.']], 500);
}
