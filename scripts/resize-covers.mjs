// Makes -w800 / -w1200 variants of every article cover, so phones get a smaller image.
// Run after adding an article with a new cover: node scripts/resize-covers.mjs
import fs from 'node:fs';
import sharp from 'sharp';

sharp.cache(false);
const dir = 'src/content/articles';
const covers = new Set();
for (const lang of fs.readdirSync(dir)) {
  for (const file of fs.readdirSync(`${dir}/${lang}`)) {
    const cover = fs.readFileSync(`${dir}/${lang}/${file}`, 'utf8').match(/^cover: "([^"]+)"/m)?.[1];
    if (cover) covers.add(cover);
  }
}
for (const cover of covers) {
  const src = `public/${cover}`;
  const { width } = await sharp(src).metadata();
  for (const w of [800, 1200]) {
    const out = src.replace(/\.webp$/, `-w${w}.webp`);
    if (width <= w || fs.existsSync(out)) continue;
    await sharp(src).resize(w).webp({ quality: 76 }).toFile(out);
    console.log('made', out);
  }
}
