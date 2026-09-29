import { getCollection, type CollectionEntry } from 'astro:content';
import { type Lang, locales } from '../i18n';

export type Article = CollectionEntry<'articles'>;

export function articleSlug(entry: Article): string {
  return entry.id.split('/').slice(1).join('/');
}

export function articleLang(entry: Article): Lang {
  return entry.id.split('/')[0] as Lang;
}

/** Published articles in one language, newest first. */
export async function getArticles(lang: Lang): Promise<Article[]> {
  const all = await getCollection('articles', (entry: Article) => articleLang(entry) === lang && !entry.data.draft);
  return all.sort((a: Article, b: Article) => b.data.date.getTime() - a.data.date.getTime());
}

/** Languages that have a translation of the article with this slug. */
export async function articleLanguages(slug: string): Promise<Lang[]> {
  const all = await getCollection('articles', (entry: Article) => !entry.data.draft && articleSlug(entry) === slug);
  return locales.filter((l) => all.some((entry: Article) => articleLang(entry) === l));
}

/** Rough reading time: ~180 words per minute, or ~400 CJK characters. */
export function readingMinutes(entry: Article): number {
  const body = entry.body ?? '';
  const cjk = (body.match(/[一-鿿]/g) ?? []).length;
  const words = body.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180 + cjk / 400));
}
