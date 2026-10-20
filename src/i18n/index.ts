import ru from './ru';
import en from './en';

export const locales = ['ru', 'en'] as const;
export type Lang = (typeof locales)[number];

// In production each language is its own site: PUBLIC_SITE_LANG=ru builds the Russian site (.ru),
// en the English one (.com), each at its own root; links to the other language go to its domain
// (PUBLIC_SITE_URL_RU / PUBLIC_SITE_URL_EN). Unset, as on the preview: one build with Russian at the
// root and English under /en/.
const siteLang = (import.meta.env.PUBLIC_SITE_LANG || undefined) as Lang | undefined;
if (siteLang && !locales.includes(siteLang)) throw new Error(`PUBLIC_SITE_LANG must be one of: ${locales.join(', ')}`);
/** Language at the root of this build. */
export const rootLang: Lang = siteLang ?? 'ru';
/** Languages built under /<lang>/ next to the root one (the preview only). */
export const prefixedLangs: Lang[] = siteLang ? [] : locales.filter((l) => l !== rootLang);
const builtLangs: Lang[] = [rootLang, ...prefixedLangs];
const siteUrls: Record<Lang, string | undefined> = {
  ru: import.meta.env.PUBLIC_SITE_URL_RU || undefined,
  en: import.meta.env.PUBLIC_SITE_URL_EN || undefined,
};
/** Production address of the site in this language, if configured. */
export function siteUrl(lang: Lang): string | undefined {
  return siteUrls[lang];
}

export const langMeta: Record<Lang, { label: string; name: string; htmlLang: string; hreflang: string; ogLocale: string; dateLocale: string }> = {
  ru: { label: 'RU', name: 'Русский', htmlLang: 'ru', hreflang: 'ru', ogLocale: 'ru_RU', dateLocale: 'ru-RU' },
  en: { label: 'EN', name: 'English', htmlLang: 'en', hreflang: 'en', ogLocale: 'en_US', dateLocale: 'en-GB' },
};

export type UI = typeof ru;
const dictionaries: Record<Lang, UI> = { ru, en };

export function useTranslations(lang: Lang): UI {
  return dictionaries[lang];
}

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** URL of a page in a language. `path` is locale-neutral, e.g. "/equipment/centrifuge/".
 *  Site-relative with the base path, or absolute when the language lives on the other domain. */
export function localePath(lang: Lang, path = '/'): string {
  const clean = path.replace(/^\/+/, '');
  if (!builtLangs.includes(lang)) {
    const origin = siteUrls[lang];
    if (!origin) throw new Error(`Set PUBLIC_SITE_URL_${lang.toUpperCase()}: pages link to the ${langMeta[lang].name} site.`);
    return new URL(clean, origin.replace(/\/?$/, '/')).href;
  }
  const prefix = lang === rootLang ? '' : `${lang}/`;
  return `${base}${prefix}${clean}`;
}

/** URL of a static file in /public. */
export function asset(path: string): string {
  return `${base}${path.replace(/^\/+/, '')}`;
}

export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(langMeta[lang].dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
}
