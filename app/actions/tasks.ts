'use server';

import { db } from '@/lib/firebase';
import { AgencyTask } from '@/types/database';
import { revalidatePath } from 'next/cache';

function removeUndefinedValues<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

// Helper to generate next occurrence date
function calculateNextOccurrence(dueDate: string, type: string, interval?: number): string {
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) {
    // Fallback to today if due date is invalid
    return new Date().toISOString();
  }

  switch (type) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'every_x_days':
      date.setDate(date.getDate() + (interval || 1));
      break;
    default:
      date.setDate(date.getDate() + 1); // Default to daily
  }
  
  return date.toISOString();
}

export async function createOrUpdateTask(data: Partial<AgencyTask>) {
  try {
    const timestamp = new Date().toISOString();
    
    if (data.id) {
      // Update existing
      const docRef = db.collection('tasks').doc(data.id);
      
      const isCompleting = data.status === 'done';
      
      // If marking as done and it's a recurring task, handle recurrence
      if (isCompleting) {
        const currentDoc = await docRef.get();
        if (currentDoc.exists) {
          const currentData = currentDoc.data() as AgencyTask;
          
          if (currentData.isRecurring && currentData.autoRegenerateOnComplete) {
            // Calculate next occurrence based on the task's due date (or today if missing)
            const baseDateForNext = currentData.dueDate || timestamp;
            const nextDueDate = calculateNextOccurrence(
              baseDateForNext, 
              currentData.recurrenceType || 'daily', 
              currentData.recurrenceInterval
            );
            
            // Create the new instance
            const nextInstancePayload = removeUndefinedValues({
              ...currentData,
              status: 'todo',
              dueDate: nextDueDate,
              createdAt: timestamp,
              updatedAt: timestamp,
              recurrenceParentId: currentData.recurrenceParentId || data.id,
              lastOccurrenceCompletedAt: timestamp
            });
            delete nextInstancePayload.id;
            delete nextInstancePayload.completedAt;
            
            await db.collection('tasks').add(nextInstancePayload);
          }
        }
        
        // Ensure completedAt is set on the current task
        data.completedAt = timestamp;
      } else if (data.status === 'todo' || data.status === 'in_progress' || data.status === 'waiting') {
        // If reopening a task, remove completedAt
        // We can't strictly delete fields via update easily without FieldValue.delete()
        // but we can just leave it or manage it at the client.
        // We'll set it to undefined to omit it from payload, or pass null to delete it via admin sdk if needed.
        // For simplicity, we just don't touch it or set it to null.
        (data as any).completedAt = null; 
      }

      const updatePayload = removeUndefinedValues({
        ...data,
        updatedAt: timestamp,
        lastActivityAt: timestamp
      });
      delete updatePayload.id;
      
      // Handle the null completedAt properly for firestore
      if ((data as any).completedAt === null) {
        const admin = require('firebase-admin');
        updatePayload.completedAt = admin.firestore.FieldValue.delete();
      }
      
      await docRef.update(updatePayload);
    } else {
      // Create new
      const newPayload = removeUndefinedValues({
        title: data.title || 'Untitled Task',
        description: data.description || '',
        clientId: data.clientId || '',
        clientNameSnapshot: data.clientNameSnapshot || '',
        status: data.status || 'todo',
        priority: data.priority || 'medium',
        category: data.category || 'internal',
        dueDate: data.dueDate || '',
        scheduledDate: data.scheduledDate || '',
        notes: data.notes || '',
        isRecurring: data.isRecurring || false,
        recurrenceType: data.recurrenceType,
        recurrenceInterval: data.recurrenceInterval,
        recurrenceAnchorDate: data.recurrenceAnchorDate,
        autoRegenerateOnComplete: data.autoRegenerateOnComplete ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastActivityAt: timestamp
      });
      await db.collection('tasks').add(newPayload);
    }
    
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to merge Task:', error);
    return { success: false, error: error.message || 'Operation failed' };
  }
}

export async function deleteTask(taskId: string) {
  try {
    await db.collection('tasks').doc(taskId).delete();
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Task:', error);
    return { success: false, error: error.message };
  }
}
