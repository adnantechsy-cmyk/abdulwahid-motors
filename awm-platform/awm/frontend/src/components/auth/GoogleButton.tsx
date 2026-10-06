'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useLocale, useTranslations } from 'next-intl';
import { postAuth } from '@/lib/auth-client';
import { safeNextPath } from '@/lib/auth';

type GoogleId = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: 'popup'; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * "Continue with Google". Shown only when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set. Google draws the button;
 * on success it hands us a signed ID token, which Laravel verifies before any session is created.
 */
export function GoogleButton({ next }: { next?: string }) {
  const t = useTranslations('auth.google');
  const locale = useLocale();
  const slot = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !window.google || !slot.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      auto_select: false,
      callback: async ({ credential }) => {
        setError(null);
        const result = await postAuth('google', { credential }, locale);
        if (result.ok) return window.location.assign(safeNextPath(next, locale));
        setError(result.code === 'staff_use_password' ? t('staff') : result.kind === 'unavailable' ? t('unavailable') : t('failed'));
      },
    });
    window.google.accounts.id.renderButton(slot.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 320, locale });
  }, [ready, locale, next, t]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col gap-3">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setReady(true)} />
      <p className="flex items-center gap-3 text-xs font-bold text-awm-muted"><span className="h-px flex-1 bg-awm-line" />{t('or')}<span className="h-px flex-1 bg-awm-line" /></p>
      <div ref={slot} className="flex min-h-11 justify-center" />
      {error && <p role="alert" className="border-s-4 border-awm-red bg-awm-panel p-3 text-sm font-medium">{error}</p>}
    </div>
  );
}
