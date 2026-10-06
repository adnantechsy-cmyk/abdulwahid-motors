'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cx } from '@/components/ui/primitives';

export type NavItem = { key: string; href: string; icon: IconName; ready: boolean };

export function AdminNav({ items }: { items: NavItem[] }) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        const body = (
          <>
            <Icon name={item.icon} />
            <span className="flex-1">{t(item.key)}</span>
            {!item.ready && <span className="text-[10px] font-bold text-awm-muted">{t('soon')}</span>}
          </>
        );
        return (
          <li key={item.key}>
            {item.ready ? (
              <Link href={item.href} aria-current={active ? 'page' : undefined}
                className={cx('flex items-center gap-3 border-s-4 px-5 py-3 text-sm font-medium',
                  active ? 'border-awm-red bg-awm-surface font-bold' : 'border-transparent hover:bg-awm-surface')}>
                {body}
              </Link>
            ) : (
              <span className="flex cursor-not-allowed items-center gap-3 border-s-4 border-transparent px-5 py-3 text-sm text-awm-muted" aria-disabled="true">
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
