import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { formatDateTime } from '@/lib/format';
import type { TrackingStep } from '@/types/account';

/** Delivery progress. Done steps are solid black, the current step is red, upcoming ones are outlined. */
export async function TrackingSteps({ steps, locale }: { steps: TrackingStep[]; locale: string }) {
  const t = await getTranslations('account.tracking');

  return (
    <ol className="grid grid-cols-1 gap-4 md:auto-cols-fr md:grid-flow-col">
      {steps.map((step, i) => (
        <li key={step.code} aria-current={step.state === 'current' ? 'step' : undefined} className="flex items-start gap-3 md:flex-col">
          <span
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center border-2 text-sm font-extrabold ${
              step.state === 'done'
                ? 'border-awm-black bg-awm-black text-white'
                : step.state === 'current'
                  ? 'border-awm-red bg-awm-red text-white'
                  : 'border-awm-line bg-white text-awm-muted'
            }`}
          >
            {step.state === 'done' ? <Icon name="check" size={18} /> : i + 1}
          </span>
          <div>
            <p className={`text-sm font-extrabold ${step.state === 'upcoming' ? 'text-awm-muted' : ''}`}>
              {step.label}
              <span className="sr-only"> — {t(step.state)}</span>
            </p>
            {step.at && <p className="mt-1 text-xs text-awm-muted">{formatDateTime(step.at, locale)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
