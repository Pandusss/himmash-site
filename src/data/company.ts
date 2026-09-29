import { type Lang, localePath, asset } from '../i18n';

export const company = {
  phone: '+79614053558',
  phoneDisplay: { ru: '+7 (961) 405-35-58', intl: '+7 961 405-35-58' },
  email: 'ggg13@yandex.ru',
  max: 'https://max.ru/u/72094509',
  address: {
    streetAddress: { ru: 'ул. Социалистическая, 154', en: '154 Sotsialisticheskaya St.', zh: 'Sotsialisticheskaya 街 154 号' },
    addressLocality: { ru: 'Таганрог', en: 'Taganrog', zh: '塔甘罗格' },
    addressRegion: { ru: 'Ростовская область', en: 'Rostov Oblast', zh: '罗斯托夫州' },
    addressCountry: 'RU',
  },
  name: { ru: 'НПО «Химмаш»', en: 'NPO Himmash', zh: 'NPO Himmash' },
};

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
