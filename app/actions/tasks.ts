'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { toAdminTask } from '@/lib/admin-tasks';
import { completeTask, createTask, getTask, moveTaskToDay, setTaskStatus, updateTaskFields, type RepeatRule, type TaskFields } from '@/lib/tasks';

export interface TaskInput {
  id?: string;
  title: string;
  notes?: string;
  category: 'work' | 'personal';
  clientId?: string | null;
  date?: string | null; // YYYY-MM-DD, Cairo
  time?: string | null; // HH:MM, Cairo
  allDay?: boolean;
  priority?: 'low' | 'normal' | 'high';
  remindBeforeMin?: number;
  repeat?: RepeatRule | null;
  repeatUntil?: string | null;
  repeatCount?: number | null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

function refresh(clientId?: string | null) {
  revalidatePath('/admin/tasks');
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

function toFields(input: TaskInput): TaskFields {
  const title = input.title.trim();
  if (!title) throw new Error('The task needs a title.');
  const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  const time = date && !input.allDay && input.time && /^\d{2}:\d{2}$/.test(input.time) ? input.time : null;
  const repeat = date && input.repeat ? input.repeat : null;
  return {
    title,
    notes: input.notes?.trim() || null,
    kind: 'task',
    category: input.category,
    clientId: input.category === 'work' ? input.clientId || null : null,
    noClient: input.category === 'work' && !input.clientId,
    date,
    time,
    allDay: Boolean(date && !time),
    noDate: !date,
    priority: input.priority || 'normal',
    remindBeforeMin: Math.max(0, Math.round(input.remindBeforeMin || 0)),
    repeat,
    repeatUntil: repeat ? input.repeatUntil || null : null,
    repeatCount: repeat ? input.repeatCount || null : null,
    repeatForever: Boolean(repeat && !input.repeatUntil && !input.repeatCount),
  };
}

/** Creates or updates a task from the panel. */
export async function saveTask(input: TaskInput) {
  await requireAdmin();
  try {
    const fields = toFields(input);
    const before = input.id ? await getTask(input.id) : null;
    const task = input.id ? await updateTaskFields(input.id, fields) : await createTask(fields, { source: 'panel' });
    refresh(task.client_id);
    if (before?.client_id && before.client_id !== task.client_id) refresh(before.client_id);
    return { success: true as const, task: toAdminTask(task) };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

/** Done: a repeating task moves to its next date instead of closing. */
export async function markTaskDone(id: string) {
  await requireAdmin();
  try {
    const { task, movedTo } = await completeTask(id);
    refresh(task.client_id);
    return { success: true as const, task: toAdminTask(task), movedTo };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

/** Reopen a done task, or remove (cancel) one; removed tasks stop showing anywhere. */
export async function setTaskState(id: string, status: 'open' | 'cancelled') {
  await requireAdmin();
  try {
    const task = await setTaskStatus(id, status);
    refresh(task.client_id);
    return { success: true as const, task: toAdminTask(task) };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

/** Moves tasks (e.g. the overdue ones) to today or tomorrow, keeping their time of day. */
export async function moveTasks(ids: string[], day: 'today' | 'tomorrow') {
  await requireAdmin();
  try {
    const moved = [];
    for (const id of ids.slice(0, 200)) moved.push(toAdminTask(await moveTaskToDay(id, day)));
    revalidatePath('/admin/tasks');
    for (const clientId of new Set(moved.map((t) => t.clientId).filter(Boolean))) revalidatePath(`/admin/clients/${clientId}`);
    return { success: true as const, tasks: moved };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
