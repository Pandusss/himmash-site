import type { Lang } from '../i18n';

// Web analytics: Yandex Metrika and Google Analytics on both sites, each counter off until its ID is set —
// PUBLIC_YANDEX_METRIKA_ID and PUBLIC_GA_ID_RU on the Russian site, PUBLIC_GA_ID and PUBLIC_YANDEX_METRIKA_ID_EN on the
// English one. Counters load only after the visitor accepts cookies (src/components/CookieNotice.astro,
// src/scripts/analytics.ts), and the privacy policy gains its analytics sections (`analytics`, `ga` and `metrika` in
// src/data/legal.ts).
export interface Analytics { provider: 'metrika' | 'ga'; id: string }

const read = (value: unknown) => String(value ?? '').trim();

/** The site's counters in this language; empty when none is set. */
export function countersFor(lang: Lang): Analytics[] {
  const env = import.meta.env;
  const list: Analytics[] = [];
  const metrikaName = lang === 'ru' ? 'PUBLIC_YANDEX_METRIKA_ID' : 'PUBLIC_YANDEX_METRIKA_ID_EN';
  const metrika = read(lang === 'ru' ? env.PUBLIC_YANDEX_METRIKA_ID : env.PUBLIC_YANDEX_METRIKA_ID_EN);
  if (metrika) {
    if (!/^\d+$/.test(metrika)) throw new Error(`${metrikaName} must be the counter number, got "${metrika}"`);
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
