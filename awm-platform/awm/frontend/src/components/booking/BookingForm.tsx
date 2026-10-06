'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { shopFetch } from '@/lib/api/shop';
import { addDays, damascusToday, dayParts, formatLongDate, formatTime } from '@/lib/booking-dates';

export const SERVICE_TYPES = ['maintenance', 'repair', 'diagnostics', 'warranty', 'inspection', 'battery_check'] as const;
const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;
const DAYS_SHOWN = 14;

type Slot = { starts_at: string; available: number };
type Booked = { number: string; starts_at: string; status: string };
export type OwnedCar = { id: number; label: string };

const card = (active: boolean) => `flex cursor-pointer flex-col gap-1 border-2 p-4 text-start ${active ? 'border-awm-red bg-awm-panel' : 'border-awm-line bg-white hover:border-awm-black'}`;
const legend = 'flex items-center gap-3 px-2 text-lg font-extrabold';
const box = 'flex min-w-0 flex-col gap-5 border border-awm-line bg-white p-6';

type Props = { cars: OwnedCar[]; signedIn: boolean; initialService?: string };

export function BookingForm({ cars, signedIn, initialService }: Props) {
  const t = useTranslations('booking');
  const locale = useLocale();

  const [service, setService] = useState<string>(SERVICE_TYPES.find((s) => s === initialService) ?? '');
  const [branch, setBranch] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[] | 'loading' | 'error' | null>(null);
  const [slot, setSlot] = useState('');
  const [reload, setReload] = useState(0);
  const [carId, setCarId] = useState<string>(cars.length > 0 ? String(cars[0].id) : 'other');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  // The strip starts from today in Damascus. Computed after mount so server and browser markup agree.
  const [days, setDays] = useState<string[]>([]);
  useEffect(() => {
    const today = damascusToday();
    setDays(Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)));
  }, []);

  // Load the slots for the chosen branch and day; ignore answers that arrive after the choice changed.
  useEffect(() => {
    setSlot('');
    if (!branch || !date) return setSlots(null);
    let current = true;
    setSlots('loading');
    shopFetch<{ slots: Slot[] }>(`appointments/slots?branch=${branch}&date=${date}`, { locale })
      .then((r) => current && setSlots(r.slots))
      .catch(() => current && setSlots('error'));
    return () => {
      current = false;
    };
  }, [branch, date, locale, reload]);

  const selectedCar = cars.find((c) => String(c.id) === carId);
  const summary = useMemo(
    () => [
      [t('summaryService'), service ? t(`services.${service}.title`) : null],
      [t('summaryBranch'), branch ? t(`branches.${branch}.title`) : null],
      [t('summaryWhen'), slot ? `${formatLongDate(date, locale)}، ${formatTime(slot, locale)}` : null],
      [t('summaryVehicle'), signedIn && selectedCar ? selectedCar.label : null],
    ],
    [t, service, branch, slot, date, locale, signedIn, selectedCar],
  );

  // Drop a field's error as soon as the customer fixes it.
  const clear = (key: string) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? '').trim();
    const next: Record<string, string> = {};

    if (!service) next.service = t('errors.service');
    if (!branch) next.branch = t('errors.branch');
    if (!slot) next.slot = t('errors.slot');
    if (!signedIn) {
      if (!get('contact_name')) next.contact_name = t('errors.name');
      if (!/^\+?[0-9 ]{7,20}$/.test(get('contact_phone'))) next.contact_phone = t('errors.phone');
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    const useOwned = signedIn && cars.length > 0 && carId !== 'other';
    const body = {
      branch,
      service_type: service,
      starts_at: slot,
      ...(useOwned ? { customer_vehicle_id: Number(carId) } : get('vehicle_description') ? { vehicle_description: get('vehicle_description') } : {}),
      ...(!signedIn ? { contact_name: get('contact_name'), contact_phone: get('contact_phone') } : {}),
      ...(get('customer_notes') ? { customer_notes: get('customer_notes') } : {}),
    };

    setPending(true);
    try {
      setBooked(await shopFetch<Booked>('appointments', { method: 'POST', locale, json: body }));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 422 && error.errors) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(error.errors)) mapped[key] = messages[0];
          setErrors(mapped);
        } else if (error.status === 429) setFormError(t('errors.tooMany'));
        else if (error.code && t.has(`errors.codes.${error.code}`)) {
          setFormError(t(`errors.codes.${error.code}`));
          // The slot list is stale if someone just took it.
          if (error.code === 'slot_full' || error.code === 'slot_invalid') setReload((n) => n + 1);
        } else setFormError(t('errors.generic'));
      } else setFormError(t('errors.generic'));
    }
    setPending(false);
  }

  if (booked) {
    return (
      <section aria-labelledby="done-title" role="status" className="flex flex-col gap-6 border border-awm-line bg-white p-8">
        <h2 id="done-title" className="text-2xl font-extrabold">{t('done.title')}</h2>
        <p className="text-awm-muted">{t('done.text')}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="border border-awm-line p-4"><dt className="text-xs text-awm-muted">{t('done.number')}</dt><dd className="mt-1 font-mono font-bold" dir="ltr">{booked.number}</dd></div>
          <div className="border border-awm-line p-4"><dt className="text-xs text-awm-muted">{t('done.status')}</dt><dd className="mt-1 font-bold">{t('done.pending')}</dd></div>
          {summary.filter(([, v]) => v).map(([label, value]) => (
            <div key={String(label)} className="border border-awm-line p-4"><dt className="text-xs text-awm-muted">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-3">
          {signedIn && <Link href="/account/appointments" className={buttonClasses('dark', 'md')}>{t('done.myAppointments')}</Link>}
          <button type="button" onClick={() => { setBooked(null); setSlot(''); setDate(''); }} className={buttonClasses('outline', 'md')}>{t('done.another')}</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="flex min-w-0 flex-col gap-8">
        <fieldset className={box}>
          <legend className={legend}><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('stepService')}</legend>
          <div role="radiogroup" aria-label={t('stepService')} className="grid gap-3 sm:grid-cols-2">
            {SERVICE_TYPES.map((s) => (
              <label key={s} className={card(service === s)}>
                <input type="radio" name="service" value={s} checked={service === s} onChange={() => { setService(s); clear('service'); }} className="sr-only" />
                <span className="font-extrabold">{t(`services.${s}.title`)}</span>
                <span className="text-sm text-awm-muted">{t(`services.${s}.text`)}</span>
              </label>
            ))}
          </div>
          {errors.service && <p role="alert" className="text-sm font-medium text-awm-red">{errors.service}</p>}
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('stepBranch')}</legend>
          <div role="radiogroup" aria-label={t('stepBranch')} className="grid gap-3 sm:grid-cols-2">
            {BRANCHES.map((b) => (
              <label key={b} className={card(branch === b)}>
                <input type="radio" name="branch" value={b} checked={branch === b} onChange={() => { setBranch(b); clear('branch'); }} className="sr-only" />
                <span className="font-extrabold">{t(`branches.${b}.title`)}</span>
                <span className="text-sm text-awm-muted">{t(`branches.${b}.text`)}</span>
              </label>
            ))}
          </div>
          {errors.branch && <p role="alert" className="text-sm font-medium text-awm-red">{errors.branch}</p>}
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('stepTime')}</legend>
          {!branch ? (
            <p className="text-sm text-awm-muted">{t('pickBranchFirst')}</p>
          ) : (
            <>
              <div role="group" aria-label={t('pickDay')} className="flex gap-2 overflow-x-auto pb-2">
                {days.map((d) => {
                  const p = dayParts(d, locale);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDate(d)}
                      aria-pressed={date === d}
                      aria-label={formatLongDate(d, locale)}
                      className={`flex w-20 shrink-0 flex-col items-center border-2 px-2 py-3 ${date === d ? 'border-awm-red bg-awm-red text-white' : 'border-awm-line bg-white hover:border-awm-black'}`}
                    >
                      <span className="text-xs">{p.weekday}</span>
                      <span className="font-mono text-2xl font-extrabold tabular-nums">{p.day}</span>
                      <span className="text-xs">{p.month}</span>
                    </button>
                  );
                })}
              </div>

              <div aria-live="polite" className="min-h-12">
                {!date && <p className="text-sm text-awm-muted">{t('pickDay')}</p>}
                {slots === 'loading' && <p className="text-sm text-awm-muted">{t('slotsLoading')}</p>}
                {slots === 'error' && <p className="text-sm font-medium text-awm-red">{t('slotsError')}</p>}
                {Array.isArray(slots) && slots.length === 0 && <p className="text-sm text-awm-muted">{t('slotsEmpty')}</p>}
                {Array.isArray(slots) && slots.length > 0 && (
                  <div role="group" aria-label={t('pickTime')} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => {
                      const full = s.available < 1;
                      return (
                        <button
                          key={s.starts_at}
                          type="button"
                          disabled={full}
                          onClick={() => { setSlot(s.starts_at); clear('slot'); }}
                          aria-pressed={slot === s.starts_at}
                          className={`flex flex-col items-center border-2 px-2 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${slot === s.starts_at ? 'border-awm-red bg-awm-red text-white' : 'border-awm-line bg-white hover:border-awm-black'}`}
                        >
                          <span className="font-mono tabular-nums">{formatTime(s.starts_at, locale)}</span>
                          <span className="text-xs font-normal">{full ? t('slotFull') : t('slotsLeft', { count: s.available })}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
          {errors.slot && <p role="alert" className="text-sm font-medium text-awm-red">{errors.slot}</p>}
        </fieldset>

        <fieldset className={box}>
          <legend className={legend}><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('stepVehicle')}</legend>
          {signedIn && cars.length > 0 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="car" className="text-sm font-bold">{t('vehicleOwned')}</label>
              <select id="car" value={carId} onChange={(e) => setCarId(e.target.value)} className="h-12 w-full border border-awm-line bg-white px-4 text-base">
                {cars.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                <option value="other">{t('vehicleOther')}</option>
              </select>
            </div>
          )}
          {(!signedIn || cars.length === 0 || carId === 'other') && (
            <TextField name="vehicle_description" label={t('vehicleDescription')} hint={t('vehicleDescriptionHint')} tag={t('optional')} maxLength={120} error={errors.vehicle_description} />
          )}
          {!signedIn && <p className="text-sm text-awm-muted">{t('loginHint')}</p>}
        </fieldset>

        {!signedIn && (
          <fieldset className={box}>
            <legend className={legend}><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('stepContact')}</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField name="contact_name" label={t('name')} error={errors.contact_name} autoComplete="name" required />
              <TextField name="contact_phone" type="tel" label={t('phone')} hint={t('phoneHint')} error={errors.contact_phone} autoComplete="tel" inputMode="tel" dir="ltr" className="text-start" required />
            </div>
          </fieldset>
        )}

        <div className={box}>
          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="flex items-center justify-between text-sm font-bold">{t('notes')}<span className="text-xs font-medium text-awm-muted">{t('optional')}</span></label>
            <textarea id="notes" name="customer_notes" rows={4} maxLength={1000} aria-describedby="notes-hint" className="w-full border border-awm-line bg-white p-4 text-base focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-awm-red" />
            <p id="notes-hint" className="text-xs text-awm-muted">{t('notesHint')}</p>
          </div>
        </div>
      </div>

      <aside aria-labelledby="booking-summary" className="h-fit border border-awm-line bg-white lg:sticky lg:top-6">
        <h2 id="booking-summary" className="flex items-center gap-3 border-b border-awm-line px-5 py-4 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('summary')}</h2>
        <dl className="flex flex-col gap-4 p-5">
          {summary.map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-awm-muted">{label}</dt>
              <dd className={`mt-1 text-sm ${value ? 'font-bold' : 'text-awm-muted'}`}>{value ?? t('summaryEmpty')}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-4 border-t border-awm-line p-5">
          {formError && <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-3 text-sm font-medium">{formError}</p>}
          <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg', 'w-full')}>{pending ? t('submitting') : t('submit')}</button>
        </div>
      </aside>
    </form>
  );
}
