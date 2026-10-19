import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import { LibraryGrid, type LibraryCard } from '@/components/admin/LibraryGrid';
import { listClientProfiles } from '@/lib/admin-ops';
import { knowledgeCounts, listCategories, listKnowledge, searchKnowledge, type KnowledgeItem } from '@/lib/knowledge';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const inputClass = 'w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

/** Short-lived links to the private screenshots. */
async function signedImages(items: KnowledgeItem[]) {
  const paths = items.map((i) => i.file_path).filter((p): p is string => Boolean(p));
  if (!paths.length) return new Map<string, string>();
  const { data, error } = await supabase.storage.from('knowledge').createSignedUrls(paths, 60 * 60);
  if (error) {
    console.error('Signed screenshot URLs failed:', error.message);
    return new Map<string, string>();
  }
  return new Map((data || []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

export default async function AdminLibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; client?: string; type?: string }> }) {
  const { q = '', category = '', client = '', type = '' } = await searchParams;
  const query = q.trim();
  const [categories, clients, counts] = await Promise.all([listCategories(true), listClientProfiles(), knowledgeCounts()]);

  // A search ranks by meaning; otherwise newest first. The other filters apply on top.
  let items = query ? await searchKnowledge(query, 60) : await listKnowledge({ limit: 300, ...(category ? { categoryId: category } : {}) });
  if (category) items = items.filter((i) => i.category_id === category);
  if (client === 'personal') items = items.filter((i) => i.category === 'personal');
  else if (client) items = items.filter((i) => i.client_id === client);
  if (type) items = items.filter((i) => i.type === type);

  const images = await signedImages(items);
  const clientName = new Map(clients.map((c) => [c.id, c.brandName]));
  const cards: LibraryCard[] = items.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    summary: i.summary,
    content: i.content,
    url: i.url,
    domain: i.domain,
    tags: i.tags,
    clientName: i.client_id ? clientName.get(i.client_id) || 'Client' : null,
    personal: i.category === 'personal',
    categoryId: i.category_id,
    categoryConfirmed: i.category_confirmed,
    imageUrl: i.file_path ? images.get(i.file_path) || null : null,
    createdAt: i.created_at,
  }));
  const unsorted = items.filter((i) => !i.category_confirmed && i.category_id === 'public').length;
  const link = (params: Record<string, string>) => {
    const next = new URLSearchParams({ ...(query ? { q: query } : {}), ...(category ? { category } : {}), ...(client ? { client } : {}), ...(type ? { type } : {}), ...params });
    for (const [k, v] of [...next.entries()]) if (!v) next.delete(k);
    const s = next.toString();
    return `/admin/library${s ? `?${s}` : ''}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-500" />
          Library
        </h1>
        <p className="text-zinc-500 mt-2">
          Screenshots, links and notes you send the Telegram bot, read and filed by AI. {counts.total} saved · 🖼 {counts.byType.screenshot} · 🔗 {counts.byType.link} · 📝 {counts.byType.note}
        </p>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link href={link({ category: '' })} className={`text-sm px-3 py-1.5 rounded-full border ${!category ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'}`}>
          All ({counts.total})
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={link({ category: c.id })}
            className={`text-sm px-3 py-1.5 rounded-full border ${category === c.id ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'}`}
          >
            {c.emoji} {c.name} ({counts.byCategory.get(c.id) || 0})
          </Link>
        ))}
      </div>

      {/* Search and filters (a plain GET form, so results are shareable links) */}
      <form action="/admin/library" className="flex flex-col md:flex-row gap-3 mb-6">
        {category && <input type="hidden" name="category" value={category} />}
        <label className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input name="q" defaultValue={query} placeholder="Search by meaning, Arabic or English (e.g. competitor offers, reel ideas)…" className={`${inputClass} ps-9`} dir="auto" />
        </label>
        <select name="client" defaultValue={client} className={`${inputClass} md:w-52`}>
          <option value="">All clients</option>
          <option value="personal">Personal</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brandName}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type} className={`${inputClass} md:w-40`}>
          <option value="">All types</option>
          <option value="screenshot">Screenshots</option>
          <option value="link">Links</option>
          <option value="note">Notes</option>
        </select>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          Search
        </button>
        {(query || client || type) && (
          <Link href={link({ q: '', client: '', type: '' })} className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 self-center">
            Clear
          </Link>
        )}
      </form>

      {unsorted > 0 && (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {unsorted} item{unsorted === 1 ? '' : 's'} in Public need{unsorted === 1 ? 's' : ''} a category: the AI wasn’t sure. Pick one from the menu on the card.
        </p>
      )}
      {query && <p className="mb-4 text-sm text-zinc-500">{cards.length ? `${cards.length} match${cards.length === 1 ? '' : 'es'} for “${query}”, best first.` : `No matches for “${query}”.`}</p>}

      <LibraryGrid items={cards} categories={categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }))} />
    </div>
  );
}
