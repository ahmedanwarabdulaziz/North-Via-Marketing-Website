'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { createCategory, setItemCategory, setKnowledgeStatus } from '@/lib/knowledge';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function moveLibraryItem(id: string, categoryId: string) {
  await requireAdmin();
  try {
    await setItemCategory(id, categoryId);
    revalidatePath('/admin/library');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

/** Adds a category (or finds the one with the same name) and files the item in it. */
export async function moveLibraryItemToNewCategory(id: string, name: string) {
  await requireAdmin();
  try {
    const category = await createCategory(name);
    await setItemCategory(id, category.id);
    revalidatePath('/admin/library');
    return { success: true as const, category };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}

export async function setLibraryItemRemoved(id: string, removed: boolean) {
  await requireAdmin();
  try {
    await setKnowledgeStatus(id, removed ? 'removed' : 'active');
    revalidatePath('/admin/library');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: errorMessage(error) };
  }
}
