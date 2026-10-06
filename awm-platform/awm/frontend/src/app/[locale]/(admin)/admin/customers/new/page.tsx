import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CustomerForm } from '@/components/admin/CustomerForm';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { requirePermission } from '@/lib/api/admin';
import { param } from '@/lib/listing';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** `name` and `phone` in the address pre-fill the form (the guest booking or order the account is for). */
export default async function NewCustomerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'customers.manage');

  const raw = await searchParams;
  const t = await getTranslations('admin.customers');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/customers" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('newTitle')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('newIntro')}</p>
      </div>
      <Panel id="customer-form" title={t('details')}>
        <CustomerForm defaults={{ name: param(raw, 'name')?.slice(0, 120), phone: param(raw, 'phone')?.slice(0, 30) }} />
      </Panel>
    </div>
  );
}