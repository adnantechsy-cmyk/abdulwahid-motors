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

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SY' : 'en-US').format(n);
}
