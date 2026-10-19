import { CheckSquare } from 'lucide-react';
import { TasksBoard } from '@/components/admin/TasksBoard';
import { listClientProfiles } from '@/lib/admin-ops';
import { listAdminTasks } from '@/lib/admin-tasks';
import { cairoParts } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage() {
  const [tasks, clients] = await Promise.all([listAdminTasks(), listClientProfiles()]);
  const now = cairoParts(new Date());

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-blue-500" />
          Tasks
        </h1>
        <p className="text-zinc-500 mt-2">
          Everything you send the Telegram bot, plus tasks added here. Times are Cairo time; reminders go to Telegram every hour on the hour.
        </p>
      </div>
      <TasksBoard
        initial={tasks}
        clients={clients.filter((c) => c.id).map((c) => ({ id: c.id!, name: c.brandName }))}
        today={now.date}
        nowTime={now.time}
      />
    </div>
  );
}
