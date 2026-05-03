'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface AdminNavLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
}

export function AdminNavLink({ href, icon, label, badge }: AdminNavLinkProps) {
  const pathname = usePathname();
  // Exact match for /admin, startsWith for subroutes
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100'
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-zinc-800/50'
      }`}
    >
      <div className={isActive ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-400'}>
        {icon}
      </div>
      {label}
      {badge && <div className="ml-auto">{badge}</div>}
    </Link>
  );
}
