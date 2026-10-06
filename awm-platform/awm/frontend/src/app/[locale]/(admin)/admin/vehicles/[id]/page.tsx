import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FileUpload } from '@/components/admin/FileUpload';
import { VehicleForm } from '@/components/admin/VehicleForm';
import { Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import type { AdminVehicleDetail, PartCategory } from '@/types/admin';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function VehiclePage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'vehicles.manage');
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [t, tu, vehicle, categories] = await Promise.all([
    getTranslations('admin.vehicles'),
    getTranslations('admin.upload'),
    adminGet<AdminVehicleDetail>(`/admin/vehicles/${id}`, locale),
    adminGet<PartCategory[]>('/admin/vehicle-categories', locale),
  ]);
  if (!vehicle) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/vehicles" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{vehicle.display_name} <span className="text-awm-red">{vehicle.model_year}</span></h1>
        {vehicle.is_published && (
          <p className="mt-2 text-sm"><Link href={`/vehicles/${vehicle.slug}`} className="font-bold text-awm-red underline underline-offset-4">{t('viewOnSite')}</Link></p>
        )}
      </div>

      <Panel id="vehicle-files" title={t('files')}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FileUpload
            path={`vehicles/${vehicle.id}/cover`}
            field="image"
            accept="image/jpeg,image/png,image/webp"
            maxMb={5}
            kind="image"
            label={tu('coverLabel')}
            hint={tu('coverHint')}
            currentUrl={vehicle.cover_url}
          />
          <FileUpload
            path={`vehicles/${vehicle.id}/brochure`}
            removePath={`vehicles/${vehicle.id}/brochure`}
            field="brochure"
            accept="application/pdf"
            maxMb={15}
            kind="pdf"
            label={tu('brochureLabel')}
            hint={tu('brochureHint')}
            currentUrl={vehicle.brochure_url}
          />
        </div>
      </Panel>

      <Panel id="vehicle-form" title={t('details')}>
        <VehicleForm vehicle={vehicle} categories={categories ?? []} />
      </Panel>
    </div>
  );
}
