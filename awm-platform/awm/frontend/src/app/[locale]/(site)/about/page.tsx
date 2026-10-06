import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingCta } from '@/components/home/BookingCta';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { BranchCards } from '@/components/site/BranchCards';
import { ContactChannels } from '@/components/site/ContactChannels';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return routeMetadata(locale, 'about');
}

/** One icon per item of the ecosystem list, in the same order as the text. */
const ECOSYSTEM_ICONS: IconName[] = ['car', 'shield', 'headset', 'wrench', 'bolt', 'gear', 'check'];
const VALUE_ICONS: IconName[] = ['shield', 'check', 'bolt', 'search', 'gear', 'headset'];

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tn, seo] = await Promise.all([getTranslations('about'), getTranslations('nav'), getRouteSeo(locale, 'about')]);

  const story = t.raw('story.paragraphs') as string[];
  const ecosystem = t.raw('ecosystem.items') as string[];
  const values = t.raw('values.items') as string[];
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

      <div className="container-awm pt-6"><Breadcrumbs locale={locale} items={[{ label: tn('about') }]} /></div>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} text={t('hero.text')}>
        <ButtonLink href="/vehicles" size="lg">{t('hero.cars')}<Icon name="arrow" /></ButtonLink>
        <ButtonLink href="/service-booking" variant="outline" size="lg">{t('hero.book')}</ButtonLink>
      </PageHero>

      <section aria-labelledby="story-title" className="container-awm grid grid-cols-1 gap-10 py-12 lg:grid-cols-2">
        <div>
          <SectionHeading id="story-title" eyebrow={t('story.eyebrow')} title={t('story.title')} />
          <div className="flex flex-col gap-5 text-lg leading-8 text-awm-muted">
            {story.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>

        <div>
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('ecosystem.title')}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ecosystem.map((item, i) => (
              <li key={item} className="flex items-center gap-4 border border-awm-line bg-white p-4">
                <span className="flex size-11 shrink-0 items-center justify-center bg-awm-black text-white"><Icon name={ECOSYSTEM_ICONS[i % ECOSYSTEM_ICONS.length]} size={22} /></span>
                <span className="font-bold">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="network-title" className="border-y border-awm-line bg-awm-panel">
        <div className="container-awm py-12">
          <h2 id="network-title" className="text-2xl font-extrabold">{t('network.title')}</h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-awm-muted">{t('network.text')}</p>
        </div>
      </section>

      <section aria-label={`${t('vision.title')} / ${t('mission.title')}`} className="container-awm grid grid-cols-1 gap-4 py-12 md:grid-cols-2">
        {(['vision', 'mission'] as const).map((k) => (
          <div key={k} className="border border-awm-line border-s-4 border-s-awm-red bg-white p-8">
            <h2 className="text-2xl font-extrabold">{t(`${k}.title`)}</h2>
            <p className="mt-3 text-lg leading-8 text-awm-muted">{t(`${k}.text`)}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="values-title" className="border-y border-awm-line bg-awm-panel">
        <div className="container-awm py-16">
          <SectionHeading id="values-title" eyebrow={t('values.eyebrow')} title={t('values.title')} />
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {values.map((v, i) => (
              <li key={v} className="flex flex-col gap-3 border border-awm-line bg-white p-6">
                <span className="flex size-11 items-center justify-center bg-awm-black text-white"><Icon name={VALUE_ICONS[i % VALUE_ICONS.length]} size={22} /></span>
                <h3 className="text-lg font-extrabold">{v}</h3>
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
