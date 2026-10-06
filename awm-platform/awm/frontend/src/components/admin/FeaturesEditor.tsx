'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

export const FEATURE_SECTIONS = ['chassis', 'exterior', 'interior', 'safety'] as const;
export type FeatureSection = (typeof FEATURE_SECTIONS)[number];

/** Text of the two boxes (Arabic, English) for each section: one feature per line. */
export type FeatureText = Record<FeatureSection, { ar: string; en: string }>;

export const featuresToText = (features: Record<string, { ar?: string[]; en?: string[] }> | undefined): FeatureText =>
  Object.fromEntries(FEATURE_SECTIONS.map((s) => [s, { ar: (features?.[s]?.ar ?? []).join('\n'), en: (features?.[s]?.en ?? []).join('\n') }])) as FeatureText;

/** Lines in, trimmed and non-empty. A section with nothing in either language is left out. */
export function featuresFromText(text: FeatureText): Record<string, { ar: string[]; en: string[] }> {
  const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: Record<string, { ar: string[]; en: string[] }> = {};
  for (const s of FEATURE_SECTIONS) {
    const ar = lines(text[s].ar);
    const en = lines(text[s].en);
    if (ar.length || en.length) out[s] = { ar, en };
  }
  return out;
}

const area = 'w-full border border-awm-line bg-white p-3 text-sm leading-6 focus-visible:outline-3 focus-visible:outline-awm-red';

/** Feature lists shown on the car page, written as "Label: value", one per line, in both languages. */
export function FeaturesEditor({ value, onChange }: { value: FeatureText; onChange: (next: FeatureText) => void }) {
  const t = useTranslations('admin.vehicles.features');
  const id = useId();
  const set = (s: FeatureSection, lang: 'ar' | 'en', v: string) => onChange({ ...value, [s]: { ...value[s], [lang]: v } });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-awm-muted">{t('hint')}</p>
      {FEATURE_SECTIONS.map((s) => (
        <fieldset key={s} className="min-w-0 border border-awm-line bg-white p-4">
          <legend className="px-2 text-sm font-extrabold">{t(`sections.${s}`)}</legend>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(['ar', 'en'] as const).map((lang) => (
              <div key={lang} className="flex flex-col gap-2">
                <label htmlFor={`${id}-${s}-${lang}`} className="text-xs font-bold">{t(lang === 'ar' ? 'arabic' : 'english')}</label>
                <textarea
                  id={`${id}-${s}-${lang}`}
                  value={value[s][lang]}
                  onChange={(e) => set(s, lang, e.target.value)}
                  rows={Math.min(14, Math.max(4, value[s][lang].split('\n').length + 1))}
                  lang={lang}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  className={area}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
