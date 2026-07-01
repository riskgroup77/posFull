/** Shtrix-kod formatini raqam uzunligiga qarab aniqlash */
export function getBarcodeFormat(code: string): 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 13) return 'EAN13';
  if (digits.length === 12) return 'UPC';
  if (digits.length === 8) return 'EAN8';
  return 'CODE128';
}

export function normalizeBarcodeValue(code: string): string {
  const trimmed = code.trim();
  const format = getBarcodeFormat(trimmed);
  if (format === 'CODE128') return trimmed;
  return trimmed.replace(/\D/g, '');
}
