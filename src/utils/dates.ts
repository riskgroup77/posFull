/** Toshkent vaqt zonasida YYYY-MM-DD */
export function toDateStr(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${day}`;
}

export function monthPrefix(d: Date = new Date()): string {
  return toDateStr(d).slice(0, 7);
}

export function monthNameUz(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('uz-UZ', { month: 'long', timeZone: 'Asia/Tashkent' }).format(d);
}

export function daysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

export function lastNDays(n: number, end: Date = new Date()): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dates.push(daysAgo(i, end));
  }
  return dates;
}

export function todayStart(): Date {
  const s = toDateStr();
  return new Date(`${s}T00:00:00`);
}
