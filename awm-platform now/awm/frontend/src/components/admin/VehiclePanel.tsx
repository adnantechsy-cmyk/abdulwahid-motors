'use client';

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Icon } from '@/components/ui/Icon';
import { Badge, Button, cx } from '@/components/ui/primitives';
import { ApiError, apiFetch } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import type { AdminVehicleFull } from '@/types/admin';
import type { ComponentProps } from 'react';

/** Side panel from the vehicles design: sale status, visibility, photo album. */
export function VehiclePanel({ vehicle: v, closeHref }: { vehicle: AdminVehicleFull; closeHref: ComponentProps<typeof Link>['href'] }) {
  const t = useTranslations('admin.vehicles');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const call = (path: string, init: RequestInit) =>
    start(async () => {
      setError(null);
      try {
        await apiFetch(path, { ...init, locale });
        router.refresh();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('genericError'));
      }
    });

  const upload = async (files: FileList | null, as: 'cover' | 'gallery') => {
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images[]', f));
    fd.append('as', as);
    setUploading(true);
    setError(null);
    try {
      await apiFetch(`/admin/vehicles/${v.id}/images`, { method: 'POST', body: fd, locale });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors ?? {})[0]?.[0] ?? e.message) : t('genericError'));
    } finally {
      setUploading(false);
    }
  };

  const photos = [v.cover_image.url ? { path: v.cover_image.path!, url: v.cover_image.url, cover: true } : null, ...v.gallery.map((g) => ({ ...g, cover: false }))].filter(Boolean) as { path: string; url: string; cover: boolean }[];

  return (
    <aside className="flex flex-col gap-5 border border-awm-line p-5 xl:sticky xl:top-20 xl:self-start" aria-label={t('panelTitle')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-awm-red">{t('panelTitle')}</p>
          <h2 className="text-xl font-extrabold">{v.name[locale] || v.name.en} {v.model_year}</h2>
          <p className="font-mono text-xs text-awm-muted">{v.vin ? `VIN: ${v.vin}` : v.sku}</p>
        </div>
        <Link href={closeHref} aria-label={t('closePanel')} className="flex size-9 items-center justify-center hover:bg-awm-surface"><Icon name="close" size={16} /></Link>
      </div>

      <dl className="grid grid-cols-2 gap-px border border-awm-line bg-awm-line text-sm">
        <div className="bg-white p-3"><dt className="text-xs text-awm-muted">{t('price')}</dt><dd className="font-mono font-bold">{formatMoney(v.price, v.currency, locale)}</dd></div>
        <div className="bg-white p-3"><dt className="text-xs text-awm-muted">{t('deposit')}</dt><dd className="font-mono font-bold text-awm-red">{formatMoney(v.deposit_amount, v.currency, locale)}</dd></div>
      </dl>

      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="mb-2 text-xs font-bold text-awm-muted">{t('saleStatus')}</legend>
        <div className="grid grid-cols-2 gap-1">
          {(['available', 'reserved', 'incoming', 'sold'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={v.status === s}
              onClick={() => v.status !== s && call(`/admin/vehicles/${v.id}/status`, { method: 'PUT', body: JSON.stringify({ status: s }) })}
              className={cx('h-10 border text-sm font-bold', v.status === s ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line hover:border-awm-black')}>
              {t(`status.${s}`)}
            </button>
          ))}
        </div>
        {v.reserved_order_id && <p className="text-xs text-awm-muted">{t('reservedOnlineHint')}</p>}
        <Button variant={v.is_published ? 'outline' : 'primary'} icon={v.is_published ? 'eyeOff' : 'eye'}
          onClick={() => call(`/admin/vehicles/${v.id}/visibility`, { method: 'PUT', body: JSON.stringify({ is_published: !v.is_published }) })}>
          {v.is_published ? t('hideFromSite') : t('showOnSite')}
        </Button>
      </fieldset>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-extrabold">{t('album')}</h3>
          <span className="font-mono text-xs text-awm-muted">{t('photoCount', { n: photos.length })}</span>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-1">
            {photos.map((p) => (
              <div key={p.path} className={cx('relative aspect-square bg-awm-surface', p.cover && 'col-span-4 aspect-[4/3]')}>
                <Image src={p.url} alt="" fill sizes={p.cover ? '22rem' : '6rem'} className="object-cover" />
                {p.cover ? (
                  <Badge tone="red" className="absolute bottom-2 start-2">{t('cover')}</Badge>
                ) : (
                  <button type="button" disabled={pending} aria-label={t('removePhoto')}
                    onClick={() => call(`/admin/vehicles/${v.id}/gallery`, { method: 'PUT', body: JSON.stringify({ gallery: v.gallery.map((g) => g.path).filter((x) => x !== p.path) }) })}
                    className="absolute end-0 top-0 flex size-6 items-center justify-center bg-awm-black text-white hover:bg-awm-red"><Icon name="close" size={12} /></button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(['cover', 'gallery'] as const).map((as) => (
            <label key={as} className={cx('flex cursor-pointer flex-col items-center gap-1 border-2 border-dashed border-awm-line p-3 text-center text-xs font-bold hover:border-awm-black', uploading && 'pointer-events-none opacity-50')}>
              <Icon name="upload" className="text-awm-red" />
              {as === 'cover' ? t('uploadCover') : t('uploadGallery')}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple={as === 'gallery'} className="sr-only" onChange={(e) => upload(e.target.files, as)} />
            </label>
          ))}
        </div>
        <p className="text-xs text-awm-muted">{t('uploadHint')}</p>
      </section>

      {error && <p role="alert" className="border-s-4 border-awm-red bg-awm-red/5 p-3 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-2 border-t border-awm-line pt-4">
        <Link href={`/admin/vehicles/${v.id}`} className="flex h-11 items-center justify-center gap-2 bg-awm-black text-sm font-bold text-white hover:bg-awm-red"><Icon name="pencil" size={16} />{t('editDetails')}</Link>
        <Link href={{ pathname: '/admin/seo', query: { type: 'vehicle', key: v.id } }} className="flex h-11 items-center justify-center gap-2 border-2 border-awm-black text-sm font-bold hover:bg-awm-black hover:text-white"><Icon name="globe" size={16} />{t('editSeo')}</Link>
      </div>
    </aside>
  );
}
