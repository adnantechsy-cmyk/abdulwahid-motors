import { getTranslations } from 'next-intl/server';

const SECTIONS = ['chassis', 'exterior', 'interior', 'safety'] as const;

/** "Label: value" lines from the car's feature lists, grouped by section. The label is bold, the value follows. */
export async function VehicleFeatures({ features }: { features: Record<string, string[]> | null | undefined }) {
  const t = await getTranslations('detail');
  const shown = SECTIONS.filter((s) => (features?.[s]?.length ?? 0) > 0);
  if (shown.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {shown.map((section) => (
        <section key={section} aria-labelledby={`feat-${section}`} className="border border-awm-line bg-white p-5">
          <h3 id={`feat-${section}`} className="mb-4 flex items-center gap-3 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t(`featureSections.${section}`)}</h3>
          <ul className="flex flex-col gap-3 text-sm leading-6">
            {(features?.[section] ?? []).map((line) => {
              const i = line.indexOf(':');
              return (
                <li key={line}>
                  {i > 0 ? (<><span className="font-bold">{line.slice(0, i)}:</span> <span className="text-awm-muted">{line.slice(i + 1).trim()}</span></>) : <span className="text-awm-muted">{line}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}