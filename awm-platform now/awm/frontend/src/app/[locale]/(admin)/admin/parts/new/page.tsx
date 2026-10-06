import { getTranslations } from 'next-intl/server';
import { PartForm } from '@/components/admin/PartForm';
import { PageHeader } from '@/components/ui/primitives';

export default async function NewPart() {
  const t = await getTranslations('admin.partForm');
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t('eyebrow')} title={t('newTitle')} />
      <PartForm />
    </div>
  );
}
