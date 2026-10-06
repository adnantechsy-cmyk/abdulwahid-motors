import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { AUTH_COOKIE, safeNextPath } from '@/lib/auth';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.register' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function RegisterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = (await searchParams).next;
  const next = Array.isArray(raw) ? raw[0] : raw;

  if ((await cookies()).has(AUTH_COOKIE)) redirect(safeNextPath(next, locale));

  const t = await getTranslations('auth.register');
  return (
    <AuthShell eyebrow={t('eyebrow')} title={t('title')} description={t('description')}>
      <RegisterForm next={next} />
    </AuthShell>
  );
}
