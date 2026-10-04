import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cache = new Map<string, Promise<{ width: number; height: number }>>();

/** Intrinsic size of an image in /public, read at build time, so every <img> can carry width and height. */
export function imageSize(file: string): Promise<{ width: number; height: number }> {
  if (!cache.has(file)) {
    cache.set(file, sharp(path.join(process.cwd(), 'public', file)).metadata().then((m) => ({ width: m.width ?? 0, height: m.height ?? 0 })));
  }
  return cache.get(file)!;
}

/** srcset with the -w800 / -w1200 variants that exist next to an image in /public (made by scripts/resize-covers.mjs). */
export async function responsiveSrcset(file: string, url: (f: string) => string): Promise<string | undefined> {
  const { width } = await imageSize(file);
  const variants = [800, 1200]
    .map((w) => ({ w, f: file.replace(/\.webp$/, `-w${w}.webp`) }))
    .filter((v) => fs.existsSync(path.join(process.cwd(), 'public', v.f)));
  if (!variants.length) return undefined;
  return [...variants.map((v) => `${url(v.f)} ${v.w}w`), `${url(file)} ${width}w`].join(', ');
}
