import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminLogout } from '@/components/admin/AdminLogout';
import { AdminNav, type AdminNavItem } from '@/components/admin/AdminNav';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { TwoFactorManager, type TwoFactorStatus } from '@/components/admin/TwoFactorManager';
import { adminGet, can, getAdminUser, isStaff } from '@/lib/api/admin';

export const metadata: Metadata = { title: { absolute: 'Admin | Abdul Wahid Motors' }, robots: { index: false, follow: false } };

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

/**
 * Staff shell. The session is required (no cookie or an expired one goes to login); a signed-in customer
 * sees a "staff only" page. Each section then checks its own permission, and Laravel checks every request.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [user, t, all] = await Promise.all([getAdminUser(locale), getTranslations('admin'), getMessages()]);
  // Admin screens are the only client components that need these messages, so they get their own provider.
  const messages = { admin: (all as { admin: unknown }).admin };

  if (!isStaff(user)) {
    return (
      <main className="container-awm py-16">
        <h1 className="text-3xl font-extrabold">{t('forbidden.title')}</h1>
        <p className="mb-8 mt-4 max-w-2xl text-lg leading-8 text-awm-muted">{t('forbidden.text')}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/account" variant="dark" size="md">{t('forbidden.account')}</ButtonLink>
          <ButtonLink href="/" variant="outline" size="md">{t('forbidden.site')}</ButtonLink>
        </div>
      </main>
    );
  }

  const items: AdminNavItem[] = [
    { href: '/admin', label: t('nav.overview') },
    ...(can(user, 'orders.manage') ? [{ href: '/admin/orders', label: t('nav.orders') }] : []),
    ...(can(user, 'payments.confirm') ? [{ href: '/admin/payments', label: t('nav.payments') }] : []),
    ...(can(user, 'vehicles.manage') ? [{ href: '/admin/vehicles', label: t('nav.vehicles') }] : []),
    ...(can(user, 'parts.manage', 'stock.adjust') ? [{ href: '/admin/parts', label: t('nav.parts') }] : []),
    ...(can(user, 'categories.manage') ? [{ href: '/admin/categories', label: t('nav.categories') }] : []),
    ...(can(user, 'job_cards.work', 'job_cards.manage') ? [{ href: '/admin/job-cards', label: t('nav.jobCards') }] : []),
    ...(can(user, 'appointments.manage') ? [{ href: '/admin/appointments', label: t('nav.appointments') }] : []),
    ...(can(user, 'customers.manage') ? [{ href: '/admin/customers', label: t('nav.customers') }, { href: '/admin/messages', label: t('nav.messages') }] : []),
    ...(can(user, 'pdi.manage') ? [{ href: '/admin/delivery', label: t('nav.delivery') }] : []),
    ...(can(user, 'battery.inspect') ? [{ href: '/admin/battery', label: t('nav.battery') }] : []),
    { href: '/admin/security', label: t('nav.security') },
  ];

  // Staff who must still set up their authenticator app see only that, until it is done (Laravel enforces it too).
  const mustSetUp = Boolean(user.two_factor?.setup_required);
  const gate = mustSetUp ? await adminGet<TwoFactorStatus>('/admin/security/2fa', locale) : null;
  const ts = await getTranslations('admin.security');

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen bg-awm-bg">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-awm-line bg-white px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <img src="/brand/logo-mark.svg" alt="" width={64} height={20} className="h-5 w-16" />
            <span className="text-base font-extrabold">{t('title')}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-awm-muted">{t('signedInAs', { name: user.name })}</span>
            <Link href="/" className="font-bold text-awm-red underline underline-offset-4">{t('viewSite')}</Link>
            <AdminLogout />
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[14rem_1fr]">
          <aside className="lg:border-e lg:border-awm-line lg:bg-white lg:pt-6">
            {!mustSetUp && <AdminNav items={items} label={t('navLabel')} />}
          </aside>
          <main className="min-w-0 p-4 sm:p-6 lg:p-8">
            {mustSetUp ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-3xl font-extrabold">{ts('gateTitle')}</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{ts('gateIntro')}</p>
                </div>
                <div role="group" aria-label={ts('panel')} className="border border-awm-line bg-white p-5">
                  <TwoFactorManager initial={gate ?? { enabled: false, pending_setup: false, required: true, recovery_codes_left: 0 }} />
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
