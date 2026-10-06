import { Tag } from '@/components/ui/Tag';

const GOOD = new Set(['paid', 'fulfilled', 'captured', 'confirmed', 'completed', 'passed', 'pass', 'valid']);
const BAD = new Set(['failed', 'fail', 'cancelled', 'no_show', 'void', 'refunded', 'invalid']);

/** Status label coloured by meaning: dark = done/good, red = problem, grey = in between. */
export function StatusPill({ code, label }: { code: string; label: string }) {
  const tone = GOOD.has(code) ? 'dark' : BAD.has(code) ? 'red' : 'light';
  return <Tag tone={tone} className="whitespace-nowrap">{label}</Tag>;
}
