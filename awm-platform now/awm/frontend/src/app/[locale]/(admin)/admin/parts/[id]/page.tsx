import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PartForm } from '@/components/admin/PartForm';
import { PageHeader } from '@/components/ui/primitives';
import { authedGet } from '@/lib/session';
import type { AdminPartFull } from '@/types/admin';

export default async function EditPart({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations('admin.partForm');
  const part = await authedGet<AdminPartFull>(`/admin/parts/${Number(id)}`, locale, `/${locale}/admin/parts/${id}`);
  if (!part) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={t('eyebrow')} title={part.name[locale] || part.name.en} />
      <PartForm part={part} />
    </div>
  );
}
