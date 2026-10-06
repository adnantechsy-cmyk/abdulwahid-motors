import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/catalog/Breadcrumbs';
import { BookingCta } from '@/components/home/BookingCta';
import { JsonLd } from '@/components/seo/JsonLd';
import { PageHero } from '@/components/site/PageHero';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Link } from '@/i18n/navigation';
import { SERVICE_TYPES, type ServiceType } from '@/lib/booking-services';
import { servicesJsonLd } from '@/lib/seo/jsonld';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

const ICONS: Record<ServiceType, IconName> = {
  maintenance: 'wrench',
  repair: 'gear',
  diagnostics: 'bolt',
  warranty: 'shield',
  inspection: 'check',
  battery_check: 'battery',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return routeMetadata(locale, 'services');
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tb, tn, seo, catalogue] = await Promise.all([getTranslations('services'), getTranslations('booking'), getTranslations('nav'), getRouteSeo(locale, 'services'), servicesJsonLd(locale)]);

  const readings = t.raw('battery.items') as string[];
  const steps = t.raw('how.steps') as { title: string; text: string }[];

  return (
    <main>
      {seo && <JsonLd data={seo.json_ld} />}
      <JsonLd data={catalogue} />

      <div className="container-awm pt-6"><Breadcrumbs locale={locale} items={[{ label: tn('services') }]} /></div>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} text={t('hero.text')}>
        <ButtonLink href="/service-booking" size="lg">{t('hero.book')}<Icon name="arrow" /></ButtonLink>
        <ButtonLink href="/parts" variant="outline" size="lg">{t('hero.parts')}</ButtonLink>
      </PageHero>

      <section aria-labelledby="list-title" className="container-awm py-16">
        <SectionHeading id="list-title" eyebrow={t('list.eyebrow')} title={t('list.title')} />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SERVICE_TYPES.map((s) => (
            <li key={s} className="flex flex-col gap-4 border border-awm-line bg-white p-6">
              <span className="flex size-12 items-center justify-center bg-awm-panel text-awm-red"><Icon name={ICONS[s]} size={24} /></span>
              <h3 className="text-xl font-extrabold">{tb(`services.${s}.title`)}</h3>
              <p className="text-sm leading-6 text-awm-muted">{tb(`services.${s}.text`)}</p>
              <ButtonLink href={{ pathname: '/service-booking', query: { service: s } }} variant="dark" size="md" className="mt-auto">{t('list.book')}</ButtonLink>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="battery-title" className="border-y border-awm-line bg-awm-panel">
        <div className="container-awm grid grid-cols-1 gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-bold text-awm-red"><span aria-hidden="true" className="size-2 bg-awm-red" />{t('battery.eyebrow')}</p>
            <h2 id="battery-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">{t('battery.title')}</h2>
            <p className="mt-4 text-base leading-7 text-awm-muted">{t('battery.text')}</p>
            <ButtonLink href={{ pathname: '/service-booking', query: { service: 'battery_check' } }} size="lg" className="mt-8">{t('battery.book')}</ButtonLink>
          </div>
          <div className="border border-awm-line bg-white p-6">
            <h3 className="mb-4 text-lg font-extrabold">{t('battery.readings')}</h3>
            <ul className="flex flex-col gap-3">
              {readings.map((r) => (
                <li key={r} className="flex items-start gap-3 text-sm">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-awm-red" />{r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="container-awm py-16">
        <SectionHeading id="how-title" eyebrow={t('how.eyebrow')} title={t('how.title')} />
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="border border-awm-line bg-white p-5">
              <span aria-hidden="true" className="mb-4 flex size-10 items-center justify-center bg-awm-black font-mono text-sm font-extrabold text-white">{i + 1}</span>
              <h3 className="font-extrabold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-awm-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label={`${t('more.cars.title')} / ${t('more.parts.title')}`} className="container-awm grid grid-cols-1 gap-4 pb-16 md:grid-cols-2">
        {([['cars', '/vehicles', 'car'], ['parts', '/parts', 'gear']] as const).map(([key, href, icon]) => (
          <div key={key} className="flex items-start gap-4 border border-awm-line bg-white p-6">
            <span className="flex size-12 shrink-0 items-center justify-center bg-awm-black text-white"><Icon name={icon} size={22} /></span>
            <div>
              <h3 className="text-lg font-extrabold">{t(`more.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-awm-muted">{t(`more.${key}.text`)}</p>
              <Link href={href} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-awm-red underline underline-offset-4">{t(`more.${key}.link`)}<Icon name="arrow" size={16} /></Link>
            </div>
          </div>
        ))}
      </section>

      <BookingCta />
    </main>
  );
}
