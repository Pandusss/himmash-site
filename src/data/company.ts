import { statSync } from 'node:fs';
import { join } from 'node:path';
import { type Lang, localePath, asset } from '../i18n';

export const company = {
  phone: '+79614053558',
  phoneDisplay: { ru: '+7 (961) 405-35-58', intl: '+7 961 405-35-58' },
  email: 'ggg13@yandex.ru',
  max: 'https://max.ru/u/72094509',
  route: 'https://yandex.ru/maps/?rtext=~%D1%83%D0%BB.%20%D0%A1%D0%BE%D1%86%D0%B8%D0%B0%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F%2C%20154%2C%20%D0%A2%D0%B0%D0%B3%D0%B0%D0%BD%D1%80%D0%BE%D0%B3%2C%20%D0%A0%D0%BE%D1%81%D1%82%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%20%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C%2C%20347905&rtt=auto',
  address: {
    streetAddress: { ru: 'ул. Социалистическая, 154', en: '154 Sotsialisticheskaya St.' },
    addressLocality: { ru: 'Таганрог', en: 'Taganrog' },
    addressRegion: { ru: 'Ростовская область', en: 'Rostov Oblast' },
    postalCode: '347905',
    addressCountry: 'RU',
  },
  name: { ru: 'НПО «Химмаш»', en: 'NPO Himmash' },
};

// Presentation of the КПТБО-300 complex for customers (PDF in public/docs). Russian only for now:
// the English site shows no links until an English file is added here.
const presentations: Partial<Record<Lang, string>> = { ru: 'docs/kptbo-300.pdf' };

/** Link and size of the presentation in this language, or null. */
export function presentationFor(lang: Lang): { href: string; size: string } | null {
  const file = presentations[lang];
  if (!file) return null;
  const kb = statSync(join(process.cwd(), 'public', file)).size / 1024;
  const size = kb < 1024 ? `${Math.round(kb)} ${lang === 'ru' ? 'КБ' : 'KB'}` : `${(kb / 1024).toFixed(1).replace('.', lang === 'ru' ? ',' : '.')} ${lang === 'ru' ? 'МБ' : 'MB'}`;
  return { href: asset(file), size };
}

/** MAX is a Russian messenger: offered on the Russian site only. */
export function hasMax(lang: Lang): boolean {
  return lang === 'ru';
}

export function phoneDisplay(lang: Lang): string {
  return lang === 'ru' ? company.phoneDisplay.ru : company.phoneDisplay.intl;
}

export function organizationJsonLd(lang: Lang, absolute: (href: string) => string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name[lang],
    url: absolute(localePath(lang, '/')),
    logo: absolute(asset('img/logo-01-122x122.webp')),
    telephone: company.phone,
    email: company.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address.streetAddress[lang],
      addressLocality: company.address.addressLocality[lang],
      addressRegion: company.address.addressRegion[lang],
      postalCode: company.address.postalCode,
      addressCountry: company.address.addressCountry,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: company.phone,
      email: company.email,
      contactType: 'sales',
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '17:00',
      },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[], absolute: (href: string) => string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: absolute(item.href) })),
  };
}
