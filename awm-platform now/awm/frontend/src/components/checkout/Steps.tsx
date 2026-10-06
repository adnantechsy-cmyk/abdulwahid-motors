import { Icon } from '@/components/ui/Icon';
import { cx } from '@/components/ui/primitives';

/** 4-step bar from the checkout designs. */
export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'upcoming';
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined}
            className={cx('flex items-center gap-3 p-3', state === 'current' ? 'bg-awm-red text-white' : state === 'done' ? 'bg-awm-surface' : 'bg-awm-surface text-awm-muted')}>
            <span className={cx('flex size-8 shrink-0 items-center justify-center font-mono text-sm font-bold',
              state === 'current' ? 'bg-white text-awm-red' : state === 'done' ? 'bg-awm-black text-white' : 'border border-awm-line')}>
              {state === 'done' ? <Icon name="check" size={16} /> : String(n).padStart(2, '0')}
            </span>
            <span className="text-sm font-bold leading-tight">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
