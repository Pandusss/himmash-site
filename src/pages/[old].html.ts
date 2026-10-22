import type { APIRoute, GetStaticPaths } from 'astro';
import { products } from '../data/products';
import { localePath, rootLang } from '../i18n';

// Addresses of the old sites lead to the new equipment pages, so search engines and saved links keep working:
// prod01.html … prod14.html of химмаш24.рф and the pages of the earlier site on himmash24.ru (`legacy`).
// They belong to the Russian site. On the hosting, scripts/build-sites.mjs also turns them into 301 redirects.
export const getStaticPaths: GetStaticPaths = () => rootLang !== 'ru' ? [] :
  products.flatMap((p) => [p.original?.replace(/\.html$/, ''), ...(p.legacy ?? [])].filter((old): old is string => Boolean(old)).map((old) => ({ params: { old }, props: { slug: p.slug } })));

export const GET: APIRoute = ({ props, site }) => {
  // The jump stays on the domain the visitor came to (the main one or its mirror); canonical names the main one.
  const target = localePath('ru', `/equipment/${props.slug}/`);
  const canonical = new URL(target, site).href;
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Страница переехала</title>` +
    `<link rel="canonical" href="${canonical}"><meta name="robots" content="noindex">` +
    `<meta http-equiv="refresh" content="0; url=${target}"><script>location.replace(${JSON.stringify(target)})</script></head>` +
    `<body><p>Страница переехала: <a href="${target}">${canonical}</a></p></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
