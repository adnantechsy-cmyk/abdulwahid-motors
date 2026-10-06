import { getTranslations } from 'next-intl/server';
import { contactChannels } from '@/lib/site.config';

/** Props shared by every external link: new tab, no opener leak, announced to screen readers. */
const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Email, phone, WhatsApp and social links from site.config. Only the filled-in ones render.
 * `cards` is the large version for the Contact and About pages; `inline` is for the footer.
 * Returns null when nothing is configured so callers can show their own fallback via `hasChannels()`.
 */
export async function ContactChannels({ variant = 'cards' }: { variant?: 'cards' | 'inline' }) {
  const t = await getTranslations('site');
  const c = contactChannels();
  if (!c.email && !c.phone && !c.whatsapp && c.social.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="flex flex-col gap-3 text-sm">
        {c.email && <a href={`mailto:${c.email}`} className="font-bold text-awm-black hover:text-awm-red" dir="ltr">{c.email}</a>}
        {c.phone && c.phoneHref && <a href={c.phoneHref} className="text-awm-muted hover:text-awm-red" dir="ltr">{c.phone}</a>}
        {c.social.length > 0 && (
          <ul aria-label={t('social')} className="flex flex-wrap gap-2">
            {c.social.map((s) => (
              <li key={s.key}>
                <a href={s.href} {...external} className="inline-flex h-9 items-center border border-awm-line bg-white px-3 text-xs font-bold hover:border-awm-black hover:text-awm-red">
                  {s.label}<span className="sr-only"> ({t('opensNewTab')})</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const tile = 'flex flex-col gap-1 border border-awm-line bg-white p-5 hover:border-awm-black';
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {c.email && (
          <li>
            <a href={`mailto:${c.email}`} className={`${tile} h-full border-s-4 border-s-awm-red`}>
              <span className="text-xs font-bold text-awm-muted">{t('email')}</span>
              <span className="break-all text-lg font-extrabold" dir="ltr">{c.email}</span>
            </a>
          </li>
        )}
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

      {c.social.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-awm-muted">{t('followUs')}</h3>
          <ul aria-label={t('social')} className="flex flex-wrap gap-3">
            {c.social.map((s) => (
              <li key={s.key}>
                <a href={s.href} {...external} className="inline-flex h-12 items-center border-2 border-awm-black bg-white px-6 text-sm font-bold hover:bg-awm-black hover:text-white">
                  {s.label}<span className="sr-only"> ({t('opensNewTab')})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
