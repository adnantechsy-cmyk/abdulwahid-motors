import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { BookingCta } from '@/components/home/BookingCta';
import { JsonLd } from '@/components/seo/JsonLd';
import { BranchCards } from '@/components/site/BranchCards';
import { BranchMaps } from '@/components/site/BranchMaps';
import { ContactForm } from '@/components/site/ContactForm';
import { ContactChannels } from '@/components/site/ContactChannels';
import { OpeningHours } from '@/components/site/OpeningHours';
import { PageHero } from '@/components/site/PageHero';
import { contactChannels } from '@/lib/site.config';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return routeMetadata(locale, 'contact');
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tn, seo] = await Promise.all([getTranslations('contact'), getTranslations('nav'), getRouteSeo(locale, 'contact')]);

  const c = contactChannels();
  const hasChannels = Boolean(c.emails.length || c.phone || c.whatsapp || c.social.length);

  return (
    <main>
      {seo && <JsonLd data={seo.json_ld} />}
      <div className="container-awm pt-6"><Breadcrumbs locale={locale} items={[{ label: tn('contact') }]} /></div>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} text={t('hero.text')} />

      <section aria-labelledby="channels-title" className="container-awm py-12">
        <h2 id="channels-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('channels.title')}</h2>
        {hasChannels ? <ContactChannels /> : <p className="border border-dashed border-awm-line bg-white p-6 text-awm-muted">{t('channels.none')}</p>}
      </section>

      <section aria-labelledby="form-title" className="container-awm grid grid-cols-1 gap-8 pb-12 lg:grid-cols-[2fr_3fr]">
        <div>
          <h2 id="form-title" className="mb-3 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('form.title')}</h2>
          <p className="leading-7 text-awm-muted">{t('form.text')}</p>
        </div>
        <ContactForm />
      </section>

      <section aria-labelledby="maps-title" className="container-awm pb-12">
        <h2 id="maps-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('maps.title')}</h2>
        <BranchMaps locale={locale} />
      </section>

      <section aria-labelledby="branches-title" className="container-awm grid grid-cols-1 gap-8 pb-16 lg:grid-cols-[3fr_2fr]">
        <div>
          <h2 id="branches-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('branches.title')}</h2>
          <BranchCards withBooking single />
        </div>
        <div className="lg:pt-[3.25rem]"><OpeningHours locale={locale} /></div>
      </section>

      <BookingCta />
    </main>
  );
}
