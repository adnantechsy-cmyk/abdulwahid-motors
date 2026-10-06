/** Arabic UI shows Arabic-Indic digits; prices keep the currency code visible for USD/SYP clarity. */
export function formatMoney(amount: number | string, currency: string, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Number(amount));
}

/** Invoices and orders: cents for USD, whole units for SYP. */
export function formatMoneyAuto(amount: number | string, currency: string, locale: string): string {
  return formatMoney(amount, currency, locale, currency === 'SYP' ? 0 : 2);
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US').format(n);
}

const TZ = 'Asia/Damascus';
const dateLocale = (locale: string) => (locale === 'ar' ? 'ar-SY' : 'en-GB');

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'medium', timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(dateLocale(locale), { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
}
