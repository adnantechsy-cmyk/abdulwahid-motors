'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import type { AdminPdiDetail, PdiItemStatus } from '@/types/admin';
import { useAdminRun } from './useAdminRun';

type Item = AdminPdiDetail['items'][number];

const SECTION_ORDER = ['documents', 'exterior', 'interior', 'battery', 'systems', 'road_test'];
const CHOICES: PdiItemStatus[] = ['pass', 'fail', 'na'];

/** One checklist row: Pass / Fail / Not applicable. A failed item needs a note saying what is wrong. */
function ItemRow({ item, locale, closed }: { item: Item; locale: string; closed: boolean }) {
  const t = useTranslations('admin.delivery');
  const { run, pending, error, setError } = useAdminRun();
  const id = useId();
  const [note, setNote] = useState(item.note ?? '');
  const [needNote, setNeedNote] = useState(false);
  const label = (locale === 'ar' ? item.label.ar : item.label.en) ?? item.label.en ?? item.label.ar ?? item.code;
  const codes = { pdi_note_required: t('noteRequired'), pdi_closed: t('closed') };

  async function set(status: PdiItemStatus) {
    if (status === 'fail' && !note.trim()) { setNeedNote(true); return; }
    setNeedNote(false);
    setError(null);
    await run('PUT', `pdi/items/${item.id}`, { status, note: note.trim() || null }, codes);
  }

  return (
    <li className="flex flex-col gap-3 border-b border-awm-line p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl font-bold" id={`${id}-l`}>{label}</p>
        <div role="group" aria-labelledby={`${id}-l`} className="flex flex-wrap gap-2">
          {CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={pending || closed}
              aria-pressed={item.status === c}
              onClick={() => set(c)}
              className={buttonClasses(item.status === c ? (c === 'fail' ? 'primary' : 'dark') : 'outline', 'sm', 'h-9 px-3 text-xs')}
            >
              {t(`choices.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-n`} className="text-xs font-bold">{t('itemNote')}{item.status === 'fail' || needNote ? ` (${t('required')})` : ''}</label>
        <input
          id={`${id}-n`}
          value={note}
          onChange={(e) => { setNote(e.target.value); setNeedNote(false); }}
          maxLength={255}
          disabled={closed}
          aria-invalid={needNote || undefined}
          className="h-10 w-full max-w-xl border border-awm-line bg-white px-3 text-sm"
        />
      </div>

      {item.checked_at && <p className="text-xs text-awm-muted">{t('checkedBy', { name: item.checked_by ?? '—', when: formatDateTime(item.checked_at, locale) })}</p>}
      {(needNote || error) && <p role="alert" className="text-xs font-medium text-awm-red">{needNote ? t('noteRequired') : error}</p>}
    </li>
  );
}

export function PdiChecklist({ items, closed }: { items: AdminPdiDetail['items']; closed: boolean }) {
  const t = useTranslations('admin.delivery');
  const locale = useLocale();
  const sections = SECTION_ORDER.filter((s) => items.some((i) => i.section === s)).concat([...new Set(items.map((i) => i.section))].filter((s) => !SECTION_ORDER.includes(s)));

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => {
        const rows = items.filter((i) => i.section === section);
        const done = rows.filter((r) => r.status !== 'pending').length;
        return (
          <section key={section} aria-labelledby={`pdi-${section}`} className="border border-awm-line bg-white">
            <h3 id={`pdi-${section}`} className="flex items-center justify-between gap-3 border-b border-awm-line bg-awm-panel px-4 py-3 text-base font-extrabold">
              {t.has(`sections.${section}`) ? t(`sections.${section}`) : section}
              <span className="font-mono text-xs font-bold text-awm-muted">{done} / {rows.length}</span>
            </h3>
            <ul>{rows.map((item) => <ItemRow key={`${item.id}-${item.status}-${item.note ?? ''}`} item={item} locale={locale} closed={closed} />)}</ul>
          </section>
        );
      })}
    </div>
  );
}