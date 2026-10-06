import { getTranslations } from 'next-intl/server';
import { Icon, type IconName } from '@/components/ui/Icon';

type Props = { eyebrow: string; title: string; description: string; children: React.ReactNode };

/** Form card on the start side, benefits panel on the end side (stacks on small screens). */
export async function AuthShell({ eyebrow, title, description, children }: Props) {
  const t = await getTranslations('auth.side');

  const benefits: { icon: IconName; key: 'service' | 'orders' | 'battery' }[] = [
    { icon: 'wrench', key: 'service' },
    { icon: 'truck', key: 'orders' },
    { icon: 'battery', key: 'battery' },
  ];

  return (
    <main className="container-awm py-10 lg:py-16">
      <div className="grid grid-cols-1 border border-awm-line bg-white lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="auth-title" className="p-6 sm:p-10">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold text-awm-red"><span aria-hidden="true" className="size-2 bg-awm-red" />{eyebrow}</p>
          <h1 id="auth-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
          <p className="mb-8 mt-3 max-w-xl text-base leading-7 text-awm-muted">{description}</p>
          {children}
        </section>

        <aside className="bg-awm-black p-6 text-white sm:p-10">
          <h2 className="mb-8 text-xl font-extrabold">{t('title')}</h2>
          <ul className="flex flex-col gap-7">
            {benefits.map(({ icon, key }) => (
              <li key={key} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center bg-white/10 text-awm-red"><Icon name={icon} size={22} /></span>
                <div>
                  <h3 className="font-extrabold">{t(`${key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/70">{t(`${key}.text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
