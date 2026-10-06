import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RevokeCertificate } from '@/components/admin/RevokeCertificate';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { StatusPill } from '@/components/account/StatusPill';
import { Pagination } from '@/components/catalog/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDate } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import type { LaravelPage } from '@/types/account';
import type { AdminBatteryReport } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const RESULTS = ['pass', 'attention', 'fail'] as const;

export default async function BatteryListPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'battery.inspect');

  const raw = await searchParams;
  const result = oneOf(param(raw, 'result'), RESULTS);
  const page = pageParam(raw);

  const query = new URLSearchParams({ page: String(page), ...(result ? { result } : {}) });
  const [t, list] = await Promise.all([getTranslations('admin.battery'), adminGet<LaravelPage<AdminBatteryReport>>(`/admin/battery-inspections?${query}`, locale)]);

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('title')}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
        </div>
        <ButtonLink href="/admin/battery/new" variant="primary" size="md">{t('issueNew')}</ButtonLink>
      </div>

      <nav aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        <Link href="/admin/battery" aria-current={!result ? 'true' : undefined} className={chip(!result)}>{t('all')}</Link>
        {RESULTS.map((r) => <Link key={r} href={{ pathname: '/admin/battery', query: toQuery({ result: r }) }} aria-current={result === r ? 'true' : undefined} className={chip(result === r)}>{t(`results.${r}`)}</Link>)}
      </nav>

      <Panel id="battery-list" title={t('listTitle')}>
        {list && list.data.length > 0 ? (
          <>
            <TableScroll label={t('listTitle')}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={th}>{t('cols.certificate')}</th>
                    <th scope="col" className={th}>{t('cols.car')}</th>
                    <th scope="col" className={th}>{t('cols.owner')}</th>
                    <th scope="col" className={th}>{t('cols.soh')}</th>
                    <th scope="col" className={th}>{t('cols.inspected')}</th>
                    <th scope="col" className={th}>{t('cols.status')}</th>
                    <th scope="col" className={th}>{t('cols.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((r) => (
                    <tr key={r.id} className="align-top">
                      <th scope="row" className={`${td} text-start`}>
                        <Link href={`/certificates/${r.verification_code}`} className="font-mono font-bold text-awm-red underline underline-offset-4" dir="ltr">{r.certificate_number}</Link>
                      </th>
                      <td className={td}>
                        {r.vehicle.make} {r.vehicle.model} {r.vehicle.model_year ?? ''}
                        {r.vehicle.vin && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{r.vehicle.vin}</span>}
                      </td>
                      <td className={td}>
                        <span className="block font-bold">{r.owner?.name ?? '—'}</span>
                        {r.owner?.phone && <span className="block font-mono text-xs text-awm-muted" dir="ltr">{r.owner.phone}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap font-mono font-bold tabular-nums`} dir="ltr">{Number(r.state_of_health_pct)}%</td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(r.inspected_at, locale)}{r.valid_until && <span className="block text-xs text-awm-muted">{t('validUntil', { date: formatDate(r.valid_until, locale) })}</span>}</td>
                      <td className={td}>
                        {r.is_revoked ? <StatusPill code="void" label={t('revoked')} /> : <StatusPill code={r.result.code} label={r.result.label} />}
                        {!r.is_revoked && !r.is_valid && <span className="mt-1 block text-xs text-awm-muted">{t('expired')}</span>}
                      </td>
                      <td className={td}>{r.is_revoked ? <span className="text-xs text-awm-muted">—</span> : <RevokeCertificate id={r.id} number={r.certificate_number} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/battery', query: toQuery({ result, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}