'use client';

import { useTranslations } from 'next-intl';

export function AdminLogout() {
  const t = useTranslations('admin');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign(window.location.pathname);
  }

  return (
    <button type="button" onClick={logout} className="h-9 border-2 border-awm-black px-3 text-xs font-bold hover:bg-awm-black hover:text-white">
      {t('logout')}
    </button>
  );
}
