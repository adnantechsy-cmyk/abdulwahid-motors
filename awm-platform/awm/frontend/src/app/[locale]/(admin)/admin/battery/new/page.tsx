import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BatteryForm } from '@/components/admin/BatteryForm';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminCustomerVehicle } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Step 1: find the customer's car (name, phone, plate or VIN). Step 2: type the readings. */
export default async function NewBatteryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'battery.inspect');

  const raw = await searchParams;
  const q = param(raw, 'q')?.slice(0, 60);
  const idRaw = param(raw, 'vehicle');
  const vehicleId = idRaw && /^\d{1,9}$/.test(idRaw) ? idRaw : null;

  const t = await getTranslations('admin.battery');
  const chosen = vehicleId ? await adminGet<AdminCustomerVehicle>(`/admin/customer-vehicles/${vehicleId}`, locale) : null;
  const found = !chosen && q ? await adminGet<LaravelPage<AdminCustomerVehicle>>(`/admin/customer-vehicles?q=${encodeURIComponent(q)}`, locale) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/battery" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{t('newTitle')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('newIntro')}</p>
      </div>

      {chosen ? (
        <>
          <Panel id="battery-car" title={t('car')}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold">{chosen.make} {chosen.model} {chosen.model_year ?? ''}</p>
                <p className="mt-1 text-sm text-awm-muted">
                  {chosen.owner ? <>{chosen.owner.name} · <span className="font-mono" dir="ltr">{chosen.owner.phone}</span></> : t('noOwner')}
                  {chosen.plate_number && <> · <span dir="ltr">{chosen.plate_number}</span></>}
                  {chosen.vin && <> · VIN <span className="font-mono" dir="ltr">{chosen.vin}</span></>}
                </p>
              </div>
              <Link href="/admin/battery/new" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('changeCar')}</Link>
            </div>
          </Panel>
          <Panel id="battery-form" title={t('readingsTitle')}>
            <BatteryForm vehicleId={chosen.id} defaultMileage={chosen.last_mileage_km} />
          </Panel>
        </>
      ) : (
        <Panel id="battery-find" title={t('findTitle')}>
          <form role="search" aria-label={t('findTitle')} action={`/${locale}/admin/battery/new`} className="mb-6 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="car-q" className="text-xs font-bold">{t('findLabel')}</label>
              <input id="car-q" name="q" defaultValue={q} maxLength={60} className="h-10 w-72 max-w-full border border-awm-line bg-white px-3 text-sm" />
            </div>
            <button type="submit" className="h-10 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('findButton')}</button>
          </form>

          {found && found.data.length > 0 && (
            <ul className="flex flex-col gap-2">
              {found.data.map((v) => (
                <li key={v.id}>
                  <Link href={{ pathname: '/admin/battery/new', query: toQuery({ vehicle: v.id }) }} className="flex flex-wrap items-center justify-between gap-3 border border-awm-line bg-white p-4 hover:border-awm-black">
                    <span>
                      <span className="block font-bold">{v.make} {v.model} {v.model_year ?? ''}</span>
                      <span className="block text-sm text-awm-muted">{v.owner?.name ?? t('noOwner')}{v.owner?.phone ? ' · ' : ''}<span className="font-mono" dir="ltr">{v.owner?.phone}</span>{v.plate_number ? ' · ' : ''}<span dir="ltr">{v.plate_number}</span></span>
                    </span>
                    <span className="text-sm font-bold text-awm-red">{t('choose')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {found && found.data.length === 0 && <EmptyNote>{t('noMatch')}</EmptyNote>}
          {!found && !q && <p className="text-sm text-awm-muted">{t('findHint')}</p>}
        </Panel>
      )}
    </div>
  );
}