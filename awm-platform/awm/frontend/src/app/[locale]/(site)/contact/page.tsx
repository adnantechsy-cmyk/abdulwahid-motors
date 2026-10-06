import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingCta } from '@/components/home/BookingCta';
import { JsonLd } from '@/components/seo/JsonLd';
import { BranchCards } from '@/components/site/BranchCards';
import { ContactChannels } from '@/components/site/ContactChannels';
import { OpeningHours } from '@/components/site/OpeningHours';
import { PageHero } from '@/components/site/PageHero';
import { contactChannels } from '@/lib/site.config';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact.hero' });
  return routeMetadata(locale, 'contact', { title: t('title'), description: t('text') });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, seo] = await Promise.all([getTranslations('contact'), getRouteSeo(locale, 'contact')]);

  const c = contactChannels();
  const hasChannels = Boolean(c.emails.length || c.phone || c.whatsapp || c.social.length);

  return (
    <main>
      {seo && <JsonLd data={seo.json_ld} />}
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} text={t('hero.text')} />

      <section aria-labelledby="channels-title" className="container-awm py-12">
        <h2 id="channels-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold"><span aria-hidden="true" className="h-6 w-1 bg-awm-red" />{t('channels.title')}</h2>
        {hasChannels ? <ContactChannels /> : <p className="border border-dashed border-awm-line bg-white p-6 text-awm-muted">{t('channels.none')}</p>}
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
