import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-awm-red text-white hover:bg-awm-black',
  dark: 'bg-awm-black text-white hover:bg-awm-red',
  outline: 'border-2 border-awm-black text-awm-black hover:bg-awm-black hover:text-white',
  ghost: 'text-awm-black hover:bg-awm-surface',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}

type LinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

/** Locale-aware link styled as a button. Server-component friendly. */
export function ButtonLink({ variant, size, className = '', ...props }: LinkProps) {
  return <Link {...props} className={buttonClasses(variant, size, className)} />;
}
