import { ReactNode } from 'react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  badgeContent?: string;
  badgeVariant?: 'success' | 'neutral' | 'blue' | 'warning' | 'danger';
  icon?: ReactNode;
}

export function AdminStatCard({ 
  title, 
  value, 
  badgeContent, 
  badgeVariant = 'neutral',
  icon 
}: AdminStatCardProps) {
  
  const badgeStyles = {
    success: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    neutral: 'text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-zinc-800',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-neutral-500 dark:text-neutral-400 font-medium tracking-wide text-sm uppercase flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {badgeContent && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeStyles[badgeVariant]}`}>
            {badgeContent}
          </span>
        )}
      </div>
      <p className="text-3xl font-semibold mt-auto">{value}</p>
    </div>
  );
}
