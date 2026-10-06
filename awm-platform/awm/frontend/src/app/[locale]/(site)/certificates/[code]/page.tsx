import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BatteryReportView } from '@/components/account/BatteryReportView';
import { apiGet } from '@/lib/api/server';
import type { BatteryReport } from '@/types/account';

type Props = { params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'certificate' });
  // A certificate belongs to one customer's car: reachable by its code, never indexed.
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** Public page the QR code on the printed report points to. The API masks most of the VIN and hides the technician. */
export default async function CertificatePage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9]{4,64}$/.test(code)) notFound();

  // Revalidate quickly: a revoked certificate must stop showing as valid.
  const [t, report] = await Promise.all([getTranslations('certificate'), apiGet<BatteryReport>(`/certificates/${code}`, { locale, revalidate: 60, tags: ['certificates'] })]);
  if (!report) notFound();

  return (
    <main className="container-awm max-w-4xl py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('title')}</h1>
      <p className="mb-8 mt-3 text-awm-muted">{t('intro')}</p>
      <BatteryReportView report={report} locale={locale} />
    </main>
  );
}
