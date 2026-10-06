'use client';

import { Link, usePathname } from '@/i18n/navigation';

export type NavItem = { href: string; label: string };

/** Primary links with aria-current on the active section. usePathname() is locale-stripped. */
export function NavLinks({ items, label, orientation = 'row', onNavigate }: {
  items: NavItem[];
  label: string;
  orientation?: 'row' | 'column';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label}>
      <ul className={orientation === 'row' ? 'flex items-center gap-1' : 'flex flex-col'}>
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={
                  orientation === 'row'
                    ? `block border-b-2 px-3 py-2 text-sm font-bold transition-colors hover:text-awm-red ${active ? 'border-awm-red text-awm-red' : 'border-transparent'}`
                    : `block border-s-4 px-4 py-3 text-base font-bold ${active ? 'border-awm-red bg-awm-panel text-awm-red' : 'border-transparent'}`
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
