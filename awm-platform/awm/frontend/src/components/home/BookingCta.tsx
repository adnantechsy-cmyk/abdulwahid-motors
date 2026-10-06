import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export async function BookingCta() {
  const t = await getTranslations('home.cta');

  return (
    <section aria-labelledby="cta-title" className="bg-awm-black text-white">
      <div className="container-awm flex flex-col items-start justify-between gap-8 py-14 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold text-awm-red-light"><span aria-hidden="true" className="size-2 bg-awm-red" />{t('eyebrow')}</p>
          <h2 id="cta-title" className="text-3xl font-extrabold leading-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-3 text-base leading-7 text-white/70">{t('description')}</p>
        </div>
        <ButtonLink href="/service-booking" size="lg">{t('button')}<Icon name="arrow" /></ButtonLink>
      </div>
    </section>
  );
}
