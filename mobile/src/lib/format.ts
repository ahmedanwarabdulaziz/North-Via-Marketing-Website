// Dates are shown in Cairo time, like the bot.

const TZ = 'Africa/Cairo';

export function ago(iso: string | null | undefined) {
  if (!iso) return '';
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ });
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ });
}

/** Today's date in Cairo, YYYY-MM-DD. */
export function cairoDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return parts; // en-CA formats as YYYY-MM-DD
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Arabic text reads right to left. */
export function isRtl(text: string | null | undefined) {
  return Boolean(text && /[؀-ۿ]/.test(text.slice(0, 40)));
}
