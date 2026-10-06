import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/lib/site.config';

const ALL_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** Hours from site.config; any day not listed is shown as closed. Times use the page's digits. */
export async function OpeningHours({ locale }: { locale: string }) {
  const t = await getTranslations('contact.hours');
  const two = new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US', { minimumIntegerDigits: 2, useGrouping: false });
  const time = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return `${two.format(h)}:${two.format(m)}`;
  };

  const rows = ALL_DAYS.map((day) => {
    const slot = siteConfig.hours.find((h) => h.days.includes(day));
    return { day, hours: slot ? `${time(slot.open)} – ${time(slot.close)}` : null };
  });

  return (
    <section aria-labelledby="hours-title" className="border border-awm-line bg-white">
      <h3 id="hours-title" className="flex items-center gap-3 border-b border-awm-line px-5 py-4 text-lg font-extrabold">
        <span aria-hidden="true" className="h-5 w-1 bg-awm-red" />{t('title')}
      </h3>
      <dl>
        {rows.map((r) => (
          <div key={r.day} className="flex items-center justify-between gap-4 border-b border-awm-line px-5 py-3 text-sm last:border-b-0">
            <dt className="font-bold">{t(`days.${r.day}`)}</dt>
            <dd className={r.hours ? 'font-mono tabular-nums' : 'text-awm-muted'} dir={r.hours ? 'ltr' : undefined}>{r.hours ?? t('closed')}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-awm-line px-5 py-3 text-xs text-awm-muted">{t('note')}</p>
    </section>
  );
}
