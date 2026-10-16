import ru from './ru';
import en from './en';

export const locales = ['ru', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'ru';

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

/** Site-relative URL with base path. `path` is locale-neutral, e.g. "/equipment/centrifuge/". */
export function localePath(lang: Lang, path = '/'): string {
  const clean = path.replace(/^\/+/, '');
  const prefix = lang === defaultLang ? '' : `${lang}/`;
  return `${base}${prefix}${clean}`;
}

/** URL of a static file in /public. */
export function asset(path: string): string {
  return `${base}${path.replace(/^\/+/, '')}`;
}

export function formatDate(date: Date, lang: Lang): string {
  return date.toLocaleDateString(langMeta[lang].dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
}
