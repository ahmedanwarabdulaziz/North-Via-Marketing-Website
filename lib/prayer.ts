import { getSetting, setSetting } from './data/store';
import { ringPhone } from './ntfy';
import { allowedChatIds, sendMessage, type OutgoingMessage } from './telegram';
import { cairoParts } from './tasks';

// Prayer alarms: each day's real prayer times (Aladhan API, Egyptian General Authority of
// Survey method) for Ahmed's city. /api/tasks/due runs every 5 minutes; when a prayer time has
// just passed, Telegram gets a message and the phone rings (ntfy). Never early, at most ~5 min late.
// /prayer in the bot shows today's times and switches city or turns the alarms off.

export const PRAYER_CITIES = {
  zayed: { name: 'Sheikh Zayed', nameAr: 'الشيخ زايد', lat: 30.0394, lng: 30.9842 },
  assiut: { name: 'Assiut', nameAr: 'أسيوط', lat: 27.1809, lng: 31.1837 },
} as const;
export type PrayerCity = keyof typeof PRAYER_CITIES;

export const PRAYERS = [
  { key: 'Fajr', ar: 'الفجر', emoji: '🌄' },
  { key: 'Dhuhr', ar: 'الظهر', emoji: '☀️' },
  { key: 'Asr', ar: 'العصر', emoji: '🌤' },
  { key: 'Maghrib', ar: 'المغرب', emoji: '🌇' },
  { key: 'Isha', ar: 'العشاء', emoji: '🌙' },
] as const;
type PrayerKey = (typeof PRAYERS)[number]['key'];

const SETTINGS = 'prayer_settings';
const STATE = 'prayer_state';
/** A prayer more than this late (e.g. a missed run) is skipped instead of ringing late. */
const LATE_LIMIT_MIN = 20;

export interface PrayerSettings {
  enabled: boolean;
  city: PrayerCity;
}

interface PrayerState {
  day: string; // Cairo date the times are for
  city: PrayerCity;
  times: Record<PrayerKey, string>; // "HH:MM" Cairo
  sent: PrayerKey[];
}

export async function getPrayerSettings(): Promise<PrayerSettings> {
  const s = await getSetting<Partial<PrayerSettings>>(SETTINGS).catch(() => null);
  return { enabled: s?.enabled ?? true, city: s?.city && s.city in PRAYER_CITIES ? s.city : 'zayed' };
}

export async function savePrayerSettings(changes: Partial<PrayerSettings>) {
  const current = await getPrayerSettings();
  await setSetting(SETTINGS, { ...current, ...changes });
}

async function fetchTimes(day: string, city: PrayerCity): Promise<Record<PrayerKey, string>> {
  const [y, m, d] = day.split('-');
  const c = PRAYER_CITIES[city];
  const response = await fetch(`https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${c.lat}&longitude=${c.lng}&method=5`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Prayer times API ${response.status}`);
  const data = (await response.json()) as { data?: { timings?: Record<string, string> } };
  const t = data.data?.timings;
  if (!t) throw new Error('Prayer times API returned no timings');
  const clean = (v: string) => (v.match(/\d{1,2}:\d{2}/)?.[0] || '').padStart(5, '0');
  const times = Object.fromEntries(PRAYERS.map((p) => [p.key, clean(t[p.key] || '')])) as Record<PrayerKey, string>;
  if (PRAYERS.some((p) => !times[p.key])) throw new Error('Prayer times API returned a bad time');
  return times;
}

/** Today's times for the city, fetched once a day and kept in app_settings. */
export async function todaysPrayerTimes(now = new Date()) {
  const settings = await getPrayerSettings();
  const { date } = cairoParts(now);
  const state = await getSetting<PrayerState>(STATE).catch(() => null);
  if (state?.day === date && state.city === settings.city && state.times) return { settings, state };
  const fresh: PrayerState = { day: date, city: settings.city, times: await fetchTimes(date, settings.city), sent: state?.day === date ? state.sent : [] };
  await setSetting(STATE, fresh);
  return { settings, state: fresh };
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Called every 5 minutes: sends and rings for a prayer whose time has just come. */
export async function sendPrayerAlarms(now = new Date()) {
  const { settings, state } = await todaysPrayerTimes(now);
  if (!settings.enabled) return { sent: [], reason: 'off' };
  const { time } = cairoParts(now);
  const nowMin = toMinutes(time);
  const due = PRAYERS.filter((p) => {
    const at = toMinutes(state.times[p.key]);
    return !state.sent.includes(p.key) && at <= nowMin && nowMin - at <= LATE_LIMIT_MIN;
  });
  // Times that passed long ago (e.g. right after switching city) are marked so they never ring late.
  const skipped = PRAYERS.filter((p) => !state.sent.includes(p.key) && !due.includes(p) && nowMin - toMinutes(state.times[p.key]) > LATE_LIMIT_MIN);
  if (!due.length && !skipped.length) return { sent: [] };

  // Marked before sending so overlapping runs can't send twice.
  await setSetting(STATE, { ...state, sent: [...state.sent, ...due.map((p) => p.key), ...skipped.map((p) => p.key)] });
  const city = PRAYER_CITIES[settings.city];
  for (const p of due) {
    const text = `🕌 <b>حان الآن موعد صلاة ${p.ar}</b> ${p.emoji}\n${state.times[p.key]} · ${city.nameAr}`;
    for (const chatId of allowedChatIds()) await sendMessage(chatId, { text, buttons: [[{ text: '🕌 Prayer times', callback_data: 'm:pr' }]] });
    await ringPhone({ title: `🕌 صلاة ${p.ar}`, message: `${state.times[p.key]} · ${city.nameAr}`, tags: ['mosque'] });
  }
  return { sent: due.map((p) => p.key), skipped: skipped.map((p) => p.key) };
}

/** The /prayer screen: today's times, the next one, city and on/off buttons. */
export async function prayerScreen(note?: string): Promise<OutgoingMessage> {
  const { settings, state } = await todaysPrayerTimes();
  const nowMin = toMinutes(cairoParts(new Date()).time);
  const next = PRAYERS.find((p) => toMinutes(state.times[p.key]) > nowMin);
  const city = PRAYER_CITIES[settings.city];
  const lines = [
    `🕌 <b>Prayer times · ${city.name}</b>`,
    `<i>${state.day} · Egyptian General Authority of Survey</i>`,
    '',
    ...PRAYERS.map((p) => `${p.emoji} ${p.ar} — <b>${state.times[p.key]}</b>${next?.key === p.key ? '  ⬅️ next' : state.sent.includes(p.key) ? '  ✓' : ''}`),
    '',
    settings.enabled ? '🔔 Alarms on: Telegram + phone ring at each prayer time.' : '🔕 Alarms are off.',
  ];
  if (note) lines.push('', note);
  const other: PrayerCity = settings.city === 'zayed' ? 'assiut' : 'zayed';
  return {
    text: lines.join('\n'),
    buttons: [
      [{ text: `📍 Switch to ${PRAYER_CITIES[other].name}`, callback_data: `m:pr:city-${other}` }],
      [settings.enabled ? { text: '🔕 Turn alarms off', callback_data: 'm:pr:off' } : { text: '🔔 Turn alarms on', callback_data: 'm:pr:on' }],
      [{ text: '⬅️ Menu', callback_data: 'm:home' }],
    ],
  };
}

/** m:pr, m:pr:on, m:pr:off, m:pr:city-<city>. Returns the note for the refreshed screen. */
export async function handlePrayerAction(action: string | undefined) {
  if (action === 'on' || action === 'off') {
    await savePrayerSettings({ enabled: action === 'on' });
    return action === 'on' ? '🔔 <i>Alarms turned on.</i>' : '🔕 <i>Alarms turned off.</i>';
  }
  if (action?.startsWith('city-')) {
    const city = action.slice(5) as PrayerCity;
    if (city in PRAYER_CITIES) {
      await savePrayerSettings({ city });
      return `📍 <i>Now using ${PRAYER_CITIES[city].name}.</i>`;
    }
  }
  return undefined;
}
