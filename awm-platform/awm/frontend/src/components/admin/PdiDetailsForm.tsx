'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import type { AdminPdiDetail } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

const area = 'w-full border border-awm-line bg-white p-3 text-sm leading-6 focus-visible:outline-3 focus-visible:outline-awm-red';

/** Expected handover date, the note the customer sees (in both languages) and internal notes for the team. */
export function PdiDetailsForm({ pdi }: { pdi: AdminPdiDetail }) {
  const t = useTranslations('admin.delivery.details');
  const ta = useTranslations('admin');
  const { run, pending, error } = useAdminRun();
  const id = useId();
  const note = Array.isArray(pdi.customer_note) ? {} : pdi.customer_note;
  const [eta, setEta] = useState(pdi.estimated_delivery_at ? pdi.estimated_delivery_at.slice(0, 10) : '');
  const [ar, setAr] = useState(note.ar ?? '');
  const [en, setEn] = useState(note.en ?? '');
  const [notes, setNotes] = useState(pdi.notes ?? '');
  const [saved, setSaved] = useState(false);
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setSaved(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await run('PUT', `pdi/${pdi.id}`, {
      estimated_delivery_at: eta || null,
      notes: notes.trim() || null,
      customer_note: { ar: ar.trim() || null, en: en.trim() || null },
    });
    if (r.ok) setSaved(true);
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-eta`} className="text-sm font-bold">{t('eta')}</label>
        <input id={`${id}-eta`} type="date" value={eta} onChange={(e) => touch(setEta)(e.target.value)} dir="ltr" className="h-12 w-full max-w-xs border border-awm-line bg-white px-4" />
        <p className="text-xs text-awm-muted">{t('etaHint')}</p>
      </div>
      <div className="hidden lg:block" />

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-ar`} className="text-sm font-bold">{t('customerNoteAr')}</label>
        <textarea id={`${id}-ar`} value={ar} onChange={(e) => touch(setAr)(e.target.value)} rows={3} maxLength={500} lang="ar" dir="rtl" className={area} aria-describedby={`${id}-cn`} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-en`} className="text-sm font-bold">{t('customerNoteEn')}</label>
        <textarea id={`${id}-en`} value={en} onChange={(e) => touch(setEn)(e.target.value)} rows={3} maxLength={500} lang="en" dir="ltr" className={area} aria-describedby={`${id}-cn`} />
      </div>
      <p id={`${id}-cn`} className="text-xs text-awm-muted lg:col-span-2">{t('customerNoteHint')}</p>

      <div className="flex flex-col gap-2 lg:col-span-2">
        <label htmlFor={`${id}-notes`} className="text-sm font-bold">{t('internalNotes')}</label>
        <textarea id={`${id}-notes`} value={notes} onChange={(e) => touch(setNotes)(e.target.value)} rows={3} maxLength={2000} className={area} />
        <p className="text-xs text-awm-muted">{t('internalHint')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses('primary', 'md')}>{pending ? ta('working') : t('save')}</button>
        {saved && <p role="status" className="text-sm font-bold">{t('saved')}</p>}
        {error && <p role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
      </div>
    </form>
  );
}