import type { APIRoute, GetStaticPaths } from 'astro';
import { products } from '../data/products';
import { localePath } from '../i18n';

// Old site pages prod01.html … prod14.html redirect to the new equipment pages,
// so search engines and saved links keep working after the move.
export const getStaticPaths: GetStaticPaths = () =>
  products.map((p) => ({ params: { n: p.original.replace(/^prod|\.html$/g, '') }, props: { slug: p.slug } }));

export const GET: APIRoute = ({ props, site }) => {
  const target = new URL(localePath('ru', `/equipment/${props.slug}/`), site).href;
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Страница переехала</title>` +
    `<link rel="canonical" href="${target}"><meta name="robots" content="noindex">` +
    `<meta http-equiv="refresh" content="0; url=${target}"><script>location.replace(${JSON.stringify(target)})</script></head>` +
    `<body><p>Страница переехала: <a href="${target}">${target}</a></p></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
