import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-zinc-950 text-neutral-900 dark:text-neutral-100 flex">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-auto w-full">
        {children}
      </main>
    </div>
  );
}
