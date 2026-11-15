import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appTask, clientNames } from '@/lib/app-api';
import { sanitizeTaskFields, taskClientList } from '@/lib/app-tasks';
import { createTask, groupTasks, listDoneSince, listOpenTasks, missingFields, type TaskFields } from '@/lib/tasks';
import { QUESTION_TEXT, understandTaskMessage } from '@/lib/task-ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET ?view=open (default): open tasks grouped like the bot (overdue, today, tomorrow, week, no date).
 * GET ?view=done: what was done in the last 7 days.
 */
export const GET = appRoute(async (request) => {
  const view = new URL(request.url).searchParams.get('view') || 'open';
  const now = new Date();
  const names = await clientNames();
  if (view === 'done') {
    const done = await listDoneSince(new Date(now.getTime() - 7 * 86_400_000));
    return { done: done.map((d) => ({ at: d.at, task: appTask(d.task, names, now) })) };
  }
  if (view !== 'open') throw new AppError('view must be open or done.');
  const groups = groupTasks(await listOpenTasks(), now);
  const map = (list: typeof groups.today) => list.map((t) => appTask(t, names, now));
  return {
    overdue: map(groups.overdue),
    today: map(groups.today),
    tomorrow: map(groups.tomorrow),
    week: map(groups.week),
    noDate: map(groups.nodate),
  };
});

/**
 * Adds a task, the same way the bot does: nothing is guessed.
 * - { text } or { audio: { data: base64, mimeType }, text? }: the AI reads it. When everything
 *   is clear the task is saved ({ task }); otherwise { needs, questions, fields } comes back and
 *   the app asks, then sends { fields } with the answers filled in.
 * - { fields }: saved when complete, else 422 with { needs }.
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; audio?: { data?: unknown; mimeType?: unknown }; fields?: unknown }>(request);
  const clients = await taskClientList();
  const names = await clientNames();

  let fields: TaskFields;
  let heard: string | null = null;
  let rawInput: string | null = null;
  let source = 'app';
  if (body.fields !== undefined) {
    fields = sanitizeTaskFields(body.fields, clients);
  } else {
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 4000) : '';
    const audio =
      body.audio && typeof body.audio.data === 'string' && typeof body.audio.mimeType === 'string'
        ? { data: body.audio.data, mimeType: body.audio.mimeType }
        : undefined;
    if (!text && !audio) throw new AppError('Send text, audio or fields.');
    if (audio && audio.data.length > 14_000_000) throw new AppError('The voice note is too long.', 413);
    const understood = await understandTaskMessage(text, clients, undefined, audio);
    fields = understood.fields;
    heard = understood.heard;
    rawInput = heard || text;
    source = audio ? 'app-voice' : 'app';
  }
  if (!fields.title?.trim()) throw new AppError('The task needs a title.', 422);

  const needs = missingFields(fields);
  if (needs.length) {
    return Response.json(
      { saved: false, needs, questions: Object.fromEntries(needs.map((n) => [n, QUESTION_TEXT[n]])), fields, heard },
      { status: body.fields !== undefined ? 422 : 200 }
    );
  }
  const task = await createTask(fields, { source, rawInput });
  return { saved: true, task: appTask(task, names), heard };
});
