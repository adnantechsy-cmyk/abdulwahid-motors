import { getTranslations } from 'next-intl/server';
import { contactChannels } from '@/lib/site.config';
import { SocialIcons } from './SocialIcons';

/** Props shared by every external link: new tab, no opener leak, announced to screen readers. */
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Email, phone, WhatsApp and social links from site.config. Only the filled-in ones render.
 * `cards` is the large version for the Contact and About pages; `inline` is for the footer.
 */
export async function ContactChannels({ variant = 'cards' }: { variant?: 'cards' | 'inline' }) {
  const t = await getTranslations('site');
  const c = contactChannels();

  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-3 text-sm">
        {c.emails[0] && <a href={`mailto:${c.emails[0].address}`} className="font-bold text-awm-black hover:text-awm-red" dir="ltr">{c.emails[0].address}</a>}
        {c.phone && c.phoneHref && <a href={c.phoneHref} className="text-awm-muted hover:text-awm-red" dir="ltr">{c.phone}</a>}
        <SocialIcons size="sm" />
      </div>
    );
  }

  const tile = 'flex flex-col gap-1 border border-awm-line bg-white p-5 hover:border-awm-black';
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {c.emails.map((e) => (
          <li key={e.key}>
            <a href={`mailto:${e.address}`} className={`${tile} h-full border-s-4 border-s-awm-red`}>
              <span className="text-xs font-bold text-awm-muted">{t(`emailLabels.${e.key}`)}</span>
              <span className="break-all text-base font-extrabold sm:text-lg" dir="ltr">{e.address}</span>
            </a>
          </li>
        ))}
        {c.phone && c.phoneHref && (
          <li>
            <a href={c.phoneHref} className={`${tile} h-full`}>
              <span className="text-xs font-bold text-awm-muted">{t('phone')}</span>
              <span className="text-lg font-extrabold" dir="ltr">{c.phone}</span>
            </a>
          </li>
        )}
        {c.whatsappHref && (
          <li>
            <a href={c.whatsappHref} {...external} className={`${tile} h-full`}>
              <span className="text-xs font-bold text-awm-muted">{t('whatsapp')}</span>
              <span className="text-lg font-extrabold">{t('whatsappAction')}<span className="sr-only"> ({t('opensNewTab')})</span></span>
            </a>
          </li>
        )}
      </ul>

      <div>
        <h3 className="mb-3 text-sm font-bold text-awm-muted">{t('followUs')}</h3>
        <SocialIcons />
      </div>
    </div>
  );
}
