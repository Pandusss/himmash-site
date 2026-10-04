import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
  // Preview deployments stay out of search engines.
  if (import.meta.env.PUBLIC_NOINDEX === 'true') {
    return new Response('User-agent: *\nDisallow: /\n', { headers });
  }
  const sitemap = new URL(`${import.meta.env.BASE_URL.replace(/\/?$/, '/')}sitemap.xml`, site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, { headers });
};
