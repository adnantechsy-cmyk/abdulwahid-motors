import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { ButtonLink } from '@/components/ui/Button';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string | string[]; email?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.reset' });
  // The link carries a secret token: keep this page out of search engines and out of Referer headers.
  return { title: t('title'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const token = first(raw.token).slice(0, 200);
  const email = first(raw.email).slice(0, 190);
  const t = await getTranslations('auth.reset');

  return (
    <AuthShell eyebrow={t('eyebrow')} title={t('title')} description={t('description')}>
      {token && /^[^\s@]+@[^\s@]+$/.test(email) ? (
        <ResetPasswordForm token={token} email={email} />
      ) : (
        <div role="alert" className="flex flex-col gap-4 border-s-4 border-awm-red bg-awm-panel p-6">
          <p className="font-medium">{t('invalidLink')}</p>
          <ButtonLink href="/forgot-password" variant="primary" size="md" className="self-start">{t('requestNew')}</ButtonLink>
        </div>
      )}
    </AuthShell>
  );
}
