'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { useAdminRun } from './useAdminRun';

export type GalleryImage = { path: string; url: string };

const MAX_PHOTOS = 12;
const MAX_MB = 5;

/** A car's photo gallery: add (jpg/png/webp up to 5 MB, 12 photos), remove, and change the order. */
export function GalleryManager({ vehicleId, images }: { vehicleId: number; images: GalleryImage[] }) {
  const t = useTranslations('admin.vehicles.gallery');
  const { run, pending, error, setError } = useAdminRun();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function add() {
    const file = input.current?.files?.[0];
    setDone(false);
    setError(null);
    if (!file) return setLocalError(t('choose'));
    if (file.size > MAX_MB * 1024 * 1024) return setLocalError(t('tooBig', { mb: MAX_MB }));
    setLocalError(null);

    const body = new FormData();
    body.append('image', file);
    const result = await run('POST', `vehicles/${vehicleId}/gallery`, body);
    if (result.ok) {
      setDone(true);
      if (input.current) input.current.value = '';
    }
  }

  async function move(from: number, to: number) {
    const order = images.map((_, i) => i);
    [order[from], order[to]] = [order[to], order[from]];
    setDone(false);
    await run('PUT', `vehicles/${vehicleId}/gallery`, { order });
  }

  return (
    <div role="group" aria-labelledby={`${id}-l`} className="flex flex-col gap-4">
      <div>
        <p id={`${id}-l`} className="text-sm font-bold">{t('title')}</p>
        <p className="text-xs text-awm-muted">{t('hint', { max: MAX_PHOTOS, mb: MAX_MB })}</p>
      </div>

      {images.length === 0 ? (
        <p className="border border-dashed border-awm-line p-4 text-sm text-awm-muted">{t('empty')}</p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.path} className="flex flex-col gap-2 border border-awm-line bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <p className="text-xs font-bold text-awm-muted">{t('position', { n: i + 1, total: images.length })}</p>
              <div className="flex flex-wrap gap-1">
                <button type="button" disabled={pending || i === 0} onClick={() => move(i, i - 1)} className={buttonClasses('outline', 'sm', 'h-9 px-2 text-xs')}>
                  {t('earlier')}<span className="sr-only"> ({t('position', { n: i + 1, total: images.length })})</span>
                </button>
                <button type="button" disabled={pending || i === images.length - 1} onClick={() => move(i, i + 1)} className={buttonClasses('outline', 'sm', 'h-9 px-2 text-xs')}>
                  {t('later')}<span className="sr-only"> ({t('position', { n: i + 1, total: images.length })})</span>
                </button>
                <button type="button" disabled={pending} onClick={() => run('DELETE', `vehicles/${vehicleId}/gallery/${i}`)} className={buttonClasses('outline', 'sm', 'h-9 px-2 text-xs')}>
                  {t('remove')}<span className="sr-only"> ({t('position', { n: i + 1, total: images.length })})</span>
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {images.length < MAX_PHOTOS ? (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={id} className="sr-only">{t('title')}</label>
          <input id={id} ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} className="max-w-full text-sm file:me-3 file:h-10 file:border-0 file:bg-awm-black file:px-4 file:text-sm file:font-bold file:text-white" />
          <button type="button" onClick={add} disabled={pending} className={buttonClasses('dark', 'sm', 'h-10 px-4 text-sm')}>{pending ? t('uploading') : t('add')}</button>
        </div>
      ) : (
        <p className="text-sm text-awm-muted">{t('full', { max: MAX_PHOTOS })}</p>
      )}

      {done && <p role="status" className="text-sm font-bold">{t('done')}</p>}
      {(localError || error) && <p role="alert" className="text-sm font-medium text-awm-red">{localError ?? error}</p>}
    </div>
  );
}
