import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AdminNav, type NavItem } from '@/components/admin/AdminNav';
import { LocaleSwitch, LogoutButton } from '@/components/admin/SessionControls';
import { Brand } from '@/components/site/Brand';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/primitives';
import { can, getMe } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Sidebar entries from the designs; `ready: false` = screen not built yet. */
const NAV: (NavItem & { permission: string | string[] })[] = [
  { key: 'overview', href: '/admin', icon: 'grid', permission: 'dashboard.view', ready: true },
  { key: 'jobCards', href: '/admin/job-cards', icon: 'wrench', permission: ['job_cards.manage', 'job_cards.work'], ready: false },
  { key: 'vehicles', href: '/admin/vehicles', icon: 'car', permission: 'vehicles.manage', ready: true },
  { key: 'parts', href: '/admin/parts', icon: 'box', permission: ['parts.manage', 'stock.adjust'], ready: true },
  { key: 'pdi', href: '/admin/pdi', icon: 'radar', permission: 'pdi.manage', ready: false },
  { key: 'billing', href: '/admin/invoices', icon: 'receipt', permission: 'invoices.manage', ready: true },
  { key: 'seo', href: '/admin/seo', icon: 'globe', permission: 'seo.manage', ready: true },
];

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getMe();
  if (!me) redirect(`/${locale}/login?next=/${locale}/admin`);
  if (me.roles.length === 0) redirect(`/${locale}/account`);

  const t = await getTranslations('admin');
  const items = NAV.filter((n) => [n.permission].flat().some((p) => can(me, p)));

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-e border-awm-line lg:flex">
        <div className="border-b border-awm-line p-5">
          <Brand name={t('brandName')} tagline={t('brandTagline')} href="/admin" />
        </div>
        <p className="bg-awm-surface px-5 py-2 text-xs font-bold text-awm-muted">{t('portal')}</p>
        <nav className="flex-1 overflow-y-auto py-2" aria-label={t('portal')}>
          <AdminNav items={items} />
        </nav>
        <div className="flex flex-col gap-3 border-t border-awm-line p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center border border-awm-black"><Icon name="user" /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-bold">{me.name}</span>
              <span className="text-xs text-awm-muted">{me.roles.map((r) => t(`roles.${r}`)).join(' · ')}</span>
            </span>
            <LocaleSwitch />
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-awm-line bg-white px-4 py-3 lg:px-6">
          {/* Mobile: compact nav replaces the sidebar */}
          <details className="relative lg:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 border border-awm-black px-3 text-sm font-bold">
              <Icon name="grid" size={16} />{t('menu')}
            </summary>
            <div className="absolute start-0 top-12 z-40 w-72 border border-awm-black bg-white">
              <AdminNav items={items} />
              <div className="flex items-center gap-2 border-t border-awm-line p-3"><LocaleSwitch /><LogoutButton /></div>
            </div>
          </details>

          <form action={`/${locale}/admin/vehicles`} className="flex min-w-0 flex-1 items-center border border-awm-line focus-within:border-awm-black lg:max-w-md" role="search">
            <Icon name="search" className="ms-3 text-awm-muted" />
            <input name="q" type="search" placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm focus:outline-none" />
          </form>

          {can(me, 'vehicles.manage') && (
            <ButtonLink href="/admin/vehicles/new" size="sm" icon="plus" className="ms-auto">{t('vehicles.add')}</ButtonLink>
          )}
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
