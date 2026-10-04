import type { APIRoute } from 'astro';

// /sitemap.xml is where crawlers and auditors look first; it points to the index the sitemap integration writes.
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const index = new URL(`${base}sitemap-0.xml`, site).href;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${index}</loc></sitemap></sitemapindex>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
