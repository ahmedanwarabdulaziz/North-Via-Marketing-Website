import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appTask, clientNames } from '@/lib/app-api';
import { sanitizeTaskFields, taskClientList } from '@/lib/app-tasks';
import { snoozeUntil } from '@/lib/task-telegram';
import { completeTask, fieldsFromTask, getTask, missingFields, moveTaskToDay, setTaskStatus, snoozeTask, updateTaskFields } from '@/lib/tasks';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function loadTask(params: Ctx['params']) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) throw new AppError('Task not found.', 404);
  return task;
}

/** One task with its history (created, done, snoozed, moved …). */
export const GET = appRoute<Ctx>(async (_request, _device, { params }) => {
  const task = await loadTask(params);
  const { data: events } = await supabase.from('task_events').select('event, detail, created_at').eq('task_id', task.id).order('created_at', { ascending: false }).limit(30);
  return { task: appTask(task, await clientNames()), events: events || [] };
});

/**
 * Body: { action, ... }
 *   done | reopen | cancel
 *   snooze  { for: '1h' | '3h' | 'tm' }        (reminder only; the due date stays)
 *   move    { day: 'today' | 'tomorrow' }       (keeps the time of day)
 *   edit    { fields: { title?, date?, time?, ... } }
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const task = await loadTask(params);
  const body = await jsonBody<{ action?: unknown; for?: unknown; day?: unknown; fields?: unknown }>(request);
  const names = await clientNames();
  const reply = (t: typeof task, extra: Record<string, unknown> = {}) => ({ task: appTask(t, names), ...extra });

  switch (body.action) {
    case 'done': {
      if (task.status !== 'open') return reply(task, { message: 'Already handled' });
      const { task: updated, movedTo } = await completeTask(task.id);
      return reply(updated, { movedTo });
    }
    case 'reopen':
      return reply(await setTaskStatus(task.id, 'open'));
    case 'cancel':
      return reply(await setTaskStatus(task.id, 'cancelled'));
    case 'snooze': {
      const until = typeof body.for === 'string' && ['1h', '3h', 'tm'].includes(body.for) ? snoozeUntil(task, body.for) : null;
      if (!until) throw new AppError("for must be '1h', '3h' or 'tm'.");
      return reply(await snoozeTask(task.id, until), { until: until.toISOString() });
    }
    case 'move': {
      if (body.day !== 'today' && body.day !== 'tomorrow') throw new AppError("day must be 'today' or 'tomorrow'.");
      return reply(await moveTaskToDay(task.id, body.day));
    }
    case 'edit': {
      const patch = sanitizeTaskFields(body.fields, await taskClientList());
      const fields = { ...fieldsFromTask(task), ...patch };
      // A date given without "no date" clears it, and the other way round.
      if (patch.date) fields.noDate = false;
      if (patch.noDate) Object.assign(fields, { date: null, time: null });
      if (patch.time) fields.allDay = false;
      const needs = missingFields(fields);
      if (needs.length) return Response.json({ error: 'Some details are missing.', needs }, { status: 422 });
      return reply(await updateTaskFields(task.id, fields));
    }
    default:
      throw new AppError('Unknown action.');
  }
});
