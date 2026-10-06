import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { ButtonLink } from '@/components/ui/Button';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { OwnedVehicleListItem } from '@/types/account';

export async function OwnedVehicleCard({ vehicle: v, locale, as: Heading = 'h3' }: { vehicle: OwnedVehicleListItem; locale: string; as?: 'h2' | 'h3' }) {
  const t = await getTranslations('account.vehicles');
  const ta = await getTranslations('account.appointments');
  const title = [v.make, v.model, v.model_year].filter(Boolean).join(' ');

  const facts = [
    v.plate_number && { label: t('plate'), value: v.plate_number },
    v.vin && { label: t('vin'), value: v.vin, mono: true },
    v.color && { label: t('color'), value: v.color },
    v.last_mileage_km != null && { label: t('mileage'), value: t('km', { value: formatNumber(v.last_mileage_km, locale) }) },
  ].filter(Boolean) as { label: string; value: string; mono?: boolean }[];

  return (
    <article className="flex flex-col border border-awm-line bg-white">
      <div className="relative aspect-[16/9] bg-awm-surface">
        {v.image ? (
          <Image src={v.image} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-awm-muted"><Icon name="car" size={56} /></span>
        )}
        <Tag tone={v.under_warranty ? 'dark' : 'light'} className="absolute start-3 top-3">{v.under_warranty ? t('underWarranty') : t('warrantyEnded')}</Tag>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <Heading className="text-xl font-extrabold">{title}</Heading>

        <dl className="grid grid-cols-2 gap-2">
          {facts.map((f) => (
            <div key={f.label} className="bg-awm-panel p-3">
              <dt className="text-xs text-awm-muted">{f.label}</dt>
              <dd className={`mt-1 text-sm font-bold ${f.mono ? 'break-all font-mono' : ''}`} dir={f.mono ? 'ltr' : undefined}>{f.value}</dd>
            </div>
          ))}
          {v.warranty_until && (
            <div className="bg-awm-panel p-3">
              <dt className="text-xs text-awm-muted">{t('warranty')}</dt>
              <dd className="mt-1 text-sm font-bold">{formatDate(v.warranty_until, locale)}</dd>
            </div>
          )}
        </dl>

        {v.latest_battery_report && (
          <p className="flex items-center gap-2 text-sm">
            <Icon name="battery" size={18} className="text-awm-red" />
            <span className="font-bold">{t('soh', { value: formatNumber(Number(v.latest_battery_report.state_of_health_pct), locale) })}</span>
          </p>
        )}
        {v.next_appointment && (
          <p className="border-s-4 border-awm-red bg-awm-panel p-3 text-sm">
            <span className="block text-xs text-awm-muted">{t('nextAppointment')}</span>
            <span className="font-bold">{ta(`types.${v.next_appointment.service_type}`)} · {formatDateTime(v.next_appointment.starts_at, locale)}</span>
          </p>
        )}

        <ButtonLink href={`/account/vehicles/${v.id}`} variant="dark" size="md" className="mt-auto">{t('details')}</ButtonLink>
      </div>
    </article>
  );
}
