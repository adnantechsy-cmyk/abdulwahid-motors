import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Pagination } from '@/components/catalog/Pagination';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { OrdersTable } from '@/components/account/OrdersTable';
import { accountGet } from '@/lib/api/account';
import { pageParam, toQuery } from '@/lib/listing';
import type { LaravelPage, OrderRow } from '@/types/account';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = pageParam(await searchParams);

  const [t, orders] = await Promise.all([
    getTranslations('account'),
    accountGet<LaravelPage<OrderRow>>(`/account/orders?page=${page}`, locale),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">{t('orders.title')}</h1>
      <Panel id="orders" title={t('orders.title')}>
        {orders && orders.data.length > 0 ? (
          <>
            <OrdersTable orders={orders.data} locale={locale} />
            <Pagination current={orders.current_page} last={orders.last_page} href={(p) => ({ pathname: '/account/orders', query: toQuery({ page: p }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty.orders')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
