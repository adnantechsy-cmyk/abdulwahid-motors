import { getTranslations } from 'next-intl/server';
import { formatDateTime } from '@/lib/format';
import type { AppointmentRow } from '@/types/account';
import { CancelAppointment } from './CancelAppointment';
import { TableScroll, td, th } from './Panel';
import { StatusPill } from './StatusPill';

export async function AppointmentList({ appointments, locale }: { appointments: AppointmentRow[]; locale: string }) {
  const t = await getTranslations('account');
  const ta = await getTranslations('account.appointments');
  const label = (key: string, group: 'types' | 'statuses', value: string) => (ta.has(`${group}.${value}`) ? ta(`${group}.${value}`) : value);

  return (
    <TableScroll label={ta('title')}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={th}>{ta('number')}</th>
            <th scope="col" className={th}>{ta('when')}</th>
            <th scope="col" className={th}>{ta('service')}</th>
            <th scope="col" className={th}>{ta('branch')}</th>
            <th scope="col" className={th}>{ta('vehicle')}</th>
            <th scope="col" className={th}>{ta('status')}</th>
            <th scope="col" className={th}><span className="sr-only">{ta('cancel')}</span></th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.number}>
              <th scope="row" className={`${td} text-start font-mono font-bold`} dir="ltr">{a.number}</th>
              <td className={`${td} whitespace-nowrap`}>{formatDateTime(a.starts_at, locale)}</td>
              <td className={td}>{label('', 'types', a.service_type)}</td>
              <td className={td}>{t.has(`branch.${a.branch}`) ? t(`branch.${a.branch}`) : a.branch}</td>
              <td className={td}>{a.vehicle ?? '—'}</td>
              <td className={td}><StatusPill code={a.status} label={label('', 'statuses', a.status)} /></td>
              <td className={td}>{a.can_cancel && <CancelAppointment number={a.number} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
