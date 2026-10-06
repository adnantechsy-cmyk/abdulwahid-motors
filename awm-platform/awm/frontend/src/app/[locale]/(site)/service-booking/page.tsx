import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BookingForm, type OwnedCar } from '@/components/booking/BookingForm';
import { accountGet } from '@/lib/api/account';
import { AUTH_COOKIE } from '@/lib/auth';
import { param } from '@/lib/listing';
import type { OwnedVehicleListItem } from '@/types/account';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'booking' });
  return { title: t('title'), description: t('description') };
}

export default async function ServiceBookingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Signed-in customers pick one of their registered cars; guests describe theirs.
  const signedIn = (await cookies()).has(AUTH_COOKIE);
  let cars: OwnedCar[] = [];
  if (signedIn) {
    const owned = await accountGet<OwnedVehicleListItem[]>('/account/vehicles', locale);
    cars = (owned ?? []).map((v) => ({ id: v.id, label: [v.make, v.model, v.model_year, v.plate_number && `(${v.plate_number})`].filter(Boolean).join(' ') }));
  }

  const t = await getTranslations('booking');
  return (
    <main className="container-awm py-10">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-awm-muted">{t('description')}</p>
      <BookingForm cars={cars} signedIn={signedIn} initialService={param(await searchParams, 'service')} />
    </main>
  );
}
