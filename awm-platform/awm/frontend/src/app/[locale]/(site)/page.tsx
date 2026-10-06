import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { PartCard } from '@/components/catalog/PartCard';
import { VehicleCard } from '@/components/catalog/VehicleCard';
import { BookingCta } from '@/components/home/BookingCta';
import { CatalogSection } from '@/components/home/CatalogSection';
import { Hero } from '@/components/home/Hero';
import { QuickActions } from '@/components/home/QuickActions';
import { ServicePackages } from '@/components/home/ServicePackages';
import { WhyUs } from '@/components/home/WhyUs';
import { JsonLd } from '@/components/seo/JsonLd';
import { getFeaturedVehicles, getParts } from '@/lib/api/catalog';
import { getRouteSeo, routeMetadata } from '@/lib/seo/route';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return routeMetadata(locale, 'home');
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [seo, vehicles, parts] = await Promise.all([getRouteSeo(locale, 'home'), getFeaturedVehicles(locale, 5), getParts(locale, 4)]);

  // The first car is the hero; the next four fill the grid.
  const [hero, ...rest] = vehicles;

  return (
    <main>
      {/* The AutoDealer entity is printed site-wide by the layout (same @id), so the copy in Laravel's payload is skipped. */}
      {seo && <JsonLd data={seo.json_ld.filter((item) => item['@type'] !== 'AutoDealer')} />}
      <Hero vehicle={hero} locale={locale} />
      <QuickActions />
      <WhyUs />
      <CatalogSection ns="home.vehicles" href="/vehicles" id="vehicles-title" hasItems={rest.length > 0} tone="panel">
        {rest.map((v) => <VehicleCard key={v.id} vehicle={v} locale={locale} />)}
      </CatalogSection>
      <CatalogSection ns="home.parts" href="/parts" id="parts-title" hasItems={parts.length > 0}>
        {parts.map((p) => <PartCard key={p.id} part={p} locale={locale} />)}
      </CatalogSection>
      <ServicePackages />
      <BookingCta />
    </main>
  );
}
