import { Link } from '@/i18n/navigation';

/**
 * Text wordmark. Replace the square with the official logo file once supplied
 * (public/brand/logo.svg); the BYD mark itself needs the dealer's brand-usage approval.
 */
export function Brand({ name, tagline, href = '/' }: { name: string; tagline: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center bg-awm-black font-mono text-lg font-bold text-white" aria-hidden="true">AW</span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-extrabold">{name}</span>
        <span className="text-[11px] font-bold tracking-wide text-awm-red">{tagline}</span>
      </span>
    </Link>
  );
}
