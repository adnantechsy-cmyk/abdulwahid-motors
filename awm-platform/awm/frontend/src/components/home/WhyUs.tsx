import { getTranslations } from 'next-intl/server';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';

export async function WhyUs() {
  const t = await getTranslations('home.why');

  const items: { icon: IconName; key: 'support' | 'delivery' | 'warranty' }[] = [
    { icon: 'headset', key: 'support' },
    { icon: 'truck', key: 'delivery' },
    { icon: 'shield', key: 'warranty' },
  ];

  return (
    <section aria-labelledby="why-title" className="container-awm py-16">
      <SectionHeading id="why-title" eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map(({ icon, key }) => (
          <li key={key} className="border border-awm-line bg-white p-6">
            <span className="mb-5 flex size-12 items-center justify-center bg-awm-panel text-awm-red"><Icon name={icon} size={24} /></span>
            <h3 className="text-lg font-extrabold">{t(`${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-6 text-awm-muted">{t(`${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
