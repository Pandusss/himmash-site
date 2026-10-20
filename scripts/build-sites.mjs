// Builds the production sites, one per domain: the Russian site into dist-ru (for the .ru domain)
// and the English one into dist-en (for .com). Each is checked with check-dist.mjs and gets the form
// handler in api/ (server/api; config.php is created on the hosting, see README).
// Needs PUBLIC_SITE_URL_RU and PUBLIC_SITE_URL_EN in .env or the environment.
// Usage: npm run build:sites            both sites
//        npm run build:sites -- en      one site
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Variables already set in the environment win over .env.
if (existsSync('.env')) process.loadEnvFile('.env');
const env = process.env;
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['ru', 'en'];
const missing = ['PUBLIC_SITE_URL_RU', 'PUBLIC_SITE_URL_EN'].filter((name) => !env[name]);
if (missing.length) {
  console.error(`Set ${missing.join(' and ')} (in .env or the environment), e.g. PUBLIC_SITE_URL_RU=https://example.ru`);
  process.exit(1);
}

/** Apache settings of a site: its own 404 page, and real 301 redirects for the old sites' addresses. The redirect
 *  pages from src/pages/[old].html.ts stay as a fallback where the server sends such a file without asking Apache. */
function htaccess(dir) {
  const rules = ['ErrorDocument 404 /404.html'];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.html')).sort()) {
    const target = readFileSync(`${dir}/${name}`, 'utf8').match(/http-equiv="refresh" content="0; url=(\/[^"]*)"/)?.[1];
    if (!target) continue;
    const old = name.replace(/\.html$/, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    rules.push(`RedirectMatch 301 ^/${old}(\\.html)?/?$ ${target}`);
  }
  return rules.join('\n') + '\n';
}

const run = (args, extra) => {
  const result = spawnSync(args[0], args.slice(1), { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, ...extra } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
for (const lang of langs) {
  if (!['ru', 'en'].includes(lang)) throw new Error(`Unknown site language: ${lang}`);
  const out = `dist-${lang}`;
  console.log(`\n=== ${lang}: ${env[`PUBLIC_SITE_URL_${lang.toUpperCase()}`]} → ${out}/`);
  // SITE_URL and BASE_PATH of the preview must not leak into a domain build.
  run(['npx', 'astro', 'build', '--outDir', out], { PUBLIC_SITE_LANG: lang, SITE_URL: '', BASE_PATH: '/' });
  run(['node', 'scripts/check-dist.mjs', out], { PUBLIC_SITE_LANG: lang, BASE_PATH: '/' });
  for (const file of ['send-form.php', '.user.ini']) cpSync(`server/api/${file}`, `${out}/api/${file}`);
  writeFileSync(`${out}/.htaccess`, htaccess(out));
}
