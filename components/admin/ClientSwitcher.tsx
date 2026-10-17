'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

/**
 * One tab per client at the top of a client page. Switching keeps the open
 * section (?tab=…), so you can go through every client's Google Ads, say, in a row.
 */
export function ClientSwitcher({ clients, currentId }: { clients: Array<{ id: string; name: string }>; currentId: string }) {
  const [section, setSection] = useState<string | null>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
    // The section tabs update the URL without a navigation, so read it on every click.
    const read = () => setSection(new URL(window.location.href).searchParams.get('tab'));
    read();
    const afterClick = () => setTimeout(read, 0); // after the tab's own click handler has run
    window.addEventListener('click', afterClick);
    return () => window.removeEventListener('click', afterClick);
  }, []);

  return (
    <div className="-mx-6 md:-mx-8 px-6 md:px-8 border-b border-zinc-200 bg-white">
      <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2" aria-label="Clients">
        {[...clients].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map((c) => {
          const active = c.id === currentId;
          return (
            <Link
              key={c.id}
              ref={active ? activeRef : undefined}
              href={`/admin/clients/${c.id}${section && section !== 'overview' ? `?tab=${section}` : ''}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {c.name}
            </Link>
          );
        })}
        <Link href="/admin/clients/new" className="shrink-0 ms-1 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" title="Add client">
          <Plus className="w-4 h-4" />
        </Link>
      </nav>
    </div>
  );
}
