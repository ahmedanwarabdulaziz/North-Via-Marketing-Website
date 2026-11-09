'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { deleteCompetitor, runCompetitorChecks, saveCompetitor } from '@/lib/competitors';

type Result = { success: true; note?: string } | { success: false; error: string };
const fail = (error: unknown): Result => ({ success: false, error: error instanceof Error ? error.message : 'Unexpected error' });

export async function saveCompetitorAction(input: { id?: string; clientId: string; name: string; website?: string; instagram?: string; google?: string; notes?: string }): Promise<Result> {
  await requireAdmin();
  try {
    await saveCompetitor(input);
    revalidatePath('/admin/competitors');
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCompetitorAction(clientId: string, id: string): Promise<Result> {
  await requireAdmin();
  try {
    await deleteCompetitor(clientId, id);
    revalidatePath('/admin/competitors');
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

/** Checks one competitor right away (the first check only records the baseline: no alerts). */
export async function checkCompetitorNow(id: string): Promise<Result> {
  await requireAdmin();
  try {
    const run = await runCompetitorChecks({ onlyId: id, force: true, budgetMs: 40_000 });
    revalidatePath('/admin/competitors');
    return { success: true, note: run.findings.length ? `${run.findings.length} new finding(s)` : 'Checked' };
  } catch (error) {
    return fail(error);
  }
}
