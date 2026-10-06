import 'server-only';
import { getTranslations } from 'next-intl/server';
import { SERVICE_TYPES } from '@/lib/booking-services';
import { contactChannels, siteConfig } from '@/lib/site.config';
import { absoluteUrl, LOGO_URL, ORGANIZATION_ID, otherLocale, SITE, WEBSITE_ID } from './site';

type Json = Record<string, unknown>;

const WEEKDAY: Record<string, string> = {
  sat: 'Saturday', sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday',
};
const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;
const CONTACT_TYPE = { info: 'customer service', sales: 'sales', parts: 'parts', management: 'management' } as const;

const hoursSpec = () =>
  siteConfig.hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days.map((d) => WEEKDAY[d]),
    opens: h.open,
    closes: h.close,
  }));

/**
 * Site-wide entities, printed on every page: the AutoDealer business (with its two branches, hours,
 * departments' emails and social profiles) and the WebSite with its search action. Everything comes from
 * real data (messages, site.config); a field with no value is left out, never invented.
 * Laravel's offers and vehicles point at this entity through the same @id.
 */
export async function siteJsonLd(locale: string): Promise<Json[]> {
  const [brand, other, bt, seo, footer] = await Promise.all([
    getTranslations({ locale, namespace: 'brand' }),
    getTranslations({ locale: otherLocale(locale), namespace: 'brand' }),
    getTranslations({ locale, namespace: 'booking.branches' }),
    getTranslations({ locale, namespace: 'seo' }),
    getTranslations({ locale, namespace: 'footer' }),
  ]);
  const c = contactChannels();
  const city = seo('city');

  const organization: Json = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    '@id': ORGANIZATION_ID,
    name: brand('name'),
    alternateName: other('name'),
    url: absoluteUrl(locale),
    logo: { '@type': 'ImageObject', '@id': `${SITE}/#logo`, url: LOGO_URL, contentUrl: LOGO_URL, width: 400, height: 240, caption: brand('name') },
    image: LOGO_URL,
    description: footer('about'),
    brand: { '@type': 'Brand', name: 'BYD' },
    areaServed: { '@type': 'Country', name: locale === 'ar' ? 'سوريا' : 'Syria' },
    address: { '@type': 'PostalAddress', addressLocality: city, addressCountry: 'SY' },
    openingHoursSpecification: hoursSpec(),
    potentialAction: {
      '@type': 'ReserveAction',
      name: seo('reserve'),
      target: { '@type': 'EntryPoint', urlTemplate: absoluteUrl(locale, 'service-booking'), actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] },
    },
    department: BRANCHES.map((b) => ({
      '@type': 'AutoDealer',
      name: bt(`${b}.title`),
      parentOrganization: { '@id': ORGANIZATION_ID },
      address: { '@type': 'PostalAddress', streetAddress: bt(`${b}.text`), addressLocality: city, addressCountry: 'SY' },
      hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${brand('name')} ${bt(`${b}.title`)} ${bt(`${b}.text`)}`)}`,
      openingHoursSpecification: hoursSpec(),
    })),
  };

  if (c.emails[0]) organization.email = c.emails[0].address;
  if (c.phone) organization.telephone = c.phone;
  if (c.social.length > 0) organization.sameAs = c.social.map((s) => s.href);
  if (c.emails.length > 0 || c.phone) {
    organization.contactPoint = [
      ...c.emails.map((e) => ({
        '@type': 'ContactPoint',
        contactType: CONTACT_TYPE[e.key],
        email: e.address,
        areaServed: 'SY',
        availableLanguage: ['Arabic', 'English'],
      })),
      ...(c.phone ? [{ '@type': 'ContactPoint', contactType: 'customer service', telephone: c.phone, areaServed: 'SY', availableLanguage: ['Arabic', 'English'] }] : []),
    ];
  }

  const website: Json = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absoluteUrl(locale),
    name: brand('name'),
    inLanguage: locale,
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/${locale}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  return [organization, website];
}

/** The service catalogue on /services: one Service per bookable service type, each bookable online. */
export async function servicesJsonLd(locale: string): Promise<Json[]> {
  const [t, s] = await Promise.all([getTranslations({ locale, namespace: 'booking.services' }), getTranslations({ locale, namespace: 'services.hero' })]);
  const booking = absoluteUrl(locale, 'service-booking');

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      '@id': `${absoluteUrl(locale, 'services')}#service`,
      name: s('title'),
      serviceType: 'Automotive maintenance',
      provider: { '@id': ORGANIZATION_ID },
      areaServed: { '@type': 'Country', name: locale === 'ar' ? 'سوريا' : 'Syria' },
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: booking },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: s('eyebrow'),
        itemListElement: SERVICE_TYPES.map((type) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: t(`${type}.title`),
            description: t(`${type}.text`),
            serviceType: type.replace('_', ' '),
            provider: { '@id': ORGANIZATION_ID },
            url: `${booking}?service=${type}`,
          },
        })),
      },
    },
  ];
}

/** ItemList for a catalogue page: tells search engines which products the page lists, in order. */
export function itemListJsonLd(name: string, items: { name: string; url: string; image?: string | null }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: item.url,
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}
