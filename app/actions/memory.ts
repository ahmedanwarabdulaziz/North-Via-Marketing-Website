'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { setSetting } from '@/lib/data/store';
import { setProfile } from '@/lib/assistant-memory';
import { addFactTo, removeFactFrom, updateFactIn, type FileKey } from '@/lib/memory-files';
import { deleteChatSummary, updateChatSummary } from '@/lib/chat-history';

// Admin → Memory: direct edits to every memory file. Edits here are deliberate, so they're saved
// as written (the Telegram path runs the conflict check instead).

type Result = { success: true } | { success: false; error: string };
const fail = (error: unknown): Result => ({ success: false, error: error instanceof Error ? error.message : 'Unexpected error' });
const validFile = (key: string): key is FileKey => key === 'general' || /^client:[A-Za-z0-9_-]{1,40}$/.test(key);

async function done(): Promise<Result> {
  revalidatePath('/admin/memory');
  return { success: true };
}

export async function saveMasterProfile(text: string): Promise<Result> {
  await requireAdmin();
  try {
    if (text.trim().length < 50) throw new Error('The master profile looks empty. Nothing was saved.');
    await setSetting('master_profile', { text: text.replace(/\r\n/g, '\n').slice(0, 60_000), updatedAt: new Date().toISOString() });
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function saveShortProfile(text: string): Promise<Result> {
  await requireAdmin();
  try {
    await setProfile(text);
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function addMemoryFact(file: string, text: string, label: 'email' | 'general' = 'general'): Promise<Result> {
  await requireAdmin();
  try {
    if (!validFile(file) || !text.trim()) throw new Error('Nothing to add.');
    await addFactTo(file, text, file === 'general' ? label : 'general');
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function updateMemoryFact(file: string, id: string, text: string): Promise<Result> {
  await requireAdmin();
  try {
    if (!validFile(file)) throw new Error('Unknown file.');
    await updateFactIn(file, id, text);
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMemoryFact(file: string, id: string): Promise<Result> {
  await requireAdmin();
  try {
    if (!validFile(file)) throw new Error('Unknown file.');
    await removeFactFrom(file, id);
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function saveChatSummary(sessionId: string, summary: string): Promise<Result> {
  await requireAdmin();
  try {
    await updateChatSummary(sessionId, { summary: summary.trim().slice(0, 500) });
    return done();
  } catch (error) {
    return fail(error);
  }
}

export async function removeChatSummary(sessionId: string): Promise<Result> {
  await requireAdmin();
  try {
    await deleteChatSummary(sessionId);
    return done();
  } catch (error) {
    return fail(error);
  }
}
