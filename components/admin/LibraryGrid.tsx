'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Link2, RotateCcw, Trash2, X } from 'lucide-react';
import { moveLibraryItem, moveLibraryItemToNewCategory, setLibraryItemRemoved } from '@/app/actions/library';

export interface LibraryCard {
  id: string;
  type: 'screenshot' | 'link' | 'note';
  title: string;
  summary: string | null;
  content: string | null;
  url: string | null;
  domain: string | null;
  tags: string[];
  clientName: string | null;
  personal: boolean;
  categoryId: string;
  categoryConfirmed: boolean;
  imageUrl: string | null; // signed, short-lived
  createdAt: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  emoji: string;
}

const TYPE_ICON = { screenshot: ImageIcon, link: Link2, note: FileText } as const;
const selectClass = 'text-xs bg-white border border-zinc-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

export function LibraryGrid({ items, categories }: { items: LibraryCard[]; categories: CategoryOption[] }) {
  const [cards, setCards] = useState(items);
  const [cats, setCats] = useState(categories);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<LibraryCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(card: LibraryCard, value: string) {
    setError(null);
    if (value === '__new') {
      const name = window.prompt('Name of the new category');
      if (!name?.trim()) return;
      const result = await moveLibraryItemToNewCategory(card.id, name);
      if (!result.success) return setError(result.error);
      if (!cats.some((c) => c.id === result.category.id)) setCats((list) => [...list, { id: result.category.id, name: result.category.name, emoji: result.category.emoji }]);
      setCards((list) => list.map((c) => (c.id === card.id ? { ...c, categoryId: result.category.id, categoryConfirmed: true } : c)));
      return;
    }
    const result = await moveLibraryItem(card.id, value);
    if (!result.success) return setError(result.error);
    setCards((list) => list.map((c) => (c.id === card.id ? { ...c, categoryId: value, categoryConfirmed: true } : c)));
  }

  async function toggleRemoved(card: LibraryCard) {
    setError(null);
    const isRemoved = removed.has(card.id);
    const result = await setLibraryItemRemoved(card.id, !isRemoved);
    if (!result.success) return setError(result.error);
    setRemoved((set) => {
      const next = new Set(set);
      if (isRemoved) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }

  if (!cards.length) {
    return <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">Nothing here. Send the Telegram bot a screenshot, a link, or a message starting with “save:”.</div>;
  }

  return (
    <>
      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = TYPE_ICON[card.type];
          const isRemoved = removed.has(card.id);
          return (
            <article key={card.id} className={`bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col ${isRemoved ? 'opacity-50' : ''}`}>
              {card.imageUrl ? (
                <button type="button" onClick={() => setOpen(card)} className="block bg-zinc-100 aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform" loading="lazy" />
                </button>
              ) : null}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <button type="button" onClick={() => setOpen(card)} className="text-start font-semibold text-zinc-900 leading-snug hover:text-blue-700" dir="auto">
                    {card.title}
                  </button>
                </div>
                {card.summary && (
                  <p className="text-sm text-zinc-600 line-clamp-3" dir="auto">
                    {card.summary}
                  </p>
                )}
                {card.url && (
                  <a href={card.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" /> {card.domain || card.url}
                  </a>
                )}
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <select value={card.categoryId} onChange={(e) => move(card, e.target.value)} className={`${selectClass} ${!card.categoryConfirmed && card.categoryId === 'public' ? 'border-amber-300 bg-amber-50' : ''}`} title={!card.categoryConfirmed ? 'The AI wasn’t sure; pick a category' : 'Category'} disabled={isRemoved}>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                    <option value="__new">➕ New category…</option>
                  </select>
                  {!card.categoryConfirmed && card.categoryId === 'public' && <span className="text-amber-700">needs a category</span>}
                  {card.clientName && <span className="px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">{card.clientName}</span>}
                  {card.personal && <span className="px-1.5 py-0.5 rounded border border-zinc-200 bg-zinc-50">Personal</span>}
                  <span>{new Date(card.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="flex-1" />
                  <button type="button" onClick={() => toggleRemoved(card)} className={`inline-flex items-center gap-1 ${isRemoved ? 'text-blue-600' : 'text-zinc-400 hover:text-red-600'}`} title={isRemoved ? 'Restore' : 'Remove'}>
                    {isRemoved ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    {isRemoved ? 'Restore' : ''}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-zinc-900/50 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900" dir="auto">
                {open.title}
              </h3>
              <button type="button" onClick={() => setOpen(null)} className="p-1 rounded-lg hover:bg-zinc-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {open.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.imageUrl} alt={open.title} className="w-full bg-zinc-100" />
            )}
            <div className="p-5 space-y-3 text-sm">
              {open.summary && (
                <p className="text-zinc-700" dir="auto">
                  {open.summary}
                </p>
              )}
              {open.url && (
                <a href={open.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all">
                  <ExternalLink className="w-4 h-4 shrink-0" /> {open.url}
                </a>
              )}
              {open.content && (
                <div>
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">{open.type === 'screenshot' ? 'Text in the image' : open.type === 'link' ? 'From the page' : 'Note'}</div>
                  <p className="whitespace-pre-wrap text-zinc-700 bg-zinc-50 rounded-lg p-3 max-h-72 overflow-y-auto" dir="auto">
                    {open.content}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
