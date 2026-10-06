'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { TextField } from '@/components/ui/Field';
import { buttonClasses } from '@/components/ui/Button';
import { ApiError, setCartToken } from '@/lib/api/client';
import { syncCart } from '@/lib/api/cart';
import { shopFetch } from '@/lib/api/shop';
import { saveSession, type PlacedOrder } from '@/lib/checkout-session';
import { useCartStore } from '@/store/cartStore';
import { OrderSummary } from './OrderSummary';

const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;
type Receive = 'pickup' | 'delivery';

/** Wait for the persisted cart to load from localStorage (CartHydrator does it after first paint). */
function useCartReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) setReady(true);
    return useCartStore.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}

const field =
  'h-12 w-full border border-awm-line bg-white px-4 text-base focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-awm-red';

export function CheckoutForm() {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const router = useRouter();
  const ready = useCartReady();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const [sync, setSync] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [dropped, setDropped] = useState(0);
  const [receive, setReceive] = useState<Receive>('pickup');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [profile, setProfile] = useState<{ name?: string; phone?: string; email?: string }>({});
  const synced = useRef(false);

  const hasParts = items.some((i) => i.type === 'spare_part');
  const hasVehicle = items.some((i) => i.type === 'vehicle_reservation');
  const needsReceiving = hasParts || hasVehicle;

  // Re-price against Laravel once, as soon as the stored cart is available.
  async function runSync() {
    setSync('syncing');
    try {
      const server = await syncCart(locale);
      setDropped(server.dropped.length);
      setSync('ok');
    } catch {
      setSync('error');
    }
  }
  useEffect(() => {
    if (!ready || synced.current || useCartStore.getState().items.length === 0) return;
    synced.current = true;
    void runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Signed-in customers get their details prefilled (still editable).
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user && setProfile({ name: d.user.name, phone: d.user.phone ?? undefined, email: d.user.email ?? undefined }))
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (k: string) => String(form.get(k) ?? '').trim();
    const next: Record<string, string> = {};

    const name = get('name');
    const phone = get('phone');
    const email = get('email');
    const branch = get('branch');
    if (!name) next.name = t('errors.required');
    if (!/^\+?[0-9 ]{7,20}$/.test(phone)) next.phone = t('errors.phone');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = t('errors.email');
    if ((hasVehicle || (hasParts && receive === 'pickup')) && !branch) next.branch = t('errors.branch');
    if (hasParts && receive === 'delivery' && !get('city')) next.city = t('errors.required');
    if (hasParts && receive === 'delivery' && !get('address')) next.address = t('errors.required');
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      // The server re-prices from the database; make sure its cart matches what the customer is looking at.
      const server = await syncCart(locale);
      if (server.dropped.length > 0 || server.items.length === 0) {
        setDropped(server.dropped.length);
        setFormError(t('errors.cartChanged'));
        setPending(false);
        return;
      }

      const body = {
        customer: { name, phone, ...(email ? { email } : {}) },
        ...(branch ? { branch_pickup: branch } : {}),
        ...(hasParts && receive === 'delivery' ? { shipping_address: { city: get('city'), address: get('address'), notes: get('notes') } } : {}),
      };
      const { orders } = await shopFetch<{ orders: PlacedOrder[] }>('checkout', { method: 'POST', locale, json: body });

      saveSession({ phone, orders });
      clearCart();
      setCartToken(null); // Laravel closed that cart: the next purchase starts a fresh one
      router.push(`/checkout/pay/${orders[0].number}`);
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError) {
        if (error.status === 422 && error.errors) {
          const mapped: Record<string, string> = {};
          for (const [key, messages] of Object.entries(error.errors)) mapped[key.replace(/^customer\./, '')] = messages[0];
          setErrors(mapped);
          return;
        }
        if (error.status === 429) return setFormError(t('errors.tooMany'));
        if (error.code && t.has(`errors.codes.${error.code}`)) return setFormError(t(`errors.codes.${error.code}`));
      }
      setFormError(t('errors.generic'));
    }
  }

  if (!ready) return <p className="text-awm-muted" role="status">{t('loading')}</p>;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border border-dashed border-awm-line bg-white p-8">
        <p className="text-lg">{t('empty')}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/vehicles" className={buttonClasses('dark', 'md')}>{t('browseCars')}</Link>
          <Link href="/parts" className={buttonClasses('outline', 'md')}>{t('browseParts')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr]">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        {sync === 'error' && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">
            {t('syncFailed')}
            <button type="button" onClick={runSync} className="font-bold text-awm-red underline underline-offset-4">{t('retry')}</button>
          </div>
        )}
        {dropped > 0 && (
          <p role="status" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">{t('dropped', { count: dropped })}</p>
        )}

        {needsReceiving && (
          <fieldset className="flex min-w-0 flex-col gap-5 border border-awm-line bg-white p-6">
            <legend className="flex items-center gap-3 px-2 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('delivery.title')}</legend>

            {hasParts && (
              <div role="radiogroup" aria-label={t('delivery.partsMethod')} className="grid gap-3 sm:grid-cols-2">
                {(['pickup', 'delivery'] as const).map((m) => (
                  <label key={m} className={`flex cursor-pointer items-center gap-3 border-2 p-4 text-sm font-bold ${receive === m ? 'border-awm-red bg-awm-panel' : 'border-awm-line'}`}>
                    <input type="radio" name="receive" value={m} checked={receive === m} onChange={() => setReceive(m)} className="size-5 accent-awm-red" />
                    {t(`delivery.${m}`)}
                  </label>
                ))}
              </div>
            )}

            {(hasVehicle || receive === 'pickup') && (
              <div className="flex flex-col gap-2">
                <label htmlFor="branch" className="text-sm font-bold">{t('delivery.branchLabel')}</label>
                <select
                  id="branch"
                  name="branch"
                  defaultValue=""
                  aria-invalid={errors.branch ? true : undefined}
                  aria-describedby={errors.branch ? 'branch-error' : undefined}
                  className={`${field} ${errors.branch ? 'border-awm-red' : ''}`}
                >
                  <option value="">{t('delivery.branchPlaceholder')}</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{t(`branches.${b}`)}</option>)}
                </select>
                {errors.branch && <p id="branch-error" role="alert" className="text-sm font-medium text-awm-red">{errors.branch}</p>}
              </div>
            )}

            {hasParts && receive === 'delivery' && (
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField name="city" label={t('delivery.city')} error={errors.city} autoComplete="address-level2" />
                <TextField name="address" label={t('delivery.address')} error={errors.address} autoComplete="street-address" />
                <div className="sm:col-span-2"><TextField name="notes" label={t('delivery.notes')} tag={t('optional')} /></div>
              </div>
            )}
          </fieldset>
        )}

        <fieldset className="flex min-w-0 flex-col gap-5 border border-awm-line bg-white p-6">
          <legend className="flex items-center gap-3 px-2 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('customer.title')}</legend>
          <TextField key={`n-${profile.name ?? ''}`} name="name" label={t('customer.name')} defaultValue={profile.name} error={errors.name} autoComplete="name" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              key={`p-${profile.phone ?? ''}`}
              name="phone"
              type="tel"
              label={t('customer.phone')}
              hint={t('customer.phoneHint')}
              defaultValue={profile.phone}
              error={errors.phone}
              autoComplete="tel"
              inputMode="tel"
              dir="ltr"
              className="text-start"
              required
            />
            <TextField
              key={`e-${profile.email ?? ''}`}
              name="email"
              type="email"
              label={t('customer.email')}
              tag={t('optional')}
              defaultValue={profile.email}
              error={errors.email}
              autoComplete="email"
              dir="ltr"
              className="text-start"
            />
          </div>
        </fieldset>

        {formError && <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-4 text-sm font-medium">{formError}</p>}

        <button type="submit" disabled={pending || sync === 'syncing'} className={buttonClasses('primary', 'lg', 'w-full')}>
          {pending ? t('submitting') : t('submit')}
        </button>
      </form>

      <OrderSummary />
    </div>
  );
}
