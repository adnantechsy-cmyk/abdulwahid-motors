import { getTranslations } from 'next-intl/server';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';

export async function QuickActions() {
  const t = await getTranslations('home.quick');

  const actions: { href: string; icon: IconName; title: string; hint: string }[] = [
    { href: '/vehicles', icon: 'car', title: t('buy'), hint: t('buyHint') },
    { href: '/service-booking', icon: 'wrench', title: t('service'), hint: t('serviceHint') },
    { href: '/parts', icon: 'gear', title: t('parts'), hint: t('partsHint') },
    { href: '/contact', icon: 'pin', title: t('branches'), hint: t('branchesHint') },
  ];

  return (
    <section aria-label={t('label')} className="border-b border-awm-line bg-awm-panel">
      <ul className="container-awm grid grid-cols-1 gap-px py-0 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="group flex items-center gap-4 p-5 transition-colors hover:bg-white">
              <span className="flex size-12 shrink-0 items-center justify-center bg-awm-black text-white transition-colors group-hover:bg-awm-red">
                <Icon name={a.icon} size={22} />
              </span>
              <span className="flex flex-col">
                <span className="text-base font-extrabold">{a.title}</span>
                <span className="text-sm text-awm-muted">{a.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
