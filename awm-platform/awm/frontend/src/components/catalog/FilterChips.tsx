import { Link } from '@/i18n/navigation';

type Option = { value: string; label: string };

type Props = {
  label: string;
  options: Option[];
  current: string | undefined;
  /** Link target for a value; undefined value = "all". */
  href: (value: string | undefined) => React.ComponentProps<typeof Link>['href'];
  allLabel: string;
};

/** A row of filter links (real navigation, so results are crawlable and shareable). */
export function FilterChips({ label, options, current, href, allLabel }: Props) {
  const chip = (active: boolean) =>
    `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold transition-colors ${
      active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-2 text-sm font-bold text-awm-muted">{label}</span>
      <Link href={href(undefined)} aria-current={!current ? 'true' : undefined} className={chip(!current)}>{allLabel}</Link>
      {options.map((o) => (
        <Link key={o.value} href={href(o.value)} aria-current={current === o.value ? 'true' : undefined} className={chip(current === o.value)}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}
