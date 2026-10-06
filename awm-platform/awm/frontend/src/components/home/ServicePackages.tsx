import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tag } from '@/components/ui/Tag';

const PACKAGES = ['periodic', 'battery', 'adas'] as const;

/** Marketing copy only. Prices are deliberately absent until the service price list exists in the API. */
export async function ServicePackages() {
  const t = await getTranslations('home.service');

  return (
    <section aria-labelledby="service-title" className="container-awm py-16">
      <SectionHeading id="service-title" eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PACKAGES.map((key) => {
          const featured = key === 'battery';
          const points = t.raw(`${key}.points`) as string[];
          return (
            <li key={key} className={`relative flex flex-col gap-5 bg-white p-6 ${featured ? 'border-2 border-awm-red' : 'border border-awm-line'}`}>
              {featured && <Tag tone="red" className="absolute -top-3 start-6">{t('battery.badge')}</Tag>}
              <h3 className="text-xl font-extrabold">{t(`${key}.title`)}</h3>
              <ul className="flex flex-col gap-3">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-awm-muted">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0 text-awm-red" />
                    {p}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/service-booking" variant={featured ? 'primary' : 'dark'} size="md" className="mt-auto">{t('book')}</ButtonLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
