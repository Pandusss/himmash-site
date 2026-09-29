// Sanity checks for the built site: broken internal links, leftover Cyrillic
// in translated pages, hreflang tags. Usage: node scripts/check-dist.mjs
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const dist = resolve('dist');
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
})(dist);

const broken = new Map();
const cyrillic = new Map();
let missingHreflang = 0;

function exists(url, fromFile) {
  let path = url.split('#')[0].split('?')[0];
  if (!path) return true;
  path = decodeURIComponent(path);
  let target;
  if (path.startsWith('/')) {
    if (!path.startsWith(base)) return false;
    target = join(dist, path.slice(base.length));
  } else {
    target = resolve(dirname(fromFile), path);
  }
  return existsSync(target) && (statSync(target).isFile() || existsSync(join(target, 'index.html')));
}

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(dist.length).replace(/\\/g, '/');
  for (const [, url] of html.matchAll(/(?:href|src|data-media|data-photo)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
    if (!exists(url, file)) broken.set(`${rel} → ${url}`, true);
  }
  if (/^\/(en|zh)\//.test(rel)) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]*\blang="ru"[^>]*>/g, '')
      .replace(/<[^>]+>/g, ' ');
    for (const m of text.matchAll(/[А-Яа-яЁё][А-Яа-яЁё0-9.\-«» ]{0,40}/g)) {
      const snippet = m[0].trim();
      cyrillic.set(snippet, (cyrillic.get(snippet) ?? 0) + 1);
    }
  }
  if (!rel.includes('404') && !/hreflang="x-default"|hreflang="ru"/.test(html) && !/http-equiv="refresh"/.test(html)) missingHreflang++;
}

console.log(`pages: ${pages.length}`);
console.log(`broken internal links: ${broken.size}`);
for (const k of [...broken.keys()].slice(0, 30)) console.log('  ' + k);
console.log(`pages without hreflang: ${missingHreflang}`);
console.log(`Cyrillic snippets in /en/ and /zh/: ${cyrillic.size}`);
for (const [k, v] of [...cyrillic].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${v}× ${k}`);
