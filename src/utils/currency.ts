/** Barcha summalar so'mda saqlanadi; USD faqat ko'rsatish uchun */

export function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(amount))} so'm`;
}

export function uzsToUsd(amountUzs: number, usdRate: number): number {
  if (!usdRate || usdRate <= 0) return 0;
  return amountUzs / usdRate;
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
