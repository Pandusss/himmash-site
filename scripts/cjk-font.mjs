// Copies the Noto Sans SC web font (regular, woff2 slices) into public/ for the Chinese pages.
// It is only a fallback: the Chinese font stack lists the system fonts first, and the browser
// downloads just the slices that hold characters on the page.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SRC = 'node_modules/@fontsource/noto-sans-sc';
const OUT = 'public/fonts/noto-sans-sc';
mkdirSync(OUT, { recursive: true });
const css = readFileSync(`${SRC}/400.css`, 'utf8')
  .replace(/font-family: 'Noto Sans SC'/g, "font-family: 'Noto Sans SC Web'")
  .replace(/, url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g, '')
  .replace(/url\(\.\/files\//g, 'url(./');
const files = [...css.matchAll(/url\(\.\/([^)]+\.woff2)\)/g)].map((m) => m[1]);
for (const file of files) cpSync(`${SRC}/files/${file}`, `${OUT}/${file}`);
writeFileSync(`${OUT}/400.css`, css);
console.log(`cjk font: ${files.length} slices`);
