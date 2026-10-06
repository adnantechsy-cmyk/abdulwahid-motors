import { getLocale, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';
import type { SiteSettings } from '@/types/site';

export async function SiteFooter({ settings }: { settings: SiteSettings | null }) {
  const t = await getTranslations('site.footer');
  const locale = await getLocale();
  const v = settings?.values ?? {};
  const years = Number(v['company.years_experience'] ?? 16);
  const phone = v['contact.phone'] as string | null;
  const email = v['contact.email'] as string | null;
  const whatsapp = v['contact.whatsapp'] as string | null;

  return (
    <footer className="border-t-4 border-awm-black bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-3 text-lg font-extrabold"><span className="flex size-9 items-center justify-center bg-awm-black font-mono text-sm text-white">AW</span>{settings?.name ?? t('brand')}</p>
          <p className="text-sm leading-7 text-awm-muted">{t('about', { years })}</p>
          <div className="flex gap-2">
            {phone && <a href={`tel:${phone}`} aria-label={t('call')} className="flex size-10 items-center justify-center border border-awm-black hover:bg-awm-black hover:text-white"><Icon name="phone" size={16} /></a>}
            {email && <a href={`mailto:${email}`} aria-label={t('email')} className="flex size-10 items-center justify-center border border-awm-black font-bold hover:bg-awm-black hover:text-white">@</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} aria-label="WhatsApp" className="flex h-10 items-center border border-awm-black px-3 text-xs font-bold hover:bg-awm-black hover:text-white">WhatsApp</a>}
          </div>
        </div>

        <nav aria-labelledby="f-nav" className="flex flex-col gap-3">
          <h2 id="f-nav" className="border-s-4 border-awm-red ps-3 font-extrabold">{t('quickLinks')}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/about" className="hover:text-awm-red">{t('links.about')}</Link></li>
            <li><Link href="/vehicles" className="hover:text-awm-red">{t('links.vehicles')}</Link></li>
            <li><Link href="/parts" className="hover:text-awm-red">{t('links.parts')}</Link></li>
            <li><Link href="/services" className="hover:text-awm-red">{t('links.service')}</Link></li>
            <li><Link href={{ pathname: '/contact', query: { topic: 'test_drive' } }} className="hover:text-awm-red">{t('links.testDrive')}</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="f-portal" className="flex flex-col gap-3">
          <h2 id="f-portal" className="border-s-4 border-awm-red ps-3 font-extrabold">{t('portal')}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link href="/login" className="hover:text-awm-red">{t('links.login')}</Link></li>
            <li><Link href="/register" className="hover:text-awm-red">{t('links.register')}</Link></li>
            <li><Link href="/account" className="hover:text-awm-red">{t('links.orders')}</Link></li>
            <li><Link href="/account" className="hover:text-awm-red">{t('links.invoices')}</Link></li>
          </ul>
        </nav>

        <section aria-labelledby="f-branches" className="flex flex-col gap-3">
          <h2 id="f-branches" className="border-s-4 border-awm-red ps-3 font-extrabold">{t('branches')}</h2>
          <ul className="flex flex-col gap-3">
            {(settings?.branches ?? []).map((b) => {
              const map = v[`branches.${b.code}.map_url`] as string | null;
              const tel = v[`branches.${b.code}.phone`] as string | null;
              return (
                <li key={b.code} className="bg-awm-surface p-4 text-sm">
                  <p className="font-bold">{b.name}</p>
                  <p className="text-awm-muted">{[b.street, b.city].join(locale === 'ar' ? '، ' : ', ')}</p>
                  <p className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
                    {tel && <a href={`tel:${tel}`} dir="ltr" className="font-mono hover:text-awm-red">{tel}</a>}
                    {map && <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-awm-red"><Icon name="pin" size={14} />{t('map')}</a>}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="border-t border-awm-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-awm-muted lg:px-6">
          <p>© {new Date().getFullYear()} {settings?.name ?? t('brand')}. {t('rights')}</p>
          <p className="flex gap-4"><Link href="/privacy" className="hover:text-awm-red">{t('privacy')}</Link><Link href="/terms" className="hover:text-awm-red">{t('terms')}</Link></p>
        </div>
      </div>
    </footer>
  );
}
