'use client';

import { useState, type ReactNode } from 'react';

export interface ClientTab {
  id: string;
  label: string;
  /** Small dot next to the label: connected, needs attention, or not set up. */
  status?: 'ok' | 'warn' | 'off';
}

export interface OverviewTile {
  tab: string; // tab the tile opens
  title: string;
  value: string;
  detail: string;
  status: 'ok' | 'warn' | 'off';
}

const DOT = { ok: 'bg-emerald-500', warn: 'bg-amber-500', off: 'bg-zinc-300' } as const;
const TILE = {
  ok: 'border-zinc-200 hover:border-emerald-300',
  warn: 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
  off: 'border-dashed border-zinc-300 hover:border-zinc-400',
} as const;

/**
 * Client page tabs. The open tab is kept in the URL (?tab=…) so a reload or a
 * shared link lands on the same place; panels are rendered on the server.
 */
export function ClientTabs({ tabs, panels, overview, initial }: { tabs: ClientTab[]; panels: Record<string, ReactNode>; overview: OverviewTile[]; initial: string }) {
  const [active, setActive] = useState(tabs.some((t) => t.id === initial) ? initial : 'overview');

  function open(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    for (const key of ['gbp', 'meta', 'ads', 'ga']) url.searchParams.delete(key); // one-time connect notices
    window.history.replaceState(null, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 md:-mx-8 px-6 md:px-8 bg-zinc-50/90 backdrop-blur border-b border-zinc-200 mb-6">
        {/* Wider screens wrap onto a second row so every tab shows; phones swipe, with the open tab scrolled into view. */}
        <nav className="flex gap-x-1 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible" aria-label="Client sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              ref={active === t.id ? (el) => el?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) : undefined}
              type="button"
              onClick={() => open(t.id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t.status && <span className={`w-2 h-2 rounded-full ${DOT[t.status]}`} aria-hidden />}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {active === 'overview' ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {overview.map((tile) => (
            <button
              key={tile.tab}
              type="button"
              onClick={() => open(tile.tab)}
              className={`text-start bg-white rounded-2xl border p-5 shadow-sm transition-colors ${TILE[tile.status]}`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span className={`w-2 h-2 rounded-full ${DOT[tile.status]}`} aria-hidden />
                {tile.title}
              </div>
              <div className="mt-2 text-xl font-semibold text-zinc-900">{tile.value}</div>
              <div className="mt-1 text-sm text-zinc-500">{tile.detail}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">{panels[active]}</div>
      )}
    </div>
  );
}
