/** Latin digits in both languages (as in the designs); the currency code stays visible for USD/SYP clarity. */
export function formatMoney(amount: number | string, currency: string, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(Number(amount));
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-US').format(n);
}

export function formatDate(iso: string | null | undefined, locale: string, withTime = false): string {
  if (!iso) return '-';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
    timeZone: 'Asia/Damascus',
  }).format(new Date(iso));
}
