'use server';

import { db } from '@/lib/firebase';
import { TaskIdea } from '@/types/database';
import { revalidatePath } from 'next/cache';

function removeUndefinedValues<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export async function createOrUpdateTaskIdea(data: Partial<TaskIdea>) {
  try {
    const timestamp = new Date().toISOString();
    
    if (data.id) {
      // Update existing
      const docRef = db.collection('task_ideas').doc(data.id);
      
      const updatePayload = removeUndefinedValues({
        ...data,
        updatedAt: timestamp
      });
      delete updatePayload.id;
      
      await docRef.update(updatePayload);
    } else {
      // Create new
      const newPayload = removeUndefinedValues({
        title: data.title || 'Untitled Idea',
        description: data.description || '',
        clientId: data.clientId || '',
        clientNameSnapshot: data.clientNameSnapshot || '',
        ideaType: data.ideaType || 'future_feature',
        status: data.status || 'backlog',
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await db.collection('task_ideas').add(newPayload);
    }
    
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to merge Task Idea:', error);
    return { success: false, error: error.message || 'Operation failed' };
  }
}

export async function deleteTaskIdea(ideaId: string) {
  try {
    await db.collection('task_ideas').doc(ideaId).delete();
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Task Idea:', error);
    return { success: false, error: error.message };
  }
}
