'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

type Props = {
  /** What follows /api/admin/, for example `vehicles/5/brochure`. */
  path: string;
  /** The multipart field Laravel expects: `brochure` or `image`. */
  field: 'brochure' | 'image';
  accept: string;
  maxMb: number;
  label: string;
  hint: string;
  /** Current file, if any: shown as a link (PDF) or a thumbnail (image). */
  currentUrl: string | null;
  kind: 'pdf' | 'image';
  /** Path to DELETE the file (only the PDF catalogue can be removed). */
  removePath?: string;
};

/** One file upload (PDF catalogue or cover photo). The size is checked here for a quick message; Laravel checks again. */
export function FileUpload({ path, field, accept, maxMb, label, hint, currentUrl, kind, removePath }: Props) {
  const t = useTranslations('admin.upload');
  const { run, pending, error, setError } = useAdminRun();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upload() {
    const file = input.current?.files?.[0];
    setDone(false);
    setError(null);
    if (!file) return setLocalError(t('choose'));
    if (file.size > maxMb * 1024 * 1024) return setLocalError(t('tooBig', { mb: maxMb }));
    setLocalError(null);

    const body = new FormData();
    body.append(field, file);
    const result = await run('POST', path, body, { validation: t('invalid') });
    if (result.ok) {
      setDone(true);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    if (!removePath) return;
    setDone(false);
    await run('DELETE', removePath);
  }

  return (
    <div role="group" aria-labelledby={`${id}-l`} className="flex flex-col gap-3 border border-awm-line bg-white p-4">
      <div>
        <p id={`${id}-l`} className="text-sm font-bold">{label}</p>
        <p className="text-xs text-awm-muted">{hint}</p>
      </div>

      {currentUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          {kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="h-20 w-28 border border-awm-line object-cover" />
          ) : null}
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-awm-red underline underline-offset-4">
            {kind === 'pdf' ? t('openPdf') : t('openImage')}<span className="sr-only"> ({t('opensNewTab')})</span>
          </a>
          {removePath && (
            <button type="button" onClick={remove} disabled={pending} className={buttonClasses('outline', 'sm', 'h-9 px-3 text-xs')}>{t('remove')}</button>
          )}
        </div>
      ) : (
        <p className="text-sm text-awm-muted">{t('none')}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="sr-only">{label}</label>
        <input id={id} ref={input} type="file" accept={accept} disabled={pending} className="max-w-full text-sm file:me-3 file:h-10 file:border-0 file:bg-awm-black file:px-4 file:text-sm file:font-bold file:text-white" />
        <button type="button" onClick={upload} disabled={pending} className={buttonClasses('dark', 'sm', 'h-10 px-4 text-sm')}>{pending ? t('uploading') : currentUrl ? t('replace') : t('upload')}</button>
      </div>

      {done && <p role="status" className="text-sm font-bold">{t('done')}</p>}
      {(localError || error) && <p role="alert" className="text-sm font-medium text-awm-red">{localError ?? error}</p>}
    </div>
  );
}
