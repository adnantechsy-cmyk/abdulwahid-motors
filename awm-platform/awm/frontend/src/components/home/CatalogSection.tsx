import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';

type Props = {
  /** Message namespace: home.vehicles or home.parts */
  ns: 'home.vehicles' | 'home.parts';
  href: string;
  id: string;
  hasItems: boolean;
  tone?: 'plain' | 'panel';
  children: React.ReactNode;
};

/** Shared frame for the vehicles and parts rows: heading, "view all", grid or empty state. */
export async function CatalogSection({ ns, href, id, hasItems, tone = 'plain', children }: Props) {
  const t = await getTranslations(ns);

  return (
    <section aria-labelledby={id} className={tone === 'panel' ? 'border-y border-awm-line bg-awm-panel' : ''}>
      <div className="container-awm py-16">
        <SectionHeading
          id={id}
          eyebrow={t('eyebrow')}
          title={t('title')}
          description={t('description')}
          action={<ButtonLink href={href} variant="outline" size="sm">{t('viewAll')}<Icon name="arrow" size={16} /></ButtonLink>}
        />
        {hasItems ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
        ) : (
          <p className="border border-dashed border-awm-line bg-white p-8 text-center text-awm-muted">{t('empty')}</p>
        )}
      </div>
    </section>
  );
}
