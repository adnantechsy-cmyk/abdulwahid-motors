import { getTranslations } from 'next-intl/server';
import { SearchForm } from '@/components/site/SearchForm';
import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Link } from '@/i18n/navigation';

// not-found files can't export metadata: the title comes from the layout default, and Next adds "noindex" itself.
// The response status stays 404 (set by notFound()), which is what keeps it out of the index.

/** Shown for any unknown URL and for notFound() inside the site pages, with the normal header and footer around it. */
export default async function NotFound() {
  const [t, n] = await Promise.all([getTranslations('notFound'), getTranslations('nav')]);

  const links: { href: '/vehicles' | '/parts' | '/services' | '/service-booking' | '/contact'; label: string; icon: IconName }[] = [
    { href: '/vehicles', label: n('vehicles'), icon: 'car' },
    { href: '/parts', label: n('parts'), icon: 'gear' },
    { href: '/services', label: n('services'), icon: 'wrench' },
    { href: '/contact', label: n('contact'), icon: 'pin' },
  ];

  return (
    <main className="container-awm py-16">
      <p className="mb-3 font-mono text-sm font-bold text-awm-red">{t('code')}</p>
      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{t('title')}</h1>
      <p className="mb-8 mt-4 max-w-2xl text-lg leading-8 text-awm-muted">{t('text')}</p>

      <div className="mb-12 max-w-2xl"><SearchForm id="nf-q" /></div>

      <section aria-labelledby="nf-links">
        <h2 id="nf-links" className="mb-4 text-xl font-extrabold">{t('links')}</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center gap-3 border border-awm-line bg-white p-4 font-bold hover:border-awm-black hover:text-awm-red">
                <Icon name={l.icon} size={20} className="text-awm-red" />{l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ButtonLink href="/" variant="dark" size="lg" className="mt-10">{t('home')}<Icon name="arrow" /></ButtonLink>
    </main>
  );
}
