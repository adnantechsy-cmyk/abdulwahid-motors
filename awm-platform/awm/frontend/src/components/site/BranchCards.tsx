import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

const BRANCHES = ['sahnaya', 'kafr_sousa'] as const;

/** The two real branches (the same ones Laravel books appointments for), each with a directions link. */
export async function BranchCards({ withBooking = false, single = false }: { withBooking?: boolean; single?: boolean }) {
  const t = await getTranslations('booking.branches');
  const tc = await getTranslations('contact.branches');
  const company = (await getTranslations('brand'))('name');

  return (
    <ul className={`grid grid-cols-1 gap-4 ${single ? '' : 'md:grid-cols-2'}`}>
      {BRANCHES.map((b) => {
        const title = t(`${b}.title`);
        const address = t(`${b}.text`);
        // A plain search link: no map embed, no tracking script, nothing to load.
        const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${title} ${address}`)}`;
        return (
          <li key={b} className="flex flex-col gap-4 border border-awm-line bg-white p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center bg-awm-black text-white"><Icon name="pin" size={22} /></span>
              <div>
                <h3 className="text-xl font-extrabold">{title}</h3>
                <p className="mt-1 text-awm-muted">{address}</p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center whitespace-nowrap border-2 border-awm-black px-4 text-sm font-bold hover:bg-awm-black hover:text-white">
                {tc('directions')}
              </a>
              {withBooking && <ButtonLink href="/service-booking" size="sm">{tc('bookHere')}</ButtonLink>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
