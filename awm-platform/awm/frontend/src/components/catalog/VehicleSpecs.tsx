import { getTranslations } from 'next-intl/server';
import { SpecList, type SpecRow } from '@/components/catalog/SpecList';
import { formatSpecValue, groupSpecs, humanizeKey, unitFor } from '@/lib/specs';

type Props = { specs: Record<string, string | number> | null; overview: SpecRow[]; locale: string };

/**
 * The specification table, in sections (overview, dimensions, performance, battery and charging, wheels, other).
 * Labels, units and coded values (drive, transmission...) come from the messages, so Arabic and English both read naturally.
 */
export async function VehicleSpecs({ specs, overview, locale }: Props) {
  const t = await getTranslations('detail');

  const unit = (key: string) => {
    const u = unitFor(key);
    return u ? t(`units.${u}`) : undefined;
  };
  const label = (key: string) => (t.has(`specNames.${key}`) ? t(`specNames.${key}`) : humanizeKey(key));
  // Some specs are codes ("awd", "e_cvt") with a translated meaning; free text and numbers show as they are.
  const value = (key: string, v: string | number) => (typeof v === 'string' && t.has(`specValues.${key}.${v}`) ? t(`specValues.${key}.${v}`) : formatSpecValue(v, locale, unit(key)));

  const groups = [
    { id: 'overview', title: t('specSections.overview'), rows: overview },
    ...groupSpecs(specs).map((g) => ({ id: g.section, title: t(`specSections.${g.section}`), rows: g.entries.map(([k, v]): SpecRow => ({ label: label(k), value: value(k, v) })) })),
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`spec-${g.id}`}>
          <h3 id={`spec-${g.id}`} className="mb-3 flex items-center gap-3 text-lg font-extrabold"><span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{g.title}</h3>
          <SpecList rows={g.rows} />
        </section>
      ))}
    </div>
  );
}