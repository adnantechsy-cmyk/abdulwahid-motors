import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { Link } from '@/i18n/navigation';
import { formatMoney } from '@/lib/format';
import type { SparePartDto } from '@/types/api';

export async function PartCard({ part, locale }: { part: SparePartDto; locale: string }) {
  const t = await getTranslations('part');
  const tc = await getTranslations('common');
  const inStock = part.available_quantity > 0;

  return (
    <article className="flex flex-col border border-awm-line bg-white">
      <Link href={`/parts/${part.slug}`} className="relative block aspect-[4/3] bg-awm-surface" aria-label={part.name}>
        {part.image ? (
          <Image src={part.image} alt="" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-awm-muted"><Icon name="gear" size={48} /></span>
        )}
        {part.is_oem && <Tag tone="dark" className="absolute start-3 top-3">{t('oem')}</Tag>}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-mono text-xs text-awm-muted" dir="ltr">{t('sku')}: {part.sku}</p>
        <h3 className="text-lg font-extrabold leading-snug"><Link href={`/parts/${part.slug}`} className="hover:text-awm-red">{part.name}</Link></h3>
        {part.compatible_models && part.compatible_models.length > 0 && (
          <p className="text-sm text-awm-muted">{t('compatible', { models: new Intl.ListFormat(locale, { style: 'narrow', type: 'conjunction' }).format(part.compatible_models) })}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <p className="font-mono text-lg font-bold tabular-nums">{formatMoney(part.price, part.currency, locale, 2)}</p>
          <p className={`text-xs font-bold ${inStock ? 'text-awm-muted' : 'text-awm-red'}`}>
            {inStock ? t('inStock', { count: part.available_quantity }) : t('outOfStock')}
          </p>
        </div>

        <AddToCartButton
          disabled={!inStock}
          label={tc('addToCart')}
          inCartLabel={tc('inCart')}
          className="h-11 px-4 text-sm"
          item={{
            type: 'spare_part',
            refId: part.id,
            sku: part.sku,
            name: part.name_i18n,
            image: part.image ?? undefined,
            unitPrice: Number(part.price),
            currency: part.currency,
            maxQuantity: part.available_quantity,
          }}
        />
      </div>
    </article>
  );
}
