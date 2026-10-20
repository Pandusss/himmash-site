<?php
// Inquiry form handler of the Russian and English sites. Takes the FormData that src/scripts/site.ts posts,
// sends it by email with the attached files and keeps logs of requests and consents.
// It runs on hosting in Russia: personal data of Russian citizens are first recorded in Russia (152-FZ, art. 18 p. 5).
// Settings: config.php next to this file (see config.example.php). Answers JSON: {"ok":true} or {"ok":false,"error":"…"}.
// Checked by server/test.sh.
declare(strict_types=1);

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
const EOL = "\r\n";

date_default_timezone_set('Europe/Moscow');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, array $body = []): void
{
    http_response_code($status);
    if ($status !== 204) {
        echo json_encode(['ok' => $status < 300] + $body, JSON_UNESCAPED_UNICODE);
    }
    exit;
}

function cut(string $text, int $length): string
{
    return function_exists('mb_substr') ? mb_substr($text, 0, $length) : substr($text, 0, $length);
}

/** A text field without control characters (line breaks are kept), trimmed to a sane length. */
function field(string $name, int $length): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return cut(trim($value), $length);
}

function encodeHeader(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

function appendLog(string $file, array $entry): void
{
    file_put_contents($file, json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    respond(500, ['error' => 'not_configured']);
}
$config = require $configFile;

// Only the sites themselves may post: browsers send Origin with every POST.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === '' || !in_array($origin, (array) $config['allowed_origins'], true)) {
    respond(403, ['error' => 'origin']);
}
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Accept');
    respond(204);
}
if ($method !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'method']);
}
// Over post_max_size PHP drops the whole body.
if (empty($_POST) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    respond(413, ['error' => 'too_large']);
}

$storage = rtrim((string) $config['storage_dir'], '/');
if (!is_dir("$storage/rate") && !@mkdir("$storage/rate", 0700, true)) {
    // The configured folder is out of reach: keep the logs next to this file, closed to the web below.
    $storage = __DIR__ . '/storage';
    if (!is_dir("$storage/rate") && !mkdir("$storage/rate", 0700, true)) {
        respond(500, ['error' => 'storage']);
    }
}
if (!is_file("$storage/.htaccess")) {
    // Apache: the logs stay closed to the web if the folder is inside the public one.
    file_put_contents("$storage/.htaccess", "Require all denied\n");
}

// A bot filled the hidden field: pretend all went well.
if (field('website', 200) !== '') {
    respond(200);
}

// At most rate_limit.max requests from one address per window.
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$limit = $config['rate_limit'] ?? ['max' => 5, 'window' => 600];
$rateFile = "$storage/rate/" . hash('sha256', $ip) . '.json';
$now = time();
$hits = is_file($rateFile) ? json_decode((string) file_get_contents($rateFile), true) : [];
$hits = array_values(array_filter(is_array($hits) ? $hits : [], fn ($t) => is_int($t) && $t > $now - (int) $limit['window']));
if (count($hits) >= (int) $limit['max']) {
    respond(429, ['error' => 'rate_limit']);
}
$hits[] = $now;
file_put_contents($rateFile, json_encode($hits), LOCK_EX);

$data = [
    'subject' => field('subject', 200),
    'name' => field('name', 100),
    'company' => field('company', 200),
    'phone' => field('phone', 40),
    'email' => field('email', 200),
    'need' => field('need', 100),
    'feedstock' => field('feedstock', 100),
    'volume' => field('volume', 100),
    'message' => field('message', 5000),
    'page' => field('page', 500),
    'lang' => field('lang', 5),
];
$consent = [
    'consent' => field('consent', 10),
    'consent_version' => field('consent_version', 40),
    'consent_at' => field('consent_at', 40),
];

// The same rules as in the browser (src/scripts/site.ts).
$errors = [];
if ($data['name'] === '') {
    $errors[] = 'name';
}
$digits = strlen(preg_replace('/\D/', '', $data['phone']) ?? '');
if (!preg_match('/^[+\d\s().\-]+$/', $data['phone']) || $digits < 10 || $digits > 15) {
    $errors[] = 'phone';
}
if ($data['email'] !== '' && filter_var($data['email'], FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = 'email';
}
if ($data['need'] === '') {
    $errors[] = 'need';
}
if ($consent['consent'] !== 'yes' || $consent['consent_version'] === '') {
    $errors[] = 'consent';
}

$files = [];
$upload = $_FILES['files'] ?? null;
if (is_array($upload) && is_array($upload['name'] ?? null)) {
    foreach ($upload['name'] as $i => $name) {
        $error = (int) $upload['error'][$i];
        if ($error === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $name = (string) $name;
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $path = (string) $upload['tmp_name'][$i];
        if ($error !== UPLOAD_ERR_OK || (int) $upload['size'][$i] > MAX_FILE_BYTES || !in_array($ext, FILE_TYPES, true) || !is_uploaded_file($path)) {
            $errors[] = 'files';
            break;
        }
        $clean = cut(preg_replace('/[^\p{L}\p{N} ._()\-]+/u', '_', basename($name)) ?? '', 120);
        $type = class_exists('finfo') ? (new finfo(FILEINFO_MIME_TYPE))->file($path) : false;
        $files[] = ['name' => $clean !== '' ? $clean : "file.$ext", 'path' => $path, 'type' => $type ?: 'application/octet-stream'];
    }
    if (count($files) > MAX_FILES) {
        $errors[] = 'files';
    }
}
if ($errors) {
    respond(422, ['error' => 'invalid', 'fields' => array_values(array_unique($errors))]);
}

// The record of consent comes first: it was given whether or not the mail goes out.
$receivedAt = date('c');
$userAgent = cut((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 300);
appendLog("$storage/consents.jsonl", [
    'received_at' => $receivedAt,
    'consent_at' => $consent['consent_at'],
    'consent_version' => $consent['consent_version'],
    'name' => $data['name'],
    'phone' => $data['phone'],
    'email' => $data['email'],
    'page' => $data['page'],
    'lang' => $data['lang'],
    'ip' => $ip,
    'user_agent' => $userAgent,
]);

// The message is in Russian whatever the site: it is read by the company's engineers.
$site = (string) parse_url($origin, PHP_URL_HOST);
if (function_exists('idn_to_utf8')) {
    $site = idn_to_utf8($site, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) ?: $site;
}
$value = fn (string $key) => $data[$key] !== '' ? $data[$key] : '—';
$fileNames = implode(', ', array_column($files, 'name'));
$lines = [
    "Заявка с сайта $site" . ($data['lang'] === 'en' ? ' (английская версия)' : ''),
    'Тема: ' . $value('subject'),
    '',
    '— Контакты —',
    'Имя: ' . $value('name'),
    'Компания: ' . $value('company'),
    'Телефон: ' . $value('phone'),
    'Email: ' . $value('email'),
    '',
    '— О задаче —',
    'Что нужно: ' . $value('need'),
    'Сырьё: ' . $value('feedstock'),
    'Объём переработки: ' . $value('volume'),
    'Комментарий: ' . $value('message'),
];
if ($files) {
    $lines[] = "Файлы во вложении: $fileNames";
}
array_push(
    $lines,
    '',
    "Согласие на обработку персональных данных: дано, версия {$consent['consent_version']}, {$consent['consent_at']}",
    'Страница: ' . $value('page'),
    "Получено: $receivedAt",
);

$boundary = 'part-' . bin2hex(random_bytes(12));
// The sender's name carries no domain: a name naming another domain than the address looks like phishing to mail filters.
$headers = [
    'From: ' . encodeHeader('Заявки с сайта Химмаш') . ' <' . $config['from'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
];
if ($data['email'] !== '') {
    $headers[] = 'Reply-To: ' . $data['email'];
}
// Text as quoted-printable rather than base64: plain text in base64 counts against a message in spam filters.
$body = "--$boundary" . EOL
    . 'Content-Type: text/plain; charset=UTF-8' . EOL
    . 'Content-Transfer-Encoding: quoted-printable' . EOL . EOL
    . quoted_printable_encode(implode(EOL, $lines)) . EOL;
foreach ($files as $file) {
    $body .= "--$boundary" . EOL
        . "Content-Type: {$file['type']}; name=\"" . encodeHeader($file['name']) . '"' . EOL
        . 'Content-Transfer-Encoding: base64' . EOL
        . "Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($file['name']) . EOL . EOL
        . chunk_split(base64_encode((string) file_get_contents($file['path'])), 76, EOL);
}
$body .= "--$boundary--" . EOL;

$to = implode(', ', (array) $config['to']);
$subject = encodeHeader(cut(str_replace(["\r", "\n"], ' ', "Заявка с сайта $site: " . $value('subject')), 200));
if (($config['transport'] ?? 'mail') === 'file') {
    $outbox = "$storage/outbox";
    if (!is_dir($outbox)) {
        mkdir($outbox, 0700, true);
    }
    $eml = "To: $to" . EOL . "Subject: $subject" . EOL . implode(EOL, $headers) . EOL . EOL . $body;
    $sent = file_put_contents("$outbox/" . date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.eml', $eml) !== false;
} else {
    $sent = mail($to, $subject, $body, implode(EOL, $headers), empty($config['envelope_sender']) ? '' : '-f' . $config['from']);
}

appendLog("$storage/requests.jsonl", ['received_at' => $receivedAt, 'sent' => $sent] + $data + ['files' => $fileNames]);
if (!$sent) {
    respond(502, ['error' => 'mail']);
}
respond(200);
