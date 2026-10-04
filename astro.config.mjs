// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';

// SITE_URL and BASE_PATH come from .env locally and from repository variables in the deploy workflow.
// GitHub Pages preview: SITE_URL=https://pandusss.github.io BASE_PATH=/himmash-site/
// Own domain:           SITE_URL=https://xn--24-6kc5aua4d2a.xn--p1ai BASE_PATH=/
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };
const site = env.SITE_URL || 'https://xn--24-6kc5aua4d2a.xn--p1ai';
const base = env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // Styles are inlined into each page: no render-blocking request before the first paint.
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ru',
        locales: { ru: 'ru', en: 'en', zh: 'zh-Hans' },
      },
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
