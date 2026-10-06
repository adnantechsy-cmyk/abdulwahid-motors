'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { buttonClasses } from '@/components/ui/Button';
import { NavLinks, type NavItem } from './NavLinks';

type Props = {
  items: NavItem[];
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  login: { href: string; label: string };
  register: { href: string; label: string };
  testDrive: { href: string; label: string };
};

/** Disclosure panel for < lg screens. Escape closes it and returns focus to the toggle. */
export function MobileMenu({ items, navLabel, openLabel, closeLabel, login, register, testDrive }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center border-2 border-awm-black"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
          {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full border-b border-awm-line bg-white">
          <div className="container-awm flex flex-col gap-4 py-4">
            <NavLinks items={items} label={navLabel} orientation="column" onNavigate={() => setOpen(false)} />
            <div className="flex flex-col gap-2 border-t border-awm-line pt-4">
              <Link href={testDrive.href} onClick={() => setOpen(false)} className={buttonClasses('primary', 'md')}>{testDrive.label}</Link>
              <div className="grid grid-cols-2 gap-2">
                <Link href={login.href} onClick={() => setOpen(false)} className={buttonClasses('outline', 'md')}>{login.label}</Link>
                <Link href={register.href} onClick={() => setOpen(false)} className={buttonClasses('outline', 'md')}>{register.label}</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
