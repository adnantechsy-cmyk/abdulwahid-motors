import { getTranslations } from 'next-intl/server';
import { branchMapQuery, siteConfig } from '@/lib/site.config';

const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;

/**
 * One interactive Google map per branch. Until an exact pin is set in `siteConfig.branchMaps`, the map
 * searches for the branch by name and address, which is good enough to get customers to the right street.
 * Loaded lazily, so it never slows down the first paint.
 */
export async function BranchMaps({ locale }: { locale: string }) {
  const t = await getTranslations('booking.branches');
  const tc = await getTranslations('contact.branches');
  const company = (await getTranslations('brand'))('name');

  return (
    <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {BRANCHES.map((b) => {
        const title = t(`${b}.title`);
        const address = t(`${b}.text`);
        // Only a genuine Google embed URL is accepted from the config.
        const configured = siteConfig.branchMaps[b].trim();
        const pinned = configured.startsWith('https://www.google.com/maps/embed') ? configured : '';
        const src = pinned || `https://www.google.com/maps?q=${encodeURIComponent(branchMapQuery(company, title, address))}&hl=${locale}&z=16&output=embed`;
        const open = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${title} ${address}`)}`;
        return (
          <li key={b} className="flex flex-col border border-awm-line bg-white">
            <iframe
              title={tc('mapTitle', { branch: title })}
              src={src}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="h-72 w-full border-0 sm:h-80"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h3 className="font-extrabold">{title}</h3>
                <p className="text-sm text-awm-muted">{address}</p>
              </div>
              <a href={open} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center whitespace-nowrap border-2 border-awm-black px-4 text-sm font-bold hover:bg-awm-black hover:text-white">
                {tc('directions')}<span className="sr-only"> ({tc('opensNewTab')})</span>
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
