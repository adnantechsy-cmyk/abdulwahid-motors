'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api/client';
import { shopFetch } from '@/lib/api/shop';

const TOPICS = ['info', 'sales', 'parts', 'management'] as const;
type Topic = (typeof TOPICS)[number];

/**
 * Message to the team. Laravel mails it to the department the visitor picked and sets Reply-To to the visitor,
 * so a reply from the inbox goes straight back to them. The hidden "website" field is a honeypot for bots.
 */
export function ContactForm() {
  const t = useTranslations('contactForm');
  const locale = useLocale();
  const id = useId();
  const [f, setF] = useState({ name: '', phone: '', email: '', topic: 'info' as Topic, message: '', website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const set = (key: keyof typeof f, value: string) => { setF((p) => ({ ...p, [key]: value })); setErrors((e) => ({ ...e, [key]: '', contact: '' })); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (f.name.trim().length < 2) next.name = t('errors.name');
    if (!f.phone.trim() && !f.email.trim()) next.contact = t('errors.contact');
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = t('errors.email');
    if (f.message.trim().length < 10) next.message = t('errors.message');
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFailed(false);
    try {
      await shopFetch('contact', { method: 'POST', locale, json: { ...f, name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, message: f.message.trim() } });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setErrors(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, (v as string[])[0] ?? ''])));
      } else {
        setFailed(true);
      }
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="border border-awm-line border-s-4 border-s-awm-red bg-white p-8">
        <h3 className="text-xl font-extrabold">{t('sentTitle')}</h3>
        <p className="mt-2 text-awm-muted">{t('sentText')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 border border-awm-line bg-white p-6 sm:grid-cols-2 sm:p-8">
      <TextField label={t('name')} value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="name" required maxLength={100} />
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-topic`} className="text-sm font-bold">{t('topic')}</label>
        <select id={`${id}-topic`} value={f.topic} onChange={(e) => set('topic', e.target.value)} className="h-12 w-full border border-awm-line bg-white px-3 text-base">
          {TOPICS.map((x) => <option key={x} value={x}>{t(`topics.${x}`)}</option>)}
        </select>
      </div>
      <TextField label={t('phone')} type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} autoComplete="tel" dir="ltr" maxLength={30} tag={t('either')} />
      <TextField label={t('email')} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} autoComplete="email" dir="ltr" maxLength={120} tag={t('either')} />
      {errors.contact && <p role="alert" className="text-sm font-medium text-awm-red sm:col-span-2">{errors.contact}</p>}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <label htmlFor={`${id}-msg`} className="text-sm font-bold">{t('message')}</label>
        <textarea
          id={`${id}-msg`}
          value={f.message}
          onChange={(e) => set('message', e.target.value)}
          rows={5}
          maxLength={3000}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${id}-msg-err` : undefined}
          className={`w-full border bg-white p-4 text-base focus-visible:outline-3 focus-visible:outline-awm-red ${errors.message ? 'border-awm-red' : 'border-awm-line'}`}
        />
        {errors.message && <p id={`${id}-msg-err`} role="alert" className="text-sm font-medium text-awm-red">{errors.message}</p>}
      </div>

      {/* Honeypot: invisible to people and screen readers, tempting to bots. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>{t('website')}<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></label>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'lg')}>{pending ? t('sending') : t('send')}</button>
        {failed && <p role="alert" className="text-sm font-medium text-awm-red">{t('failed')}</p>}
      </div>
    </form>
  );
}
