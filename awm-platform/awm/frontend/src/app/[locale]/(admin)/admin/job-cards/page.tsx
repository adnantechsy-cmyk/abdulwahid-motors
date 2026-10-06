import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JobCardCard } from '@/components/admin/JobCardCard';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { oneOf, param, toQuery } from '@/lib/listing';
import type { AdminJobCard, JobCardStatusCode, Technician } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUMNS: JobCardStatusCode[] = ['pending', 'in_progress', 'waiting_parts', 'completed'];
const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;

/** Workshop board. Plain buttons move cards (no drag and drop), so it works by keyboard and on phones. */
export default async function JobCardsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'job_cards.work', 'job_cards.manage');

  const raw = await searchParams;
  const branch = oneOf(param(raw, 'branch'), BRANCHES);
  const mine = param(raw, 'mine') === '1';

  const [t, ta, board] = await Promise.all([
    getTranslations('admin.jobCards'),
    getTranslations('admin'),
    adminGet<{ data: AdminJobCard[]; can_assign: boolean }>(`/admin/job-cards${toQueryString({ branch, mine: mine ? '1' : undefined })}`, locale),
  ]);
  const technicians = board?.can_assign ? await adminGet<Technician[]>('/admin/technicians', locale) : null;

  const cards = board?.data ?? [];
  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const href = (next: { branch?: string; mine?: boolean }) => ({ pathname: '/admin/job-cards' as const, query: toQuery({ branch: 'branch' in next ? next.branch : branch, mine: 'mine' in next ? next.mine : mine }) });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <nav aria-label={t('filters')} className="flex flex-wrap items-center gap-2">
        <Link href={href({ branch: undefined })} aria-current={!branch ? 'true' : undefined} className={chip(!branch)}>{t('allBranches')}</Link>
        {BRANCHES.map((b) => (
          <Link key={b} href={href({ branch: b })} aria-current={branch === b ? 'true' : undefined} className={chip(branch === b)}>{ta(`branch.${b}`)}</Link>
        ))}
        <Link href={href({ mine: !mine })} aria-current={mine ? 'true' : undefined} className={`${chip(mine)} ms-auto`}>{t('mine')}</Link>
      </nav>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {COLUMNS.map((code) => {
          const column = cards.filter((c) => c.status.code === code);
          return (
            <section key={code} aria-labelledby={`col-${code}`} className="flex min-w-0 flex-col gap-3 bg-awm-surface p-3">
              <h2 id={`col-${code}`} className="flex items-center justify-between px-1 text-sm font-extrabold">
                {t(`columns.${code}`)}
                <span className="min-w-7 bg-awm-black px-2 py-0.5 text-center font-mono text-xs text-white">{column.length}</span>
              </h2>
              {column.length === 0 ? (
                <p className="px-1 py-4 text-sm text-awm-muted">{t('emptyColumn')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {column.map((c) => <li key={c.id}><JobCardCard card={c} technicians={technicians} /></li>)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function toQueryString(values: Record<string, string | undefined>): string {
  const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `?${q}` : '';
}
