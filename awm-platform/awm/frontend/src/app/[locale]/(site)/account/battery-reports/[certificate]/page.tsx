import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BatteryReportView } from '@/components/account/BatteryReportView';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { accountGet } from '@/lib/api/account';
import type { BatteryReport } from '@/types/account';

type Props = { params: Promise<{ locale: string; certificate: string }> };

export default async function BatteryReportPage({ params }: Props) {
  const { locale, certificate } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9-]{3,60}$/.test(certificate)) notFound();

  const [t, report] = await Promise.all([getTranslations('account'), accountGet<BatteryReport>(`/account/battery-reports/${certificate}`, locale)]);
  if (!report) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/vehicles" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-awm-muted hover:text-awm-red">
          <Icon name="arrow" size={16} className="rotate-180" />{t('back')}
        </Link>
        <h1 className="text-3xl font-extrabold">{t('report.title')}</h1>
      </div>

      <BatteryReportView report={report} locale={locale} />

      <p className="text-xs text-awm-muted">
        {t('report.verify')}: <span className="break-all font-mono" dir="ltr">{report.verify_url}</span>
      </p>
    </div>
  );
}
