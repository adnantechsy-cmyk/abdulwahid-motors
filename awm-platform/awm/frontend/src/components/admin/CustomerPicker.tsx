import { getTranslations } from 'next-intl/server';
import { EmptyNote } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/api/admin';
import type { LaravelPage } from '@/types/account';
import type { AdminCustomer } from '@/types/admin';

type Props = {
  locale: string;
  /** Page path (without locale) the search form returns to, e.g. /admin/orders/AWM-1/link. */
  path: string;
  q: string | undefined;
  /** Extra query values kept on every link (e.g. the appointment number). */
  keep?: Record<string, string>;
  newCustomer: { name?: string | null; phone?: string | null };
};

/** Search customers by name, phone or email and pick one; no customer yet? open an account from here. */
export async function CustomerPicker({ locale, path, q, keep = {}, newCustomer }: Props) {
  const t = await getTranslations('admin.link');
  const found = q ? await adminGet<LaravelPage<AdminCustomer>>(`/admin/customers?q=${encodeURIComponent(q)}`, locale) : null;
  const newHref = { pathname: '/admin/customers/new' as const, query: { ...(newCustomer.name ? { name: newCustomer.name } : {}), ...(newCustomer.phone ? { phone: newCustomer.phone } : {}) } };

  return (
    <div className="flex flex-col gap-5">
      <form role="search" aria-label={t('searchTitle')} action={`/${locale}${path}`} className="flex flex-wrap items-end gap-2">
        {Object.entries(keep).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="flex flex-col gap-1">
          <label htmlFor="pick-q" className="text-xs font-bold">{t('searchLabel')}</label>
          <input id="pick-q" name="q" defaultValue={q} maxLength={60} className="h-10 w-72 max-w-full border border-awm-line bg-white px-3 text-sm" />
        </div>
        <button type="submit" className="h-10 border border-awm-black bg-awm-black px-4 text-sm font-bold text-white">{t('searchButton')}</button>
      </form>

      {found && found.data.length > 0 && (
        <ul className="flex flex-col gap-2">
          {found.data.map((c) => (
            <li key={c.id}>
              <Link href={{ pathname: path as '/admin/customers', query: { ...keep, q: q ?? '', customer: String(c.id) } }} className="flex flex-wrap items-center justify-between gap-3 border border-awm-line bg-white p-4 hover:border-awm-black">
                <span>
                  <span className="block font-bold">{c.name}</span>
                  <span className="block text-sm text-awm-muted"><span className="font-mono" dir="ltr">{c.phone}</span>{c.email ? ' · ' : ''}<span dir="ltr">{c.email}</span></span>
                </span>
                <span className="text-sm font-bold text-awm-red">{t('choose')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {found && found.data.length === 0 && <EmptyNote>{t('noMatch')}</EmptyNote>}
      {!q && <p className="text-sm text-awm-muted">{t('searchHint')}</p>}

      <p className="border-t border-awm-line pt-4 text-sm text-awm-muted">
        {t('noAccountYet')} <Link href={newHref} className="font-bold text-awm-red underline underline-offset-4">{t('openAccount')}</Link>
      </p>
    </div>
  );
}