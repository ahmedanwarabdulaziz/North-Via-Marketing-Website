import crypto from 'crypto';

// Signed links for the buttons on a phone alarm (ntfy): each one can only do one thing to one
// task and expires after 3 days. Signed with TELEGRAM_WEBHOOK_SECRET (already a long secret).

export type TaskLinkAction = 'done' | 'snooze1h' | 'tomorrow';
const ACTIONS: TaskLinkAction[] = ['done', 'snooze1h', 'tomorrow'];
const VALID_DAYS = 3;
const SITE = 'https://www.northviamarketing.com';

function secret() {
  const s = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!s || s.length < 32) throw new Error('TELEGRAM_WEBHOOK_SECRET is not set.');
  return s;
}

function sign(taskId: string, action: string, exp: number) {
  return crypto.createHmac('sha256', secret()).update(`task:${taskId}:${action}:${exp}`).digest('base64url').slice(0, 32);
}

export function taskActionUrl(taskId: string, action: TaskLinkAction) {
  const exp = Math.floor(Date.now() / 1000) + VALID_DAYS * 86_400;
  const q = new URLSearchParams({ t: taskId, a: action, e: String(exp), s: sign(taskId, action, exp) });
  return `${SITE}/api/tasks/action?${q}`;
}

/** The task and action from a signed link, or null if it's forged, altered or expired. */
export function verifyTaskAction(params: URLSearchParams): { taskId: string; action: TaskLinkAction } | null {
  const taskId = params.get('t') || '';
  const action = params.get('a') as TaskLinkAction;
  const exp = Number(params.get('e'));
  const given = params.get('s') || '';
  if (!taskId || !ACTIONS.includes(action) || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = sign(taskId, action, exp);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? { taskId, action } : null;
}
