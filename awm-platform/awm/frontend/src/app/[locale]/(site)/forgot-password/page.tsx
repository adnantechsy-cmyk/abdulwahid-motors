import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgot' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

/** For customers and staff alike: the email goes to the address on the account. */
export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.forgot');

  return (
    <AuthShell eyebrow={t('eyebrow')} title={t('title')} description={t('description')}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
