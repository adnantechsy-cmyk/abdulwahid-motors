'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { adminAction } from '@/lib/admin-client';

export type TwoFactorStatus = { enabled: boolean; pending_setup: boolean; required: boolean; recovery_codes_left: number };

type Setup = { secret: string; otpauth_uri: string; qr: string | null };
type Mode = 'idle' | 'regenerate' | 'disable';

const field = 'h-12 w-full max-w-xs border border-awm-line bg-white px-4 text-base focus-visible:outline-3 focus-visible:outline-awm-red';

/**
 * Staff authenticator app: set it up (QR code or typed key), save the one-time recovery codes, replace them, or switch it off.
 * It does not refresh the page by itself after setup, so the recovery codes stay on screen until the person has saved them.
 */
export function TwoFactorManager({ initial }: { initial: TwoFactorStatus }) {
  const t = useTranslations('admin.security');
  const ta = useTranslations('admin');
  const locale = useLocale();
  const id = useId();
  const [status, setStatus] = useState(initial);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (status: number, message: string) =>
    setError(status === 429 ? t('tooMany') : status === 0 || status >= 500 ? ta('errors.unavailable') : message || t('wrong'));

  async function start() {
    setBusy(true); setError(null);
    const r = await adminAction<{ secret: string; otpauth_uri: string }>('POST', 'security/2fa/setup', locale);
    if (!r.ok) { setBusy(false); return fail(r.status, r.message); }
    let qr: string | null = null;
    try { qr = await (await import('qrcode')).toDataURL(r.data.otpauth_uri, { margin: 1, width: 224 }); } catch { /* the typed key below still works */ }
    setSetup({ secret: r.data.secret, otpauth_uri: r.data.otpauth_uri, qr });
    setStatus((s) => ({ ...s, pending_setup: true }));
    setBusy(false);
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await adminAction<{ recovery_codes: string[] } & TwoFactorStatus>('POST', 'security/2fa/confirm', locale, { code: code.trim() });
    setBusy(false);
    if (!r.ok) return fail(r.status, r.message);
    setCodes(r.data.recovery_codes);
    setStatus({ enabled: r.data.enabled, pending_setup: false, required: r.data.required, recovery_codes_left: r.data.recovery_codes_left });
    setSetup(null); setCode(''); setSaved(false);
  }

  async function sensitive(e: React.FormEvent, action: 'recovery-codes' | 'disable') {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await adminAction<{ recovery_codes?: string[] } & TwoFactorStatus>('POST', `security/2fa/${action}`, locale, { password, code: code.trim() });
    setBusy(false);
    if (!r.ok) return fail(r.status, r.message);
    setStatus({ enabled: r.data.enabled, pending_setup: false, required: r.data.required, recovery_codes_left: r.data.recovery_codes_left });
    if (r.data.recovery_codes) { setCodes(r.data.recovery_codes); setSaved(false); }
    setMode('idle'); setCode(''); setPassword('');
  }

  const download = () => {
    const blob = new Blob([`${t('codesFileTitle')}\n\n${(codes ?? []).join('\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'awm-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Recovery codes are shown once, right after they are made.
  if (codes) {
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className="border-s-4 border-awm-red bg-awm-panel p-5">
          <h3 className="text-lg font-extrabold">{t('codesTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-awm-muted">{t('codesText')}</p>
        </div>
        <ul className="grid max-w-md grid-cols-2 gap-2 font-mono text-base font-bold" dir="ltr">
          {codes.map((c) => <li key={c} className="border border-awm-line bg-white px-3 py-2">{c}</li>)}
        </ul>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={download} className={buttonClasses('outline', 'md')}>{t('download')}</button>
          <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join('\n')).catch(() => undefined)} className={buttonClasses('outline', 'md')}>{t('copy')}</button>
        </div>
        <div className="flex items-start gap-3">
          <input id={`${id}-saved`} type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 size-5 accent-awm-red" />
          <label htmlFor={`${id}-saved`} className="text-sm font-bold">{t('savedCodes')}</label>
        </div>
        <div>
          <button type="button" disabled={!saved} onClick={() => window.location.assign(`/${locale}/admin`)} className={buttonClasses('primary', 'md')}>{t('continue')}</button>
        </div>
      </div>
    );
  }

  if (!status.enabled) {
    return (
      <div className="flex flex-col gap-5">
        <p className="max-w-2xl leading-7 text-awm-muted">{status.required ? t('requiredText') : t('offText')}</p>

        {!setup ? (
          <div><button type="button" onClick={start} disabled={busy} className={buttonClasses('primary', 'md')}>{busy ? ta('working') : t('start')}</button></div>
        ) : (
          <form onSubmit={confirm} noValidate className="flex flex-col gap-5">
            <ol className="flex max-w-2xl list-decimal flex-col gap-4 ps-6 leading-7">
              <li>{t('step1')}</li>
              <li>
                {t('step2')}
                <div className="mt-3 flex flex-wrap items-center gap-5">
                  {setup.qr && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={setup.qr} alt={t('qrAlt')} width={224} height={224} className="border border-awm-line bg-white" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-awm-muted">{t('orTypeKey')}</p>
                    <p className="mt-1 break-all font-mono text-lg font-bold tracking-wider" dir="ltr">{setup.secret.match(/.{1,4}/g)?.join(' ')}</p>
                  </div>
                </div>
              </li>
              <li>{t('step3')}</li>
            </ol>
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-code`} className="text-sm font-bold">{t('codeLabel')}</label>
              <input id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={12} dir="ltr" required className={`${field} tracking-widest`} />
            </div>
            <div><button type="submit" disabled={busy} className={buttonClasses('primary', 'md')}>{busy ? ta('working') : t('confirm')}</button></div>
          </form>
        )}
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p role="status" className="max-w-2xl border-s-4 border-awm-black bg-awm-panel p-4 font-bold">{t('on')}</p>
      <p className="text-sm text-awm-muted">{t('codesLeft', { count: status.recovery_codes_left })}</p>

      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => { setMode('regenerate'); setError(null); }} className={buttonClasses('outline', 'md')}>{t('regenerate')}</button>
          {!status.required && <button type="button" onClick={() => { setMode('disable'); setError(null); }} className={buttonClasses('outline', 'md')}>{t('disable')}</button>}
        </div>
      ) : (
        <form onSubmit={(e) => sensitive(e, mode === 'regenerate' ? 'recovery-codes' : 'disable')} noValidate className="flex max-w-md flex-col gap-4 border border-awm-line bg-white p-5">
          <p className="text-sm font-bold">{mode === 'regenerate' ? t('regenerateAsk') : t('disableAsk')}</p>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-pw`} className="text-sm font-bold">{t('password')}</label>
            <input id={`${id}-pw`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className={field} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-c2`} className="text-sm font-bold">{t('codeLabel')}</label>
            <input id={`${id}-c2`} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={12} dir="ltr" required className={`${field} tracking-widest`} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={buttonClasses(mode === 'disable' ? 'dark' : 'primary', 'md')}>{busy ? ta('working') : mode === 'regenerate' ? t('regenerateYes') : t('disableYes')}</button>
            <button type="button" disabled={busy} onClick={() => { setMode('idle'); setError(null); }} className={buttonClasses('outline', 'md')}>{ta('back')}</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}
