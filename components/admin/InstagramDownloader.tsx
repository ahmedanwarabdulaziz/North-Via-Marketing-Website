'use client';

import { useMemo, useState } from 'react';
import { zipSync } from 'fflate';
import { Check, Download, ExternalLink, Image as ImageIcon, Loader2, Play, Search, Terminal } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'video' | 'image';
  url: string;
  thumbnail: string;
  caption: string;
  date: string;
  permalink: string;
  filename: string;
}

interface Profile {
  username: string;
  fullName: string;
}

type Filter = 'all' | 'video' | 'image';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'video', label: 'Videos' },
  { value: 'image', label: 'Images' },
];

const fileLink = (url: string, name?: string) => `/api/admin/instagram/file?url=${encodeURIComponent(url)}${name ? `&name=${encodeURIComponent(name)}` : ''}`;

/** Accepts a username, @username or a profile link. */
function parseUsername(input: string) {
  const text = input.trim();
  const fromLink = text.match(/instagram\.com\/([\w.]+)/i);
  return (fromLink ? fromLink[1] : text.replace(/^@/, '')).toLowerCase();
}

/** Link that opens a terminal on this PC (set up once by install-windows.ps1); null until the name is valid. */
function terminalLink(username: string, count: string, videosOnly: boolean) {
  if (!/^[a-z0-9_][a-z0-9._]{0,29}$/.test(username)) return null;
  const params = [/^[1-9]\d{0,4}$/.test(count) ? `count=${count}` : '', videosOnly ? 'videos=1' : ''].filter(Boolean).join('&');
  return `nvm-instaloader://${username}${params ? `/?${params}` : ''}`;
}

function saveFile(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

export function InstagramDownloader() {
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [count, setCount] = useState('50');
  const [videosOnly, setVideosOnly] = useState(false);

  const terminalHref = terminalLink(parseUsername(input), count, videosOnly);
  const visible = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.type === filter)), [items, filter]);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));
  const videoCount = items.filter((i) => i.type === 'video').length;

  async function load(name: string, next: string | null) {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams({ username: name, ...(next ? { cursor: next } : {}) });
      const res = await fetch(`/api/admin/instagram/media?${params}`);
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Could not load this account.');
      setProfile(data.profile);
      setCursor(data.cursor);
      setItems((list) => (next ? [...list, ...data.items] : data.items));
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    const name = parseUsername(input);
    if (!name) return;
    setUsername(name);
    setProfile(null);
    setItems([]);
    setCursor(null);
    setSelected(new Set());
    setFilter('all');
    load(name, null);
  }

  function toggle(id: string) {
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((set) => {
      const next = new Set(set);
      for (const i of visible) {
        if (allVisibleSelected) next.delete(i.id);
        else next.add(i.id);
      }
      return next;
    });
  }

  async function download() {
    const chosen = items.filter((i) => selected.has(i.id));
    if (!chosen.length) return;
    setError(null);
    setNotice(null);
    if (chosen.length === 1) return saveFile(fileLink(chosen[0].url, chosen[0].filename), chosen[0].filename);

    // Several files go into one ZIP, so the browser doesn't ask about each one.
    setProgress({ done: 0, total: chosen.length });
    const files: Record<string, [Uint8Array, { level: 0 }]> = {};
    const failed: string[] = [];
    const queue = [...chosen];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          try {
            const res = await fetch(fileLink(next.url));
            if (!res.ok) throw new Error();
            files[next.filename] = [new Uint8Array(await res.arrayBuffer()), { level: 0 }];
          } catch {
            failed.push(next.filename);
          }
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
      })
    );
    setProgress(null);

    if (Object.keys(files).length) {
      const zip = zipSync(files);
      const href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      saveFile(href, `${username}_instagram.zip`);
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    }
    if (failed.length) setError(`${failed.length} of ${chosen.length} files could not be downloaded: ${failed.join(', ')}`);
    else setNotice(`Downloaded ${chosen.length} files.`);
  }

  return (
    <div className="pb-24">
      <form onSubmit={search} className="flex flex-col sm:flex-row gap-3 mb-6">
        <label className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instagram username or profile link"
            autoFocus
            className="w-full text-sm bg-white border border-zinc-200 rounded-lg ps-9 pe-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </label>
        <button type="submit" disabled={loading || !input.trim()} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          Show posts
        </button>
      </form>

      <div className="mb-6 bg-white border border-zinc-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            Latest
            <input
              type="number"
              min={1}
              max={99999}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              aria-label="How many of the latest posts to download; empty means all"
              className="w-20 text-sm bg-white border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            posts
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={videosOnly} onChange={(e) => setVideosOnly(e.target.checked)} className="rounded border-zinc-300" />
            Videos only
          </label>
          {terminalHref ? (
            <a href={terminalHref} className="ms-auto flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800">
              <Terminal className="w-4 h-4" /> Download in terminal
            </a>
          ) : (
            <span className="ms-auto flex items-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-500 text-sm font-medium rounded-lg">
              <Terminal className="w-4 h-4" /> Download in terminal
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-500">Opens a terminal on this PC and saves to Downloads\Instagram. Leave the number empty to download every post. The PC needs the one-time setup first.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}

      {profile && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="me-auto">
            <p className="font-semibold text-zinc-900">@{profile.username}</p>
            {profile.fullName && <p className="text-sm text-zinc-500">{profile.fullName}</p>}
          </div>
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`px-3 py-1.5 text-sm rounded-md ${filter === value ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                {label} ({value === 'all' ? items.length : value === 'video' ? videoCount : items.length - videoCount})
              </button>
            ))}
          </div>
          <button type="button" onClick={toggleAll} disabled={!visible.length} className="px-3 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 disabled:opacity-50">
            {allVisibleSelected ? 'Clear selection' : 'Select all'}
          </button>
        </div>
      )}

      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((item) => {
            const on = selected.has(item.id);
            return (
              <div key={item.id} className={`group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 ring-2 ${on ? 'ring-blue-600' : 'ring-transparent'}`}>
                <button type="button" onClick={() => toggle(item.id)} aria-pressed={on} aria-label={`Select ${item.filename}`} className="absolute inset-0 w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileLink(item.thumbnail)} alt={item.caption || item.filename} loading="lazy" className={`w-full h-full object-cover transition-opacity ${on ? 'opacity-80' : ''}`} />
                </button>
                <span className={`pointer-events-none absolute top-2 start-2 w-6 h-6 rounded-full flex items-center justify-center border-2 ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/80 border-white text-transparent'}`}>
                  <Check className="w-4 h-4" />
                </span>
                <span className="pointer-events-none absolute top-2 end-2 p-1 rounded-md bg-black/60 text-white">
                  {item.type === 'video' ? <Play className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                </span>
                <span className="pointer-events-none absolute bottom-2 start-2 text-xs px-1.5 py-0.5 rounded bg-black/60 text-white">{item.date.slice(0, 10)}</span>
                <a
                  href={item.permalink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open on Instagram"
                  className="absolute bottom-2 end-2 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {profile && !loading && !items.length && !error && <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">This account has no posts.</div>}

      {loading && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading posts from Instagram…
        </p>
      )}

      {cursor && !loading && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => load(username, cursor)} className="px-5 py-2.5 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:border-zinc-300">
            Load more
          </button>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-6 start-1/2 md:start-[calc(50%+8rem)] -translate-x-1/2 rtl:translate-x-1/2 z-10">
          <button type="button" onClick={download} disabled={Boolean(progress)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-lg hover:bg-blue-700 disabled:opacity-80 whitespace-nowrap">
            {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {progress ? `Downloading ${progress.done} of ${progress.total}…` : `Download ${selected.size} ${selected.size === 1 ? 'file' : 'files'}`}
          </button>
        </div>
      )}
    </div>
  );
}
