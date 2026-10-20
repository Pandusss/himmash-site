#!/usr/bin/env bash
# Checks server/api/send-form.php on PHP's built-in server with a test config ("file" transport: messages
# go to storage/outbox instead of the mail system). Run from the site folder: bash server/test.sh
set -euo pipefail
dir=$(mktemp -d)
cp server/api/send-form.php "$dir/"
cat > "$dir/config.php" <<'PHP'
<?php
return [
    'to' => 'zayavki@example.ru',
    'from' => 'noreply@example.ru',
    'envelope_sender' => false,
    'allowed_origins' => ['https://example.ru', 'https://example.com'],
    'storage_dir' => __DIR__ . '/storage',
    'transport' => 'file',
    'rate_limit' => ['max' => 6, 'window' => 600],
];
PHP
printf 'feedstock photo' > "$dir/photo.jpg"
printf 'MZ' > "$dir/tool.exe"
php -S 127.0.0.1:8099 -t "$dir" > "$dir/server.log" 2>&1 &
server=$!
trap 'kill $server' EXIT
sleep 1

url=http://127.0.0.1:8099/send-form.php
ok=0
expect() {
  local want=$1 label=$2; shift 2
  local got
  got=$(curl -s -o "$dir/body" -w '%{http_code}' -H 'Accept: application/json' "$@" "$url")
  if [ "$got" != "$want" ]; then echo "FAIL $label: expected $want, got $got: $(cat "$dir/body")"; cat "$dir/server.log"; exit 1; fi
  echo "ok   $label → $got $(cat "$dir/body")"
  ok=$((ok + 1))
}
check() { if ! eval "$2"; then echo "FAIL $1"; exit 1; fi; echo "ok   $1"; }

ru=(-H 'Origin: https://example.ru')
contact=(-F 'name=Иван Петров' -F 'company=ООО «Полимер»' -F 'email=ivan@example.ru' -F 'need=Отдельная установка' -F 'feedstock=Мешки, тканый ПП' -F 'volume=300–500 кг/ч' -F 'message=Нужна центрифуга после флотации' -F 'subject=Центрифуга для обезвоживания полимеров' -F lang=ru -F page=https://example.ru/equipment/centrifuge/)
consent=(-F consent=yes -F consent_version=1.2-draft -F consent_at=2026-10-20T10:00:00.000Z)

expect 200 'valid request with a file' "${ru[@]}" "${contact[@]}" "${consent[@]}" -F 'phone=+7 (903) 123-45-67' -F "files[]=@$dir/photo.jpg"
eml=$(ls "$dir"/storage/outbox/*.eml)
text=$(php -r '$m = file_get_contents($argv[1]); preg_match("/base64\r\n\r\n(.+?)\r\n--/s", $m, $x); echo base64_decode($x[1]);' "$eml")
check 'message has the contacts' 'grep -q "Телефон: +7 (903) 123-45-67" <<<"$text" && grep -q "Компания: ООО «Полимер»" <<<"$text"'
check 'message has the consent' 'grep -q "версия 1.2-draft, 2026-10-20T10:00:00.000Z" <<<"$text"'
check 'file is attached' 'grep -q "filename\*=UTF-8'"''"'photo.jpg" "$eml"'
check 'reply goes to the visitor' 'grep -q "Reply-To: ivan@example.ru" "$eml"'
check 'consent is logged' '[ "$(wc -l < "$dir/storage/consents.jsonl")" -eq 1 ] && grep -q "\"phone\":\"+7 (903) 123-45-67\"" "$dir/storage/consents.jsonl"'

expect 200 'English site' -H 'Origin: https://example.com' "${contact[@]}" "${consent[@]}" -F lang=en -F 'phone=+44 20 7946 0958'
expect 422 'no phone' "${ru[@]}" "${contact[@]}" "${consent[@]}"
expect 422 'no consent' "${ru[@]}" "${contact[@]}" -F 'phone=+7 903 123-45-67'
expect 422 'file type not allowed' "${ru[@]}" "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67' -F "files[]=@$dir/tool.exe"
expect 403 'foreign site' -H 'Origin: https://spam.example' "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67'
expect 403 'no Origin' "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67'
expect 405 'GET' "${ru[@]}" -X GET
expect 204 'CORS preflight' -H 'Origin: https://example.com' -X OPTIONS
before=$(ls "$dir"/storage/outbox | wc -l)
expect 200 'bot fills the hidden field' "${ru[@]}" "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67' -F website=http://spam
check 'bot request is not sent' '[ "$(ls "$dir"/storage/outbox | wc -l)" -eq "$before" ]'
# Requests so far from this address: 2 sent + 3 rejected by validation; the limit is 6.
expect 200 'last request within the limit' "${ru[@]}" "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67'
expect 429 'over the limit' "${ru[@]}" "${contact[@]}" "${consent[@]}" -F 'phone=+7 903 123-45-67'
check 'storage is closed to the web' 'grep -q "Require all denied" "$dir/storage/.htaccess"'
echo "all checks passed"
