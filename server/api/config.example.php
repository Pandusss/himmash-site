<?php
// Settings of send-form.php. Copy to config.php next to it on the hosting and fill in; config.php is not in git.
return [
    // Where requests go: a mailbox in Russia (Yandex, Mail.ru), not Gmail — personal data law (152-FZ).
    'to' => 'zayavki@example.ru',
    // Sender address on the hosting's own domain, so the mail passes SPF (add the hosting to the domain's SPF record).
    'from' => 'noreply@example.ru',
    // Pass the sender to the mail system as well (sendmail -f). Turn off if the hosting rejects it.
    'envelope_sender' => true,
    // Sites allowed to post the form (scheme and host, no trailing slash).
    'allowed_origins' => ['https://example.ru', 'https://example.com'],
    // Logs of requests and consents. Best outside the public folder, e.g. dirname(__DIR__, 2) . '/form-storage'.
    'storage_dir' => __DIR__ . '/storage',
    // 'mail' sends with PHP mail(); 'file' only saves the message to storage_dir/outbox (for checks).
    'transport' => 'mail',
    // At most this many requests from one IP address per window (seconds).
    'rate_limit' => ['max' => 5, 'window' => 600],
];
