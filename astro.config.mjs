// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

// The preview (GitHub Pages) is one build with both languages: SITE_URL and BASE_PATH come from .env locally
// and from repository variables in the deploy workflow, e.g. SITE_URL=https://pandusss.github.io BASE_PATH=/himmash-site/
// Production is one build per domain (scripts/build-sites.mjs): PUBLIC_SITE_LANG=ru or en, served from the root of
// PUBLIC_SITE_URL_RU or PUBLIC_SITE_URL_EN.
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
const siteLang = env.PUBLIC_SITE_LANG || '';
const domainUrl = siteLang && env[`PUBLIC_SITE_URL_${siteLang.toUpperCase()}`];
if (siteLang && !domainUrl) throw new Error(`PUBLIC_SITE_LANG=${siteLang} needs PUBLIC_SITE_URL_${siteLang.toUpperCase()}`);
const site = domainUrl || env.SITE_URL || 'https://xn--24-6kc5aua4d2a.xn--p1ai';
const base = siteLang ? '/' : env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // Styles are inlined into each page: no render-blocking request before the first paint.
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      // Language versions on the other domain are linked from each page's hreflang tags.
      ...(siteLang ? {} : { i18n: { defaultLocale: 'ru', locales: { ru: 'ru', en: 'en' } } }),
      filter: (page) => !page.includes('/404') && !page.includes('/zh/'),
    }),
  ],
});
