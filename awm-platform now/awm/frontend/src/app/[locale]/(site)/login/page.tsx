import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/site/LoginForm';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('login');
  return { title: t('title'), robots: { index: false, follow: true } };
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');
  const { next } = await searchParams;

  return (
    <div className="bg-awm-surface px-4 py-16">
      <div className="mx-auto flex max-w-md flex-col gap-6 border-t-4 border-awm-red bg-white p-8">
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <LoginForm next={next} />
        <p className="text-sm text-awm-muted">{t('noAccount')} <Link href="/register" className="font-bold text-awm-red underline underline-offset-4">{t('register')}</Link></p>
      </div>
    </div>
  );
}
