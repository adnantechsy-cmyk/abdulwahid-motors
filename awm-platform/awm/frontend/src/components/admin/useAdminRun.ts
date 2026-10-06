'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { adminAction, type ActionResult } from '@/lib/admin-client';

/**
 * Runs one staff action and keeps its busy/error state. On success the page's server data is refreshed
 * so the row or card moves to its new state. `codes` maps Laravel error codes to translated messages.
 */
export function useAdminRun() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T = unknown>(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    codes: Record<string, string> = {},
  ): Promise<ActionResult<T>> {
    setPending(true);
    setError(null);
    const result = await adminAction<T>(method, path, locale, body);
    setPending(false);

    if (!result.ok) {
      setError(
        result.status === 403 ? t('errors.forbidden')
        : result.status === 0 || result.status >= 500 ? t('errors.unavailable')
        : (result.code && codes[result.code]) || result.message || t('errors.generic'),
      );
    } else {
      router.refresh();
    }
    return result;
  }

  return { run, pending, error, setError };
}
