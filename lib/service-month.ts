// Service month = the month an invoice is booked under. It is picked from the
// billing period by counting days: whichever month holds most of the period
// wins, so a client paying Sep 25 - Oct 24 lands in October and one paying
// Oct 1 - Oct 31 also lands in October. Ties go to the earlier month.

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseYMD(value?: string) {
  const match = value?.match(YMD);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function serviceMonthFromPeriod(from?: string, to?: string): { key: string; days: number; totalDays: number } | null {
  const start = parseYMD(from);
  const end = parseYMD(to) || start;
  if (!start || !end || end < start) return start ? { key: monthKey(start), days: 1, totalDays: 1 } : null;

  const counts = new Map<string, number>();
  let totalDays = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = monthKey(d);
    counts.set(key, (counts.get(key) || 0) + 1);
    totalDays++;
  }

  let best = { key: monthKey(start), days: 0 };
  counts.forEach((days, key) => {
    if (days > best.days) best = { key, days };
  });
  return { ...best, totalDays };
}

export function serviceMonthLabel(key?: string, short = false) {
  const match = key?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString('en-US', { month: short ? 'short' : 'long', year: 'numeric' });
}
