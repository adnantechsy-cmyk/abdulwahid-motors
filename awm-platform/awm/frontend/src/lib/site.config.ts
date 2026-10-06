/**
 * Public contact details and social links, shown on the Contact and About pages and in the footer.
 *
 * Fill in the real values below. Anything left empty is simply not shown (nothing is invented).
 * These are public marketing details, not secrets, so they live in code and go through review.
 */

export type EmailKey = 'info' | 'sales' | 'parts' | 'management';

export type SocialKey = 'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok' | 'linkedin' | 'telegram';

export const siteConfig = {
  /** One address per department, shown as mailto: links. The first is the general address used in the footer. */
  emails: [
    { key: 'info', address: 'info@abdulwahidmotors.com' },
    { key: 'sales', address: 'sales@abdulwahidmotors.com' },
    { key: 'parts', address: 'parts@abdulwahidmotors.com' },
    { key: 'management', address: 'management@abdulwahidmotors.com' },
  ] as { key: EmailKey; address: string }[],
  /** Shown as a tel: link. International format, e.g. '+963 11 000 0000' */
  phone: '',
  /** Digits only with country code, e.g. '963944000000'. Opens a WhatsApp chat. */
  whatsapp: '',
  /** Full https:// URLs of the company profiles. */
  social: {
    facebook: 'https://www.facebook.com/HadeForcarsHousesTrading',
    instagram: '',
    x: '',
    youtube: '',
    tiktok: '',
    linkedin: '',
    telegram: '',
  } satisfies Record<SocialKey, string>,
  /**
   * Opening hours shown on the Contact page. Mirrors `appointments.hours` in the Laravel config
   * (backend/config/awm.php): keep the two in sync. Days not listed are closed.
   */
  hours: [
    { days: ['sat', 'sun', 'mon', 'tue', 'wed'], open: '09:00', close: '17:00' },
    { days: ['thu'], open: '09:00', close: '15:00' },
  ] as { days: ('sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri')[]; open: string; close: string }[],
};

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
};

const httpsUrl = (value: string) => /^https:\/\/[^\s]+$/i.test(value.trim());

/** Only well-formed values come out, so a typo in the config can never produce a broken or unsafe link. */
export function contactChannels() {
  const emails = siteConfig.emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.address.trim())).map((e) => ({ key: e.key, address: e.address.trim() }));
  const phone = /^\+?[0-9 ()-]{6,24}$/.test(siteConfig.phone.trim()) ? siteConfig.phone.trim() : null;
  const whatsapp = /^[0-9]{8,15}$/.test(siteConfig.whatsapp.trim()) ? siteConfig.whatsapp.trim() : null;
  const social = (Object.keys(siteConfig.social) as SocialKey[])
    .filter((key) => httpsUrl(siteConfig.social[key]))
    .map((key) => ({ key, label: SOCIAL_LABELS[key], href: siteConfig.social[key].trim() }));

  return {
    emails,
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null,
    whatsapp,
    whatsappHref: whatsapp ? `https://wa.me/${whatsapp}` : null,
    social,
  };
}
