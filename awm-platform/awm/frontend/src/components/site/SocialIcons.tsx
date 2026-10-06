import { getTranslations } from 'next-intl/server';
import { contactChannels, socialLinks, type SocialKey } from '@/lib/site.config';

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Simple line glyphs (no brand artwork to load). Networks without a glyph fall back to their name. */
function Glyph({ name }: { name: SocialKey | 'whatsapp' }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
  if (name === 'instagram') return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></svg>;
  if (name === 'facebook') return <svg {...common}><path d="M14 8.5h2.5V4.8H14a4 4 0 0 0-4 4v2.2H7.5v3.7H10V21h3.7v-6.3h2.6l.7-3.7h-3.3V9.2c0-.4.3-.7.7-.7z" /></svg>;
  if (name === 'whatsapp') return <svg {...common}><path d="M3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z" /><path d="M9 8.6c-.3 1.9 1.6 4.9 4.6 5.8l1.4-1.2-1.8-1.1-.8.7c-.8-.3-1.6-1.1-1.9-1.9l.7-.8-1-1.8z" /></svg>;
  return null;
}

/**
 * Instagram, Facebook and WhatsApp (plus any other configured profile) as icon buttons.
 * A '#' placeholder still shows its icon but stays in the same tab, so nothing breaks while the real URL is pending.
 */
export async function SocialIcons({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const t = await getTranslations('site');
  const links = socialLinks();
  const wa = contactChannels().whatsappHref;
  const items = [
    ...links.map((s) => ({ key: s.key as SocialKey | 'whatsapp', label: s.label, href: s.href, placeholder: s.placeholder })),
    ...(wa ? [{ key: 'whatsapp' as const, label: 'WhatsApp', href: wa, placeholder: false }] : []),
  ];
  if (items.length === 0) return null;

  const box = size === 'sm' ? 'h-10 min-w-10 px-2' : 'h-12 min-w-12 px-3';
  return (
    <ul aria-label={t('social')} className="flex flex-wrap gap-3">
      {items.map((s) => (
        <li key={s.key}>
          <a
            href={s.href}
            {...(s.placeholder ? {} : external)}
            aria-label={s.placeholder ? `${s.label} (${t('comingSoon')})` : `${s.label}${' '}(${t('opensNewTab')})`}
            className={`inline-flex ${box} items-center justify-center border-2 border-awm-black bg-white text-awm-black hover:bg-awm-black hover:text-white`}
          >
            {s.key === 'instagram' || s.key === 'facebook' || s.key === 'whatsapp' ? <Glyph name={s.key} /> : <span className="text-xs font-bold">{s.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
