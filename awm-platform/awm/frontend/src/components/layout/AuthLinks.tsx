'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';
import type { AuthUser } from '@/lib/auth';

export type AuthLabels = { login: string; register: string; logout: string };

/**
 * Session controls. The header is server-rendered and shared by static pages, so the session is read on
 * the client from /api/auth/me instead of cookies() (which would make every page dynamic). Until that
 * resolves we render the signed-out links, which is also what crawlers see.
 */
function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && setUser(data?.user ?? null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.assign(window.location.pathname);
  }

  return { user, logout };
}

/** Compact version for the desktop header (hidden on phones, where the menu has the full version). */
export function AuthLinks({ labels }: { labels: AuthLabels }) {
  const { user, logout } = useSession();

  if (user) {
    return (
      <div className="flex items-center gap-2 max-sm:hidden">
        <span className="hidden max-w-32 truncate text-sm font-bold 2xl:inline" title={user.name}>{user.name}</span>
        <button type="button" onClick={logout} className={buttonClasses('outline', 'sm')}>{labels.logout}</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 max-sm:hidden">
      <Link href="/login" aria-label={labels.login} className="flex h-9 items-center gap-2 px-2 text-sm font-bold hover:text-awm-red">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
        </svg>
        <span className="hidden xl:inline">{labels.login}</span>
      </Link>
      <Link href="/register" className={`${buttonClasses('outline', 'sm')} max-2xl:hidden`}>{labels.register}</Link>
    </div>
  );
}

/** Full-width version for the mobile menu. */
export function AuthMenuLinks({ labels, onNavigate }: { labels: AuthLabels; onNavigate: () => void }) {
  const { user, logout } = useSession();

  if (user) {
    return (
      <div className="flex flex-col gap-2">
        <p className="truncate text-sm font-bold text-awm-muted">{user.name}</p>
        <button type="button" onClick={logout} className={buttonClasses('outline', 'md')}>{labels.logout}</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Link href="/login" onClick={onNavigate} className={buttonClasses('outline', 'md')}>{labels.login}</Link>
      <Link href="/register" onClick={onNavigate} className={buttonClasses('outline', 'md')}>{labels.register}</Link>
    </div>
  );
}
