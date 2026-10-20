#!/usr/bin/env bash
# Uploads the built sites (dist-ru, dist-en from npm run build:sites) to the hosting with lftp.
# The server copy mirrors the build: files gone from the build are deleted, except what the server
# owns — the form handler's logs (api/storage), its settings when the build has none (api/config.php)
# and Let's Encrypt checks (.well-known). Used by .github/workflows/production.yml.
#   DEPLOY_URL       sftp://host (or ftp://host)
#   DEPLOY_USER, LFTP_PASSWORD
#   DEPLOY_DIRS_RU   site folders on the hosting for the Russian site, space-separated: the main domain
#                    and its mirrors get the same files, e.g. "www/химмаш24.рф www/himmash24.ru"
#   DEPLOY_DIRS_EN   the same for the English site, e.g. "www/himmash24.com"
# Usage: bash scripts/deploy.sh ru en
set -euo pipefail
: "${DEPLOY_URL:?}" "${DEPLOY_USER:?}" "${LFTP_PASSWORD:?}"

for lang in "$@"; do
  dirs_var="DEPLOY_DIRS_${lang^^}"
  dirs="${!dirs_var:-}"
  [ -n "$dirs" ] || { echo "Set $dirs_var: the site folder(s) on the hosting"; exit 1; }
  [ -f "dist-$lang/index.html" ] || { echo "dist-$lang is not built"; exit 1; }
  # A build without handler settings (FORM_TO not set) leaves the ones on the server alone.
  keep_config=""
  [ -f "dist-$lang/api/config.php" ] || keep_config="--exclude-glob api/config.php"
  for dir in $dirs; do
    echo "=== dist-$lang → $dir"
    # sftp:auto-confirm accepts the server's key on first contact (each CI run starts without known hosts).
    lftp --env-password -u "$DEPLOY_USER" "$DEPLOY_URL" -e "
      set sftp:auto-confirm yes; set ftp:ssl-allow yes; set net:max-retries 3; set net:timeout 30;
      mirror --reverse --delete --verbose=1 --parallel=4 $keep_config \
        --exclude-glob api/storage/ --exclude-glob .well-known/ \
        dist-$lang '$dir';
      bye"
  done
done
