'use client';

import { useState } from 'react';
import { Clock, Save, Check } from 'lucide-react';
import { saveDigestScheduleAction } from '@/app/actions/google-business';
import { DIGEST_TIMEZONES } from '@/lib/digest-schedule-options';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

function formatNext(iso: string | null, timezone: string) {
  if (!iso) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

interface Props {
  initial: { enabled: boolean; hours: number[]; days: number[]; timezone: string };
  nextRun: string | null;
}

export function DigestScheduleCard({ initial, nextRun: initialNext }: Props) {
  const [schedule, setSchedule] = useState(initial);
  const [nextRun, setNextRun] = useState(initialNext);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: 'hours' | 'days', value: number) {
    setSchedule((s) => ({
      ...s,
      [key]: s[key].includes(value) ? s[key].filter((v) => v !== value) : [...s[key], value].sort((a, b) => a - b),
    }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveDigestScheduleAction(schedule);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setNextRun(result.nextRun ?? null);
    } else {
      setError(result.error || 'Could not save.');
    }
  }

  const summary = schedule.enabled
    ? `${schedule.hours.map(hourLabel).join(', ') || 'No time'} · ${
        schedule.days.length === 7 ? 'every day' : DAY_ORDER.filter((d) => schedule.days.includes(d)).map((d) => DAYS[d]).join(', ')
      }`
    : 'Off';

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-zinc-50/60"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <div className="text-sm font-medium text-zinc-900">Telegram digest schedule</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {summary} · {DIGEST_TIMEZONES.find((t) => t.value === schedule.timezone)?.label}
            </div>
          </div>
        </div>
        <div className="text-xs text-zinc-500 sm:text-right">
          Next: <span className="font-medium text-zinc-700">{formatNext(nextRun, schedule.timezone)}</span>
          <span className="ml-2 text-blue-600 font-medium">{open ? 'Close' : 'Change'}</span>
        </div>
      </button>

      {open && (
        <div className="p-5 border-t border-zinc-100 space-y-5">
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(e) => {
                setSchedule((s) => ({ ...s, enabled: e.target.checked }));
                setSaved(false);
              }}
              className="w-4 h-4 rounded border-zinc-300 text-blue-600"
            />
            Send the review digest to Telegram automatically
          </label>

          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Times</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {Array.from({ length: 24 }, (_, hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => toggle('hours', hour)}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    schedule.hours.includes(hour) ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {hourLabel(hour)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Days</div>
              <div className="flex flex-wrap gap-1.5">
                {DAY_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggle('days', day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      schedule.days.includes(day) ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {DAYS[day]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block" htmlFor="digest-tz">Time zone</label>
              <select
                id="digest-tz"
                value={schedule.timezone}
                onChange={(e) => {
                  setSchedule((s) => ({ ...s, timezone: e.target.value }));
                  setSaved(false);
                }}
                className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2"
              >
                {DIGEST_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            n8n checks in every hour; the digest is only sent at the times above. Send <code>/check</code> to the bot anytime for an immediate check.
          </p>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
