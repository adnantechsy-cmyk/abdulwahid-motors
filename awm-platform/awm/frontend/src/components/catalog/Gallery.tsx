'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/Icon';

/** Main image plus thumbnails. Without JS the first image still renders (server HTML). */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const t = useTranslations('detail');
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={t('gallery')}>
      <div className="relative aspect-[4/3] bg-awm-surface">
        {current ? (
          <Image src={current} alt={alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-awm-muted">
            <Icon name="car" size={72} />
            <span className="text-sm">{t('noImage')}</span>
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={i === index}
                aria-label={t('viewImage', { n: i + 1, total: images.length })}
                className={`relative block aspect-[4/3] w-full border-2 bg-awm-surface ${i === index ? 'border-awm-red' : 'border-transparent hover:border-awm-black'}`}
              >
                <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
