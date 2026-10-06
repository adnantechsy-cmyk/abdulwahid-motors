import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MessageActions } from '@/components/admin/MessageActions';
import { EmptyNote, Panel } from '@/components/account/Panel';
import { Pagination } from '@/components/catalog/Pagination';
import { Link } from '@/i18n/navigation';
import { adminGet, requirePermission } from '@/lib/api/admin';
import { formatDateTime } from '@/lib/format';
import { oneOf, pageParam, param, toQuery } from '@/lib/listing';
import { contactChannels } from '@/lib/site.config';
import type { LaravelPage } from '@/types/account';
import type { AdminContactMessage } from '@/types/admin';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUSES = ['open', 'handled', 'all'] as const;
const TOPICS = ['info', 'sales', 'parts', 'management'] as const;

export default async function MessagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission(locale, 'customers.manage');

  const raw = await searchParams;
  const status = oneOf(param(raw, 'status'), STATUSES) ?? 'open';
  const topic = oneOf(param(raw, 'topic'), TOPICS);
  const page = pageParam(raw);

  const query = new URLSearchParams({ status, page: String(page), ...(topic ? { topic } : {}) });
  const [t, list] = await Promise.all([getTranslations('admin.messages'), adminGet<LaravelPage<AdminContactMessage>>(`/admin/contact-messages?${query}`, locale)]);
  const wa = contactChannels().whatsapp;

  const chip = (active: boolean) => `inline-flex h-9 items-center whitespace-nowrap border px-4 text-sm font-bold ${active ? 'border-awm-black bg-awm-black text-white' : 'border-awm-line bg-white hover:border-awm-black'}`;
  const href = (next: { status?: string; topic?: string | undefined }) => ({
    pathname: '/admin/messages' as const,
    query: toQuery({ status: (next.status ?? status) === 'open' ? undefined : (next.status ?? status), topic: 'topic' in next ? next.topic : topic }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-awm-muted">{t('intro')}</p>
      </div>

      <div className="flex flex-wrap gap-6">
        <nav aria-label={t('statusLabel')} className="flex flex-wrap gap-2">
          {STATUSES.map((x) => <Link key={x} href={href({ status: x })} aria-current={status === x ? 'page' : undefined} className={chip(status === x)}>{t(`statuses.${x}`)}</Link>)}
        </nav>
        <nav aria-label={t('topicLabel')} className="flex flex-wrap gap-2">
          <Link href={href({ topic: undefined })} aria-current={!topic ? 'true' : undefined} className={chip(!topic)}>{t('allTopics')}</Link>
          {TOPICS.map((x) => <Link key={x} href={href({ topic: x })} aria-current={topic === x ? 'true' : undefined} className={chip(topic === x)}>{t(`topics.${x}`)}</Link>)}
        </nav>
      </div>

      <Panel id="messages-list" title={t(`statuses.${status}`)}>
        {list && list.data.length > 0 ? (
          <>
            <ul className="flex flex-col gap-4">
              {list.data.map((m) => {
                const digits = m.phone?.replace(/\D/g, '');
                return (
                  <li key={m.id} className={`flex flex-col gap-3 border border-awm-line p-4 ${m.handled ? 'bg-awm-panel' : 'bg-white'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold">{m.name}</p>
                        <p className="mt-1 text-xs text-awm-muted">{t(`topics.${m.topic}`)} · {formatDateTime(m.created_at, locale)} · {t(m.locale === 'ar' ? 'inArabic' : 'inEnglish')}{!m.mailed && <span className="ms-2 font-bold text-awm-red">{t('notMailed')}</span>}</p>
                      </div>
                      <MessageActions id={m.id} handled={m.handled} />
                    </div>
                    <p className="whitespace-pre-line text-sm leading-7" dir="auto">{m.message}</p>
                    <div className="flex flex-wrap gap-4 text-sm font-bold">
                      {m.phone && <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} className="text-awm-red underline underline-offset-4" dir="ltr">{m.phone}</a>}
                      {m.phone && digits && wa && <a href={`https://wa.me/${digits.startsWith('0') ? `963${digits.slice(1)}` : digits}`} target="_blank" rel="noopener noreferrer" className="text-awm-red underline underline-offset-4">{t('whatsapp')}<span className="sr-only"> ({t('opensNewTab')})</span></a>}
                      {m.email && <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: Abdul Wahid Motors')}`} className="text-awm-red underline underline-offset-4" dir="ltr">{m.email}</a>}
                    </div>
                    {m.handled && m.handled_at && <p className="text-xs text-awm-muted">{t('handledAt', { when: formatDateTime(m.handled_at, locale) })}</p>}
                  </li>
                );
              })}
            </ul>
            <Pagination current={list.current_page} last={list.last_page} href={(n) => ({ pathname: '/admin/messages', query: toQuery({ status: status === 'open' ? undefined : status, topic, page: n }) })} />
          </>
        ) : (
          <EmptyNote>{t('empty')}</EmptyNote>
        )}
      </Panel>
    </div>
  );
}