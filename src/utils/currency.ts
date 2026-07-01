/** Barcha summalar so'mda saqlanadi; USD faqat ko'rsatish uchun */

export function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} so'm`;
}

export function uzsToUsd(amountUzs: number, usdRate: number): number {
  if (!usdRate || usdRate <= 0) return 0;
  return amountUzs / usdRate;
}

export function usdToUzs(amountUsd: number, usdRate: number): number {
  if (!usdRate || usdRate <= 0) return 0;
  return Math.round(amountUsd * usdRate);
}

export type PriceCurrency = 'uzs' | 'usd';

/** Input qiymatini doim so'mga aylantiradi */
export function inputPriceToUzs(value: string, currency: PriceCurrency, usdRate: number): number {
  const num = parseFloat(value) || 0;
  if (currency === 'usd') return usdToUzs(num, usdRate);
  return num;
}

/** So'mdagi narxni tanlangan valyutada ko'rsatish uchun */
export function uzsToInputDisplay(amountUzs: number, currency: PriceCurrency, usdRate: number): string {
  if (!amountUzs) return '';
  if (currency === 'usd') {
    const usd = uzsToUsd(amountUzs, usdRate);
    return String(Math.round(usd * 100) / 100);
  }
  return String(amountUzs);
}

/** Valyuta o'zgarganda input qiymatini qayta hisoblash */
export function convertPriceInput(
  value: string,
  from: PriceCurrency,
  to: PriceCurrency,
  usdRate: number,
): string {
  const num = parseFloat(value);
  if (!value.trim() || Number.isNaN(num)) return value;
  if (from === to) return value;
  if (from === 'uzs' && to === 'usd') {
    return String(Math.round(uzsToUsd(num, usdRate) * 100) / 100);
  }
  return String(usdToUzs(num, usdRate));
}

export function formatUsd(amountUzs: number, usdRate: number): string {
  const usd = uzsToUsd(amountUzs, usdRate);
  return `$${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd)}`;
}

export function formatUsdPlain(amountUzs: number, usdRate: number): string {
  return formatUsd(amountUzs, usdRate).replace('$', '');
}
