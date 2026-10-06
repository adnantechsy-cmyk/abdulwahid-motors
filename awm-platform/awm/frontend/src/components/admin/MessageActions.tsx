'use client';

import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

/** Mark a contact-form message as dealt with (or open again). */
export function MessageActions({ id, handled }: { id: number; handled: boolean }) {
  const t = useTranslations('admin.messages');
  const ta = useTranslations('admin');
  const { run, pending, error } = useAdminRun();

  return (
    <div className="flex flex-col gap-2">
      <button type="button" disabled={pending} onClick={() => run('PUT', `contact-messages/${id}`, { handled: !handled })} className={buttonClasses(handled ? 'outline' : 'primary', 'sm', 'h-9 px-3 text-xs')}>
        {pending ? ta('working') : handled ? t('reopen') : t('markHandled')}
      </button>
      {error && <p role="alert" className="text-xs font-medium text-awm-red">{error}</p>}
    </div>
  );
}