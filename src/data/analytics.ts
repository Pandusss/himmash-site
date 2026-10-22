import type { Lang } from '../i18n';

// Web analytics: Yandex Metrika on the Russian site, Google Analytics on the English one, and Google Analytics on the
// Russian site as well once its own stream is set. Each is off until its ID is set: PUBLIC_YANDEX_METRIKA_ID (Russian),
// PUBLIC_GA_ID (English), PUBLIC_GA_ID_RU (Russian). Counters load only after the visitor accepts cookies
// (src/components/CookieNotice.astro, src/scripts/analytics.ts), and the privacy policy gains its analytics sections
// (`analytics` and `ga` in src/data/legal.ts).
export interface Analytics { provider: 'metrika' | 'ga'; id: string }

const read = (value: unknown) => String(value ?? '').trim();

/** The site's counters in this language; empty when none is set. */
export function countersFor(lang: Lang): Analytics[] {
  const env = import.meta.env;
  const list: Analytics[] = [];
  const metrika = lang === 'ru' ? read(env.PUBLIC_YANDEX_METRIKA_ID) : '';
  if (metrika) {
    if (!/^\d+$/.test(metrika)) throw new Error(`PUBLIC_YANDEX_METRIKA_ID must be the counter number, got "${metrika}"`);
    list.push({ provider: 'metrika', id: metrika });
  }
  const name = lang === 'ru' ? 'PUBLIC_GA_ID_RU' : 'PUBLIC_GA_ID';
  const ga = read(lang === 'ru' ? env.PUBLIC_GA_ID_RU : env.PUBLIC_GA_ID);
  if (ga) {
    if (!/^G-[A-Z0-9]+$/.test(ga)) throw new Error(`${name} must look like G-XXXXXXX, got "${ga}"`);
    list.push({ provider: 'ga', id: ga });
  }
  return list;
}
