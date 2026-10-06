import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import { adminGetOrForbidden, can, getAdminUser, isStaff } from '@/lib/api/admin';
import { formatNumber } from '@/lib/format';
import type { AdminSummary } from '@/types/admin';

type Props = { params: Promise<{ locale: string }> };

export default async function AdminOverview({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [user, t] = await Promise.all([getAdminUser(locale), getTranslations('admin.overview')]);
  if (!isStaff(user)) return null; // the layout already showed the "staff only" page

  // Counters need dashboard.view; staff without it still get the section links, just no numbers.
  const summaryResult = can(user, 'dashboard.view') ? await adminGetOrForbidden<AdminSummary>('/admin/summary', locale) : 'forbidden';
  const s: AdminSummary = summaryResult === 'forbidden' ? {} : summaryResult;
  const n = (v: number) => formatNumber(v, locale);

  const open = s.job_cards ? s.job_cards.pending + s.job_cards.in_progress + s.job_cards.waiting_parts : null;

  const cards: { href: '/admin/payments' | '/admin/job-cards' | '/admin/appointments'; icon: IconName; title: string; hint?: string; lines: string[] }[] = [];
  if (can(user, 'payments.confirm')) {
    cards.push({ href: '/admin/payments', icon: 'check', title: t('payments.title'), hint: t('payments.hint'), lines: s.payments_awaiting != null ? [n(s.payments_awaiting)] : [] });
  }
  if (can(user, 'job_cards.work', 'job_cards.manage')) {
    cards.push({ href: '/admin/job-cards', icon: 'wrench', title: t('jobCards.title'), hint: t('jobCards.hint'), lines: open != null ? [t('jobCards.open', { count: n(open) })] : [] });
  }
  if (can(user, 'appointments.manage')) {
    cards.push({
      href: '/admin/appointments',
      icon: 'pin',
      title: t('appointments.title'),
      lines: [
        ...(s.appointments_requested != null ? [t('appointments.requested', { count: n(s.appointments_requested) })] : []),
        ...(s.appointments_today != null ? [t('appointments.today', { count: n(s.appointments_today) })] : []),
      ],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 text-awm-muted">{t('welcome', { name: user.name })}</p>
      </div>

      {cards.length === 0 ? (
        <p className="border border-dashed border-awm-line bg-white p-8 text-awm-muted">{t('none')}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="flex h-full flex-col gap-3 border border-awm-line bg-white p-6 hover:border-awm-black">
                <span className="flex size-11 items-center justify-center bg-awm-black text-white"><Icon name={c.icon} size={22} /></span>
                <h2 className="text-lg font-extrabold">{c.title}</h2>
                {c.lines.length > 0 && (
                  <p className="flex flex-col gap-1">
                    {c.lines.map((line, i) => <span key={line} className={i === 0 ? 'font-mono text-3xl font-extrabold tabular-nums' : 'text-sm text-awm-muted'}>{line}</span>)}
                  </p>
                )}
                {c.hint && <p className="text-sm text-awm-muted">{c.hint}</p>}
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-awm-red">{t('open')}<Icon name="arrow" size={16} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
