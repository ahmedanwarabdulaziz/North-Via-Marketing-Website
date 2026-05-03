import { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { AgencyTask, TaskIdea, ClientProfile } from '@/types/database';
import { TasksCommandCenter } from './TasksCommandCenter';

export const metadata: Metadata = {
  title: 'Tasks Command Center | Admin',
  description: 'Manage agency tasks, client follow-ups, and future ideas.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TasksPage() {
  // Fetch Tasks
  const tasksSnapshot = await db.collection('tasks').orderBy('createdAt', 'desc').get();
  const tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AgencyTask[];

  // Fetch Ideas
  const ideasSnapshot = await db.collection('task_ideas').orderBy('createdAt', 'desc').get();
  const ideas = ideasSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TaskIdea[];

  // Fetch Clients for assignment
  const clientsSnapshot = await db.collection('clients').orderBy('businessName', 'asc').get();
  const clients = clientsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ClientProfile[];

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 h-[calc(100vh-theme(spacing.16))] overflow-hidden flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Tasks Command Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">Execution, recurring workflows, and idea capture.</p>
      </div>
      
      {/* 
        Pass data down to Client Component to manage the complex interactive state.
        The wrapper has overflow-hidden and flex-col so the internal columns can handle their own scrolling.
      */}
      <TasksCommandCenter 
        initialTasks={tasks}
        initialIdeas={ideas}
        clients={clients}
      />
    </div>
  );
}
