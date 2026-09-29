import type { Lang } from '../i18n';
import ru from './products.ru';
import en from './products.en';
import zh from './products.zh';

export type Category = 'line' | 'washing' | 'granulation' | 'systems';
export const categoryOrder: Category[] = ['line', 'washing', 'granulation', 'systems'];

export interface ProductMeta {
  slug: string;
  /** Page on the current химмаш24.рф site the content came from. */
  original: string;
  category: Category;
  /** Card image, path inside /public/img. */
  image: string;
  /** Gallery images, paths inside /public/img; defaults to [image]. */
  photos?: string[];
  related: string[];
}

export interface ProductText {
  name: string;
  short: string;
  /** One line for catalog cards. */
  card: string;
  /** Hero paragraph on the product page. */
  lead: string;
  metaDescription: string;
  /** Extra description paragraphs. */
  body?: string[];
  /** Bullet list under the description, with an optional heading. */
  bulletsTitle?: string;
  bullets?: string[];
  specs?: [string, string][];
  quick?: { value: string; unit: string; label: string }[];
  price?: string;
  /** Small note under the price, e.g. "без НДС". */
  priceNote?: string;
  deliveryTime?: string;
  materials?: { title: string; size: string; moisture: string }[];
  terms?: { value: string; text: string }[];
}

export const products: ProductMeta[] = [
  { slug: 'granulation-lines', original: 'prod01.html', category: 'line', image: 'products/00-01-696x392.webp', photos: ['products/01-01-1200.webp', 'products/01-02-1200.webp', 'bg-02-1920x1080.webp'], related: ['flotation-machine', 'friction-washer', 'centrifuge', 'granulation-head'] },
  { slug: 'centrifuge', original: 'prod02.html', category: 'washing', image: 'products/00-02-696x392.webp', photos: ['products/02-01-1200x900.webp', 'products/02-02-1200x900.webp'], related: ['friction-washer', 'flotation-machine', 'pneumatic-conveying'] },
  { slug: 'friction-washer', original: 'prod08.html', category: 'washing', image: 'products/00-08-696x392.webp', photos: ['products/08-01-1200.webp', 'products/08-02-1200.webp'], related: ['flotation-machine', 'centrifuge', 'screws-and-shafts'] },
  { slug: 'screw-feeder', original: 'prod04.html', category: 'systems', image: 'products/00-04-696x392.webp', photos: ['products/04-01-1200.webp', 'products/04-02-1200.webp'], related: ['storage-hopper', 'pneumatic-conveying', 'thrust-bearing-unit'] },
  { slug: 'granulation-head', original: 'prod05.html', category: 'granulation', image: 'products/00-05-696x392.webp', photos: ['products/05-01-1200.webp', 'products/05-02-1200.webp'], related: ['dies-and-knives', 'screen-changer', 'vacuum-degassing'] },
  { slug: 'water-treatment-t5000', original: 'prod12.html', category: 'systems', image: 'products/00-12-696x392.webp', photos: ['products/12-01-1200.webp', 'products/12-02-1200.webp'], related: ['flotation-machine', 'friction-washer', 'granulation-lines'] },
  { slug: 'dies-and-knives', original: 'prod03.html', category: 'granulation', image: 'products/00-03-696x392.webp', photos: ['products/03-01-1200.webp', 'products/03-02-1200.webp', 'products/03-03-1200.webp'], related: ['granulation-head', 'screen-changer', 'vacuum-degassing'] },
  { slug: 'flotation-machine', original: 'prod06.html', category: 'washing', image: 'products/00-06-696x392.webp', photos: ['products/06-01-1200.webp'], related: ['friction-washer', 'centrifuge', 'water-treatment-t5000'] },
  { slug: 'pneumatic-conveying', original: 'prod07.html', category: 'systems', image: 'products/00-07-696x392.webp', photos: ['products/07-01-1200.webp', 'products/07-02-1200.webp'], related: ['storage-hopper', 'screw-feeder', 'centrifuge'] },
  { slug: 'vacuum-degassing', original: 'prod09.html', category: 'granulation', image: 'products/00-09-696x392.webp', photos: ['products/09-01-1200.webp'], related: ['screen-changer', 'granulation-head', 'thrust-bearing-unit'] },
  { slug: 'storage-hopper', original: 'prod10.html', category: 'systems', image: 'products/00-10-696x392.webp', photos: ['products/10-01-1200.webp', 'products/10-02-1200.webp'], related: ['screw-feeder', 'pneumatic-conveying', 'granulation-lines'] },
  { slug: 'screen-changer', original: 'prod11.html', category: 'granulation', image: 'products/00-11-696x392.webp', photos: ['products/11-01-1200.webp'], related: ['vacuum-degassing', 'granulation-head', 'dies-and-knives'] },
  { slug: 'screws-and-shafts', original: 'prod13.html', category: 'systems', image: 'products/00-13-696x392.webp', photos: ['products/13-02-1200.webp', 'products/02-03-1200x900.webp'], related: ['friction-washer', 'screw-feeder', 'thrust-bearing-unit'] },
  { slug: 'thrust-bearing-unit', original: 'prod14.html', category: 'systems', image: 'products/00-14-696x392.webp', photos: ['products/14-02-1200.webp', 'products/14-01-1200.webp'], related: ['screw-feeder', 'vacuum-degassing', 'screen-changer'] },
];

/** Line process on the home page: each step lists the equipment that covers it. */
export const processSteps: string[][] = [
  ['flotation-machine'],
  ['friction-washer', 'screws-and-shafts'],
  ['centrifuge'],
  ['storage-hopper', 'screw-feeder', 'pneumatic-conveying'],
  ['screen-changer', 'vacuum-degassing'],
  ['granulation-head', 'dies-and-knives'],
];
export const processLoop: string[] = ['water-treatment-t5000'];

const texts: Record<Lang, Record<string, ProductText>> = { ru, en, zh };

/** One-line label of a quick spec for cards and the table: "Производительность<br>до 500 кг/час" → "Производительность". */
export function quickLabel(label: string): string {
  return label
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/(?:^|\s)(?:до|up to)\s+\d[\d\s,.–-]*\S*$/i, '') // "… до 500 кг/час" repeats the value
    .replace(/(?:最高|不超过)\s*\d[\d\s,.–-]*\S*$/, '')
    .replace(/,?\s*(?:до|up to)$/i, '') // "Отбор паров влаги, до"
    .replace(/([一-鿿])\s+(?=[一-鿿])/g, '$1') // no spaces between Chinese characters
    .trim();
}

export function productText(slug: string, lang: Lang): ProductText {
  const text = texts[lang][slug];
  if (!text) throw new Error(`Missing ${lang} text for product "${slug}"`);
  return text;
}

export function productBySlug(slug: string): ProductMeta {
  const product = products.find((p) => p.slug === slug);
  if (!product) throw new Error(`Unknown product "${slug}"`);
  return product;
}
