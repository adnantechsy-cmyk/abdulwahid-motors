'use client';

import { Link, usePathname } from '@/i18n/navigation';

export type AdminNavItem = { href: string; label: string };

/** Admin sections: a side list on large screens, a scrolling row on small ones. */
export function AdminNav({ items, label }: { items: AdminNavItem[]; label: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-awm-line bg-white lg:border-b-0 lg:bg-transparent">
      <ul className="flex min-w-max gap-1 px-2 lg:min-w-0 lg:flex-col lg:px-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={`block whitespace-nowrap border-b-4 px-4 py-3 text-sm font-bold transition-colors hover:text-awm-red lg:border-b-0 lg:border-s-4 ${active(item.href) ? 'border-awm-red bg-awm-panel text-awm-red' : 'border-transparent'}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
