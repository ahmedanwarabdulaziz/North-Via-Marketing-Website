import Link from 'next/link';
import { ArrowLeft, Menu } from 'lucide-react';
import { ReactNode } from 'react';

interface AdminHeaderProps {
  title: string;
  headerActions?: ReactNode;
  headerStatus?: ReactNode;
}

export function AdminHeader({ title, headerActions, headerStatus }: AdminHeaderProps) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-neutral-200 dark:border-zinc-800 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 w-full">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle (placeholder for future implementation) */}
        <button className="md:hidden p-2 -ml-2 text-neutral-500 hover:bg-neutral-100 rounded-lg dark:hover:bg-zinc-800">
          <Menu className="w-5 h-5" />
        </button>
        
        <h1 className="text-xl font-semibold hidden sm:block overflow-hidden text-ellipsis whitespace-nowrap">{title}</h1>
        {headerStatus}
      </div>
      
      <div className="flex items-center gap-3">
        {headerActions}
        <Link 
          href="/" 
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 flex items-center gap-2 transition-colors ml-4"
        >
          <ArrowLeft className="w-4 h-4 hidden sm:block" />
          <span className="hidden sm:block">Return to Public Site</span>
          <span className="sm:hidden">Exit</span>
        </Link>
      </div>
    </header>
  );
}
