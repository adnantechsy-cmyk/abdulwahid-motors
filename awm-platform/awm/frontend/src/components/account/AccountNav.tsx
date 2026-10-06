'use client';

import { Link, usePathname } from '@/i18n/navigation';

export type AccountNavItem = { href: string; label: string };

/** Section tabs for the account area. Scrolls sideways on narrow screens instead of wrapping. */
export function AccountNav({ items, label }: { items: AccountNavItem[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/account' ? pathname === '/account' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label} className="mb-8 overflow-x-auto border-b border-awm-line">
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap border-b-4 px-4 py-3 text-sm font-bold transition-colors hover:text-awm-red ${active ? 'border-awm-red text-awm-red' : 'border-transparent'}`}
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
