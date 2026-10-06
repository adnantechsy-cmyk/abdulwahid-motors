'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { Link, useRouter } from '@/i18n/navigation';
import type { AdminCustomerCar } from '@/types/admin';
import { adminAction } from '@/lib/admin-client';

/** Pick which of the customer's cars the booking is for (or none) and link the booking to the customer. */
export function LinkAppointment({ appointmentId, customerId, customerName, cars }: { appointmentId: number; customerId: number; customerName: string; cars: AdminCustomerCar[] }) {
  const t = useTranslations('admin.link');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [car, setCar] = useState<string>(cars.length === 1 ? String(cars[0].id) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await adminAction('PUT', `appointments/${appointmentId}`, locale, { user_id: customerId, customer_vehicle_id: car ? Number(car) : null });
    if (r.ok) return router.push('/admin/appointments');
    setBusy(false);
    setError(r.status === 0 || r.status >= 500 ? ta('errors.unavailable') : r.message || ta('errors.generic'));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-bold">{t('whichCar', { name: customerName })}</legend>
        {cars.map((v) => (
          <label key={v.id} className="flex items-center gap-3 border border-awm-line bg-white p-3 text-sm has-[:checked]:border-awm-black">
            <input type="radio" name={`${id}-car`} value={v.id} checked={car === String(v.id)} onChange={() => setCar(String(v.id))} className="size-4 accent-awm-red" />
            <span><span className="font-bold">{v.make} {v.model} {v.model_year ?? ''}</span>{v.plate_number && <span className="ms-2 text-awm-muted" dir="ltr">{v.plate_number}</span>}</span>
          </label>
        ))}
        <label className="flex items-center gap-3 border border-awm-line bg-white p-3 text-sm has-[:checked]:border-awm-black">
          <input type="radio" name={`${id}-car`} value="" checked={car === ''} onChange={() => setCar('')} className="size-4 accent-awm-red" />
          <span>{t('noCar')}</span>
        </label>
        {cars.length === 0 && <p className="text-sm text-awm-muted">{t('noCarsYet')} <Link href={`/admin/customers/${customerId}`} className="font-bold text-awm-red underline underline-offset-4">{t('addCarFirst')}</Link></p>}
      </fieldset>
      <p className="text-xs text-awm-muted">{t('carHint')}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className={buttonClasses('primary', 'md')}>{busy ? ta('working') : t('linkAppointment')}</button>
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}