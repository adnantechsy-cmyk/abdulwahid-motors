'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

/** Delete a category after one more click. Items in it are kept (they just lose the category). */
export function DeleteCategory({ id, name, itemsCount }: { id: number; name: string; itemsCount: number }) {
  const t = useTranslations('admin.categories');
  const ta = useTranslations('admin');
  const { run, pending, error, setError } = useAdminRun();
  const [ask, setAsk] = useState(false);

  if (!ask) {
    return <button type="button" onClick={() => setAsk(true)} className={buttonClasses('outline', 'sm', 'h-9 px-3 text-xs')}>{t('delete')}<span className="sr-only"> {name}</span></button>;
  }

  return (
    <div role="group" aria-label={t('deleteAsk', { name })} className="flex min-w-48 flex-col gap-2 border-s-4 border-awm-black bg-awm-panel p-3">
      <p className="text-xs font-bold">{t('deleteAsk', { name })}</p>
      {itemsCount > 0 && <p className="text-xs text-awm-muted">{t('deleteKeeps', { count: itemsCount })}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run('DELETE', `categories/${id}`)} className={buttonClasses('dark', 'sm', 'h-9 px-3 text-xs')}>{pending ? ta('working') : t('deleteYes')}</button>
        <button type="button" disabled={pending} onClick={() => { setAsk(false); setError(null); }} className={buttonClasses('outline', 'sm', 'h-9 px-3 text-xs')}>{ta('back')}</button>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </div>
  );
}
