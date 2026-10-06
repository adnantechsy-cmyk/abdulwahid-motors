import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingCta } from '@/components/home/BookingCta';
import { JsonLd } from '@/components/seo/JsonLd';
import { BranchCards } from '@/components/site/BranchCards';
import { ContactChannels } from '@/components/site/ContactChannels';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Link } from '@/i18n/navigation';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about.hero' });
  return routeMetadata(locale, 'about', { title: t('title'), description: t('text') });
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, seo] = await Promise.all([getTranslations('about'), getRouteSeo(locale, 'about')]);

  const offer: { key: 'cars' | 'parts' | 'service'; icon: IconName; href: '/vehicles' | '/parts' | '/services' }[] = [
    { key: 'cars', icon: 'car', href: '/vehicles' },
    { key: 'parts', icon: 'gear', href: '/parts' },
    { key: 'service', icon: 'wrench', href: '/services' },
  ];
  const values: { key: 'trust' | 'transparency' | 'technical' | 'support'; icon: IconName }[] = [
    { key: 'trust', icon: 'shield' },
    { key: 'transparency', icon: 'check' },
    { key: 'technical', icon: 'wrench' },
    { key: 'support', icon: 'headset' },
  ];
  const faq = t.raw('faq.items') as { q: string; a: string }[];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <main>
      {seo && <JsonLd data={seo.json_ld} />}
      <JsonLd data={faqJsonLd} />

      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} text={t('hero.text')}>
        <ButtonLink href="/vehicles" size="lg">{t('hero.cars')}<Icon name="arrow" /></ButtonLink>
        <ButtonLink href="/service-booking" variant="outline" size="lg">{t('hero.book')}</ButtonLink>
      </PageHero>

      <section aria-label={`${t('vision.title')} / ${t('mission.title')}`} className="container-awm grid grid-cols-1 gap-4 py-12 md:grid-cols-2">
        {(['vision', 'mission'] as const).map((k) => (
          <div key={k} className="border border-awm-line border-s-4 border-s-awm-red bg-white p-8">
            <h2 className="text-2xl font-extrabold">{t(`${k}.title`)}</h2>
            <p className="mt-3 text-lg leading-8 text-awm-muted">{t(`${k}.text`)}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="offer-title" className="container-awm pb-16">
        <SectionHeading id="offer-title" eyebrow={t('offer.eyebrow')} title={t('offer.title')} />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {offer.map(({ key, icon, href }) => (
            <li key={key} className="flex flex-col gap-4 border border-awm-line bg-white p-6">
              <span className="flex size-12 items-center justify-center bg-awm-panel text-awm-red"><Icon name={icon} size={24} /></span>
              <h3 className="text-xl font-extrabold">{t(`offer.${key}.title`)}</h3>
              <p className="text-sm leading-6 text-awm-muted">{t(`offer.${key}.text`)}</p>
              <Link href={href} className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-awm-red underline underline-offset-4">
                {t(`offer.${key}.link`)}<Icon name="arrow" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="values-title" className="border-y border-awm-line bg-awm-panel">
        <div className="container-awm py-16">
          <SectionHeading id="values-title" eyebrow={t('values.eyebrow')} title={t('values.title')} />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ key, icon }) => (
              <li key={key} className="border border-awm-line bg-white p-6">
                <span className="mb-4 flex size-11 items-center justify-center bg-awm-black text-white"><Icon name={icon} size={22} /></span>
                <h3 className="text-lg font-extrabold">{t(`values.items.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-6 text-awm-muted">{t(`values.items.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="container-awm py-16">
        <SectionHeading id="faq-title" eyebrow={t('faq.eyebrow')} title={t('faq.title')} />
        <div className="flex max-w-3xl flex-col gap-3">
          {faq.map((item) => (
            <details key={item.q} className="group border border-awm-line bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden="true" className="text-xl leading-none text-awm-red transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-awm-line p-5 text-sm leading-7 text-awm-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="branches-title" className="container-awm pb-16">
        <SectionHeading id="branches-title" eyebrow={t('branches.eyebrow')} title={t('branches.title')} />
        <BranchCards />
      </section>

      <section aria-labelledby="contact-title" className="border-t border-awm-line bg-awm-panel">
        <div className="container-awm py-16">
          <SectionHeading id="contact-title" eyebrow={t('contact.eyebrow')} title={t('contact.title')} description={t('contact.text')} />
          <ContactChannels />
        </div>
      </section>

      <BookingCta />
    </main>
  );
}
