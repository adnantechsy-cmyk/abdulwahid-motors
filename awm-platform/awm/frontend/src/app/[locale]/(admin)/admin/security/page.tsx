import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TwoFactorManager, type TwoFactorStatus } from '@/components/admin/TwoFactorManager';
import { Panel } from '@/components/account/Panel';
import { adminGet, getAdminUser, isStaff } from '@/lib/api/admin';

type Props = { params: Promise<{ locale: string }> };

/** Every staff member's own security settings: the authenticator app. No permission needed beyond being staff. */
export default async function SecurityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getAdminUser(locale);
  if (!isStaff(user)) return null; // the layout already showed the "staff only" page

  const [t, status] = await Promise.all([getTranslations('admin.security'), adminGet<TwoFactorStatus>('/admin/security/2fa', locale)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>
      <Panel id="two-factor" title={t('panel')}>
        <TwoFactorManager initial={status ?? { enabled: false, pending_setup: false, required: false, recovery_codes_left: 0 }} />
      </Panel>
    </div>
  );
}