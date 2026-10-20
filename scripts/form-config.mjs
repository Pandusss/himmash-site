// Settings of the form handler (server/api/send-form.php) from the repository variables, so nothing has to be
// edited on the hosting: build-sites.mjs writes them to api/config.php of each site.
//   FORM_TO       where requests go: one or more addresses, separated by spaces or commas
//   FORM_FROM     sender address on a domain whose SPF allows the hosting (e.g. noreply@xn--24-6kc5aua4d2a.xn--p1ai)
//   FORM_ORIGINS  sites allowed to post, separated by spaces; by default PUBLIC_SITE_URL_RU and PUBLIC_SITE_URL_EN
const email = /^[^\s@'\\]+@[^\s@'\\]+\.[^\s@'\\]+$/;
const php = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const list = (value) => String(value ?? '').split(/[\s,]+/).filter(Boolean);

/** PHP source of config.php, or null when FORM_TO is not set. */
export function formConfig(env) {
  const to = list(env.FORM_TO);
  if (!to.length) return null;
  const from = String(env.FORM_FROM ?? '').trim();
  const bad = [...to, from].filter((address) => !email.test(address));
  if (bad.length) throw new Error(`FORM_TO / FORM_FROM: not an email address: ${bad.map((a) => `"${a}"`).join(', ') || '(empty FORM_FROM)'}`);
  // Browsers send Origin in ASCII (xn--…), which new URL() also produces for Cyrillic domains.
  const origins = [...new Set((list(env.FORM_ORIGINS).length ? list(env.FORM_ORIGINS) : [env.PUBLIC_SITE_URL_RU, env.PUBLIC_SITE_URL_EN].filter(Boolean)).map((o) => new URL(o).origin))];
  if (!origins.length) throw new Error('FORM_ORIGINS: no sites to accept the form from');
  return `<?php
// Written by scripts/build-sites.mjs from the repository variables FORM_TO, FORM_FROM and FORM_ORIGINS;
// change them there, not on the server. Format: server/api/config.example.php.
return [
    'to' => [${to.map(php).join(', ')}],
    'from' => ${php(from)},
    'envelope_sender' => true,
    'allowed_origins' => [${origins.map(php).join(', ')}],
    // Logs outside the public folders (home/www/<site>/api → home/himmash-form), shared by all sites.
    'storage_dir' => dirname(__DIR__, 3) . '/himmash-form',
    'transport' => 'mail',
    'rate_limit' => ['max' => 5, 'window' => 600],
];
`;
}
