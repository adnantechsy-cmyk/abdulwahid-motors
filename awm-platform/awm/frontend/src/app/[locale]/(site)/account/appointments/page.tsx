import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AppointmentList } from '@/components/account/AppointmentList';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { Pagination } from '@/components/catalog/Pagination';
import { ButtonLink } from '@/components/ui/Button';
import { accountGet } from '@/lib/api/account';
import { pageParam, toQuery } from '@/lib/listing';
import type { AppointmentRow, LaravelPage } from '@/types/account';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AppointmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = pageParam(await searchParams);

  const [t, list] = await Promise.all([getTranslations('account'), accountGet<LaravelPage<AppointmentRow>>(`/account/appointments?page=${page}`, locale)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">{t('appointments.title')}</h1>
        <ButtonLink href="/service-booking">{t('bookAppointment')}</ButtonLink>
      </div>
      <Panel id="appointments" title={t('appointments.title')}>
        {list && list.data.length > 0 ? (
          <>
            <AppointmentList appointments={list.data} locale={locale} />
            <Pagination current={list.current_page} last={list.last_page} href={(p) => ({ pathname: '/account/appointments', query: toQuery({ page: p }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty.appointments')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
