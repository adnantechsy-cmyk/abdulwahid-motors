import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PartForm } from '@/components/admin/PartForm';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import type { PartCategory } from '@/types/admin';

type Props = { params: Promise<{ locale: string }> };

export default async function NewPartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'parts.manage');

  const [t, categories] = await Promise.all([getTranslations('admin.parts'), adminGet<PartCategory[]>('/admin/part-categories', locale)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/parts" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('newTitle')}</h1>
      </div>
      <Panel id="part-form" title={t('details')}>
        <PartForm categories={categories ?? []} canEdit />
      </Panel>
    </div>
  );
}
