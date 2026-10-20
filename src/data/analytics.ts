import type { Lang } from '../i18n';

// Web analytics: Yandex Metrika on the Russian site, Google Analytics on the English one.
// Off until the counter ID is set (PUBLIC_YANDEX_METRIKA_ID, PUBLIC_GA_ID). A counter loads only after the
// visitor accepts cookies (src/components/CookieNotice.astro, src/scripts/analytics.ts), and the privacy
// policy gains its analytics sections (`analytics` in src/data/legal.ts).
export interface Analytics { provider: 'metrika' | 'ga'; id: string }

export function analyticsFor(lang: Lang): Analytics | null {
  const metrika = lang === 'ru';
  const id = String((metrika ? import.meta.env.PUBLIC_YANDEX_METRIKA_ID : import.meta.env.PUBLIC_GA_ID) ?? '').trim();
  if (!id) return null;
  if (metrika ? !/^\d+$/.test(id) : !/^G-[A-Z0-9]+$/.test(id)) {
    throw new Error(metrika ? `PUBLIC_YANDEX_METRIKA_ID must be the counter number, got "${id}"` : `PUBLIC_GA_ID must look like G-XXXXXXX, got "${id}"`);
  }
  return { provider: metrika ? 'metrika' : 'ga', id };
}
