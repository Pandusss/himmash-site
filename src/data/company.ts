import { statSync } from 'node:fs';
import { join } from 'node:path';
import { type Lang, localePath, asset } from '../i18n';

export const company = {
  phone: '+79614053558',
  phoneDisplay: { ru: '+7 (961) 405-35-58', intl: '+7 961 405-35-58' },
  email: 'ggg13@yandex.ru',
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

// Contacts per site: the Russian site gives the company's phone and mailbox; the English one no phone and the
// mailbox for foreign customers (Dima, 23.10.2026).
const contacts: Record<Lang, { phone: string | null; email: string }> = {
  ru: { phone: company.phone, email: company.email },
  en: { phone: null, email: 'himmash24@gmail.com' },
};

/** The phone (null where the site shows none) and the email of the site in this language. */
export function contactsFor(lang: Lang) {
  return contacts[lang];
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
    ...(contacts[lang].phone ? { telephone: contacts[lang].phone } : {}),
    email: contacts[lang].email,
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
      ...(contacts[lang].phone ? { telephone: contacts[lang].phone } : {}),
      email: contacts[lang].email,
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
