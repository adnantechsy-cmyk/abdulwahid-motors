import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FileUpload } from '@/components/admin/FileUpload';
import { PartForm } from '@/components/admin/PartForm';
import { StockAdjust } from '@/components/admin/StockAdjust';
import { EmptyNote, Panel, TableScroll, td, th } from '@/components/account/Panel';
import { Link } from '@/i18n/navigation';
import { adminGet, can, requirePermission } from '@/lib/api/admin';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { AdminPartDetail, PartCategory, StockMovementRow } from '@/types/admin';

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function PartPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePermission(locale, 'parts.manage', 'stock.adjust');
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [t, part, categories, movements] = await Promise.all([
    getTranslations('admin.parts'),
    adminGet<AdminPartDetail>(`/admin/parts/${id}`, locale),
    adminGet<PartCategory[]>('/admin/part-categories', locale),
    adminGet<StockMovementRow[]>(`/admin/parts/${id}/movements`, locale),
  ]);
  if (!part) notFound();

  const n = (v: number) => formatNumber(v, locale);
  const signed = (v: number) => (v > 0 ? `+${n(v)}` : n(v));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/parts" className="text-sm font-bold text-awm-red underline underline-offset-4">{t('backToList')}</Link>
        <h1 className="mt-3 text-3xl font-extrabold">{part.display_name}</h1>
        <p className="mt-1 font-mono text-sm text-awm-muted"><bdi dir="ltr">{part.sku}</bdi></p>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-awm-line sm:grid-cols-4">
        {([['onHand', part.stock_quantity], ['reservedLabel', part.reserved_quantity], ['available', part.available_quantity], ['threshold', part.low_stock_threshold]] as const).map(([key, value]) => (
          <div key={key} className="bg-white p-4">
            <dt className="text-xs font-bold text-awm-muted">{t(`summary.${key}`)}</dt>
            <dd className="mt-1 font-mono text-3xl font-extrabold tabular-nums">{n(value)}</dd>
          </div>
        ))}
      </dl>

      {can(user, 'stock.adjust') && (
        <Panel id="part-stock" title={t('stock.title')}>
          <StockAdjust partId={part.id} />
        </Panel>
      )}

      {can(user, 'parts.manage') && (
        <Panel id="part-photo" title={t('photo.title')}>
          <FileUpload
            path={`parts/${part.id}/cover`}
            field="image"
            accept="image/jpeg,image/png,image/webp"
            maxMb={5}
            kind="image"
            label={t('photo.label')}
            hint={t('photo.hint')}
            currentUrl={part.cover_url}
          />
        </Panel>
      )}

      <Panel id="part-form" title={t('details')}>
        <PartForm part={part} categories={categories ?? []} canEdit={can(user, 'parts.manage')} />
      </Panel>

      <Panel id="part-movements" title={t('movements.title')}>
        {movements && movements.length > 0 ? (
          <TableScroll label={t('movements.title')}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={th}>{t('movements.when')}</th>
                  <th scope="col" className={th}>{t('movements.type')}</th>
                  <th scope="col" className={th}>{t('movements.change')}</th>
                  <th scope="col" className={th}>{t('movements.balance')}</th>
                  <th scope="col" className={th}>{t('movements.by')}</th>
                  <th scope="col" className={th}>{t('movements.note')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(m.created_at, locale)}</td>
                    <td className={td}>{t.has(`movements.types.${m.type}`) ? t(`movements.types.${m.type}`) : m.type}</td>
                    <td className={`${td} font-mono font-bold tabular-nums`} dir="ltr">{signed(m.change)}</td>
                    <td className={`${td} font-mono tabular-nums`}>{n(m.balance)}</td>
                    <td className={td}>{m.by ?? '—'}</td>
                    <td className={td}>{[m.reference, m.note].filter(Boolean).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <EmptyNote>{t('movements.empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
