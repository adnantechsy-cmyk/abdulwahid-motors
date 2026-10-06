import type { ComponentProps, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Icon, type IconName } from './Icon';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const BUTTON = {
  primary: 'bg-awm-red text-white hover:bg-awm-black',
  dark: 'bg-awm-black text-white hover:bg-awm-red',
  outline: 'border-2 border-awm-black text-awm-black hover:bg-awm-black hover:text-white',
  ghost: 'text-awm-black hover:bg-awm-surface',
  danger: 'border-2 border-awm-red text-awm-red hover:bg-awm-red hover:text-white',
} as const;
const SIZE = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-14 px-6 text-base' } as const;

type Variant = keyof typeof BUTTON;
type Size = keyof typeof SIZE;
const btn = (v: Variant, s: Size, extra?: string) =>
  cx('inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40', BUTTON[v], SIZE[s], extra);

export function Button({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ComponentProps<'button'> & { variant?: Variant; size?: Size; icon?: IconName }) {
  return (
    <button type="button" className={btn(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: IconName }) {
  return (
    <Link className={btn(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </Link>
  );
}

/** KPI tile from the admin designs: label, big mono figure, footnote under a rule. */
export function Kpi({ label, value, unit, foot, icon, tone = 'default' }: {
  label: string; value: ReactNode; unit?: string; foot?: ReactNode; icon?: IconName; tone?: 'default' | 'red';
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 bg-white p-5">
      <div className="flex items-start justify-between gap-2 text-sm text-awm-muted">
        <span>{label}</span>
        {icon && <Icon name={icon} className={tone === 'red' ? 'text-awm-red' : 'text-awm-black'} />}
      </div>
      <p className={cx('font-mono text-4xl font-bold leading-none tracking-tight', tone === 'red' && 'text-awm-red')}>
        {value}
        {unit && <span className="ms-2 font-sans text-sm font-medium text-awm-muted">{unit}</span>}
      </p>
      {foot && <div className="mt-auto border-t border-awm-line pt-3 text-xs text-awm-muted">{foot}</div>}
    </div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-px border border-awm-line bg-awm-line lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}

const BADGE = {
  red: 'bg-awm-red text-white',
  dark: 'bg-awm-black text-white',
  muted: 'bg-awm-surface text-awm-black',
  ok: 'bg-awm-ok/10 text-awm-ok',
  outlineRed: 'border border-awm-red text-awm-red',
} as const;

export function Badge({ tone = 'muted', children, className }: { tone?: keyof typeof BADGE; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center px-2 py-0.5 text-xs font-bold', BADGE[tone], className)}>{children}</span>;
}

/** Filter tabs as links: the selected state lives in the URL, so lists stay shareable and server-rendered. */
export function TabLinks({ tabs }: { tabs: { href: ComponentProps<typeof Link>['href']; label: ReactNode; active: boolean }[] }) {
  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Filters">
      {tabs.map((t, i) => (
        <Link key={i} href={t.href} aria-current={t.active ? 'page' : undefined}
          className={cx('shrink-0 border px-3 py-2 text-sm font-bold', t.active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="marker-square text-lg font-extrabold">{children}</h2>
      {aside}
    </div>
  );
}

export function PageHeader({ eyebrow, title, actions, badge }: { eyebrow?: string; title: string; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-awm-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        {eyebrow && <p className="text-xs text-awm-muted">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold leading-tight lg:text-4xl">{title}</h1>
          {badge}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const FIELD = 'h-11 w-full border border-awm-line bg-white px-3 text-sm focus:border-awm-black focus:outline-none disabled:bg-awm-surface';

export function Field({ label, hint, error, children, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="flex items-baseline justify-between gap-2 text-xs font-bold text-awm-muted">
        <span>{label}</span>
        {hint && <span className="font-medium">{hint}</span>}
      </span>
      {children}
      {error && <span role="alert" className="text-xs font-medium text-awm-red">{error}</span>}
    </label>
  );
}

export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input className={cx(FIELD, className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<'select'>) => <select className={cx(FIELD, 'pe-8', className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<'textarea'>) => <textarea className={cx(FIELD, 'h-auto min-h-24 py-2', className)} {...p} />;

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border border-dashed border-awm-line p-8">
      <p className="text-base">{title}</p>
      {action}
    </div>
  );
}

export function Pagination({ current, last, hrefFor, labels }: { current: number; last: number; hrefFor: (p: number) => ComponentProps<typeof Link>['href']; labels: { prev: string; next: string } }) {
  if (last <= 1) return null;
  const pages = Array.from(new Set([1, current - 1, current, current + 1, last])).filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      {current > 1 && <Link href={hrefFor(current - 1)} className="border border-awm-line px-3 py-2 text-sm hover:border-awm-black">{labels.prev}</Link>}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-awm-muted">…</span>}
          <Link href={hrefFor(p)} aria-current={p === current ? 'page' : undefined}
            className={cx('min-w-10 border px-3 py-2 text-center font-mono text-sm', p === current ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line hover:border-awm-black')}>
            {p}
          </Link>
        </span>
      ))}
      {current < last && <Link href={hrefFor(current + 1)} className="border border-awm-line px-3 py-2 text-sm hover:border-awm-black">{labels.next}</Link>}
    </nav>
  );
}
