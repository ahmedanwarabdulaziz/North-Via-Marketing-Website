import crypto from 'crypto';
import { aiJson, embedText, type AiImage } from './ai-json';
import { supabase } from './supabase';

// Knowledge library: screenshots, links and notes kept for later. The AI reads each one
// (title, summary, text, tags, client) and search finds it by meaning or by words.

export type KnowledgeType = 'screenshot' | 'link' | 'note';

export interface KnowledgeItem {
  id: string;
  chat_id: string | null;
  type: KnowledgeType;
  title: string;
  summary: string | null;
  content: string | null;
  url: string | null;
  domain: string | null;
  tags: string[];
  client_id: string | null;
  category: 'work' | 'personal' | null;
  telegram_file_id: string | null;
  file_path: string | null;
  source_text: string | null;
  status: 'active' | 'removed';
  category_id: string;
  category_confirmed: boolean;
  extra: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  emoji: string;
  sort: number;
}

export interface LibraryClient {
  id: string;
  name: string;
  owner?: string;
}

/** What the AI made of an item, plus whether a screenshot's caption asks for a task. */
export interface KnowledgeAnalysis {
  title: string;
  summary: string | null;
  content: string | null;
  tags: string[];
  clientId: string | null;
  category: 'work' | 'personal' | null;
  libraryCategoryId: string | null; // null = the AI wasn't sure; the item goes to Public and the bot asks
  taskRequest: string | null;
}

const COLUMNS = 'id, chat_id, type, title, summary, content, url, domain, tags, client_id, category, telegram_file_id, file_path, source_text, status, category_id, category_confirmed, extra, created_at';

// ---------- AI ----------

function analysisPrompt(clients: LibraryClient[], kind: string, categories: KnowledgeCategory[]) {
  return `You file items into a marketing agency owner's knowledge library (the agency is in Cairo; content may be Arabic, English or mixed).
The item is ${kind}. Return ONLY a JSON object:
{
  "title": string,            // short, specific, in the item's main language (max 80 chars)
  "summary": string,          // 1–3 sentences: what it is and why it's useful, in the item's main language
  "text": string | null,      // screenshots: all readable text in the image, as written (max 3000 chars); otherwise null
  "tags": string[],           // 2–6 short lowercase topic tags, e.g. "instagram", "reels", "pricing", "competitor", "seo"
  "client_id": string | null, // only if clearly about one of the clients below (by brand, owner or obvious reference)
  "category": "work" | "personal" | null,
  "library_category_id": string | null, // the best library category id from the list below; null if none clearly fits
  "library_category_sure": boolean,     // true only if that category is an obvious fit
  "task_request": string | null // only if the CAPTION asks to do something ("remind me…", "call them tomorrow"): that request, else null
}

Library categories (id | name):
${categories.filter((c) => c.id !== 'public').map((c) => `${c.id} | ${c.name}`).join('\n')}
("public" is only the fallback; don't pick it.)

Clients (id | brand | owner):
${clients.map((c) => `${c.id} | ${c.name}${c.owner ? ` | ${c.owner}` : ''}`).join('\n') || '(none)'}`;
}

function toAnalysis(raw: Record<string, unknown>, clients: LibraryClient[], fallbackTitle: string, categories: KnowledgeCategory[]): KnowledgeAnalysis {
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const clientId = str(raw.client_id, 100);
  const tags = Array.isArray(raw.tags)
    ? [...new Set(raw.tags.map((t) => String(t).toLowerCase().replace(/^#/, '').trim().replace(/\s+/g, '-')).filter((t) => t && t.length <= 30))].slice(0, 6)
    : [];
  const knownClient = clientId && clients.some((c) => c.id === clientId) ? clientId : null;
  const categoryId = str(raw.library_category_id, 100);
  const knownCategory = categoryId && categoryId !== 'public' && categories.some((c) => c.id === categoryId) ? categoryId : null;
  return {
    title: str(raw.title, 120) || fallbackTitle,
    summary: str(raw.summary, 1000),
    content: str(raw.text, 4000),
    tags,
    clientId: knownClient,
    category: raw.category === 'work' || raw.category === 'personal' ? raw.category : knownClient ? 'work' : null,
    libraryCategoryId: knownCategory && raw.library_category_sure === true ? knownCategory : null,
    taskRequest: str(raw.task_request, 500),
  };
}

export async function analyzeScreenshot(image: AiImage, caption: string, clients: LibraryClient[]) {
  const categories = await listCategories();
  const raw = await aiJson({
    system: analysisPrompt(clients, 'a screenshot or photo', categories),
    user: caption ? `CAPTION: """${caption.slice(0, 1000)}"""` : 'No caption.',
    image,
    feature: 'knowledge',
  });
  return toAnalysis(raw, clients, caption ? caption.slice(0, 80) : 'Screenshot', categories);
}

export async function analyzeLink(url: string, page: PageInfo | null, note: string, clients: LibraryClient[]) {
  const lines = [
    `URL: ${url}`,
    note ? `NOTE FROM THE OWNER: """${note.slice(0, 1000)}"""` : '',
    page?.title ? `PAGE TITLE: ${page.title}` : '',
    page?.description ? `DESCRIPTION: ${page.description}` : '',
    page?.text ? `PAGE TEXT (start): """${page.text.slice(0, 5000)}"""` : page ? '' : '(The page could not be read; go by the URL and the note.)',
  ].filter(Boolean);
  const categories = await listCategories();
  const raw = await aiJson({ system: analysisPrompt(clients, 'a web link', categories), user: lines.join('\n'), feature: 'knowledge' });
  const analysis = toAnalysis(raw, clients, page?.title || note.slice(0, 80) || domainOf(url) || url, categories);
  return { ...analysis, content: page?.text ? page.text.slice(0, 4000) : null, taskRequest: analysis.taskRequest };
}

export async function analyzeNote(text: string, clients: LibraryClient[]) {
  const categories = await listCategories();
  const raw = await aiJson({ system: analysisPrompt(clients, 'a note the owner typed', categories), user: `NOTE: """${text.slice(0, 4000)}"""`, feature: 'knowledge' });
  return { ...toAnalysis(raw, clients, text.slice(0, 80), categories), content: text.slice(0, 4000), taskRequest: null };
}

// ---------- Web pages ----------

export interface PageInfo {
  title: string | null;
  description: string | null;
  text: string | null;
  siteName: string | null;
}

export function findUrls(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map((m) => m[0].replace(/[),.;!?]+$/, ''));
}

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// The bot is private, but a link could still point at the server's own network; don't fetch those.
function isPrivateHost(host: string) {
  return /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.)/i.test(host) || host.endsWith('.internal') || host.endsWith('.local');
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function meta(html: string, name: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : null;
}

/** Title, description and readable text of a page; null when it can't be read (login walls, errors). */
export async function readPage(url: string): Promise<PageInfo | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol) || isPrivateHost(parsed.hostname)) return null;

  // YouTube pages are heavy scripts; its oEmbed gives the title and channel directly.
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/i.test(parsed.hostname)) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8_000) });
      if (res.ok) {
        const data = (await res.json()) as { title?: string; author_name?: string };
        return { title: data.title || null, description: data.author_name ? `YouTube video by ${data.author_name}` : null, text: null, siteName: 'YouTube' };
      }
    } catch {
      // fall through to the normal page fetch
    }
  }

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NorthViaBot/1.0; +https://www.northviamarketing.com)', Accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok || !/html|xml/i.test(res.headers.get('content-type') || '')) return null;
    const html = (await res.text()).slice(0, 1_500_000);
    const title = meta(html, 'og:title') || decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim() || null;
    const description = meta(html, 'og:description') || meta(html, 'description');
    const body = (html.match(/<(article|main)[\s\S]*?<\/\1>/i)?.[0] || html.match(/<body[\s\S]*<\/body>/i)?.[0] || html)
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    const text = decodeEntities(body).replace(/\s+/g, ' ').trim().slice(0, 8000) || null;
    return { title, description, text, siteName: meta(html, 'og:site_name') };
  } catch {
    return null;
  }
}

// ---------- Storage ----------

export function newKnowledgeId() {
  return crypto.randomBytes(6).toString('base64url');
}

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function embeddingInput(item: { title: string; summary?: string | null; content?: string | null; tags?: string[]; domain?: string | null }) {
  return [item.title, item.summary, item.tags?.length ? `Tags: ${item.tags.join(', ')}` : '', item.domain, item.content?.slice(0, 3000)].filter(Boolean).join('\n');
}

export async function saveKnowledge(item: {
  id?: string;
  chatId: string;
  type: KnowledgeType;
  analysis: KnowledgeAnalysis;
  url?: string | null;
  telegramFileId?: string | null;
  filePath?: string | null;
  sourceText?: string | null;
  extra?: Record<string, unknown>;
}): Promise<KnowledgeItem> {
  const domain = item.url ? domainOf(item.url) : null;
  const a = item.analysis;
  const embedding = await embedText(embeddingInput({ ...a, domain }), 'document');
  return check(
    await supabase
      .from('knowledge_items')
      .insert({
        id: item.id || newKnowledgeId(),
        chat_id: item.chatId,
        type: item.type,
        title: a.title,
        summary: a.summary,
        content: a.content,
        url: item.url || null,
        domain,
        tags: a.tags,
        client_id: a.clientId,
        category: a.category,
        telegram_file_id: item.telegramFileId || null,
        file_path: item.filePath || null,
        source_text: item.sourceText || null,
        category_id: a.libraryCategoryId || 'public',
        category_confirmed: Boolean(a.libraryCategoryId),
        embedding: embedding ? JSON.stringify(embedding) : null,
        extra: { ...(item.extra || {}), ...(embedding ? {} : { needsEmbedding: true }) },
      })
      .select(COLUMNS)
      .single()
  ) as KnowledgeItem;
}

/** Uploads a screenshot to the private "knowledge" bucket; returns its path. */
export async function storeImage(id: string, data: Buffer, mimeType: string) {
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${new Date().toISOString().slice(0, 7)}/${id}.${ext}`;
  const { error } = await supabase.storage.from('knowledge').upload(path, data, { contentType: mimeType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function getKnowledge(id: string) {
  return check(await supabase.from('knowledge_items').select(COLUMNS).eq('id', id).maybeSingle()) as KnowledgeItem | null;
}

export async function setKnowledgeStatus(id: string, status: KnowledgeItem['status']) {
  return check(await supabase.from('knowledge_items').update({ status }).eq('id', id).select(COLUMNS).single()) as KnowledgeItem;
}

export async function listKnowledge(opts: { limit?: number; clientId?: string | null; personal?: boolean; categoryId?: string } = {}) {
  let query = supabase.from('knowledge_items').select(COLUMNS).eq('status', 'active').order('created_at', { ascending: false }).limit(opts.limit ?? 10);
  if (opts.categoryId) query = query.eq('category_id', opts.categoryId);
  if (opts.personal) query = query.eq('category', 'personal');
  else if (opts.clientId === '-') query = query.is('client_id', null).eq('category', 'work');
  else if (opts.clientId) query = query.eq('client_id', opts.clientId);
  return check(await query) as KnowledgeItem[];
}

/** Active items per client id ('-' = work without a client, 'p' = personal) and per type. */
export async function knowledgeCounts() {
  const rows = check(await supabase.from('knowledge_items').select('type, client_id, category, category_id').eq('status', 'active').limit(5000)) as Array<Pick<KnowledgeItem, 'type' | 'client_id' | 'category' | 'category_id'>>;
  const byCategory = new Map<string, number>();
  const byClient = new Map<string, number>();
  const byType: Record<KnowledgeType, number> = { screenshot: 0, link: 0, note: 0 };
  for (const r of rows) {
    byType[r.type] += 1;
    byCategory.set(r.category_id, (byCategory.get(r.category_id) || 0) + 1);
    const key = r.client_id || (r.category === 'personal' ? 'p' : r.category === 'work' ? '-' : 'other');
    byClient.set(key, (byClient.get(key) || 0) + 1);
  }
  return { total: rows.length, byType, byClient, byCategory };
}

/** Best matches for a search: by meaning when embeddings work, always by words too. */
export async function searchKnowledge(query: string, limit = 8) {
  const embedding = await embedText(query, 'query');
  const matches = check(
    await supabase.rpc('search_knowledge', {
      q_embedding: embedding ? JSON.stringify(embedding) : null,
      q_text: query,
      match_count: limit,
      min_similarity: 0.6,
    })
  ) as Array<{ id: string; similarity: number; word_match: boolean }>;
  // Short queries make loosely related items score just above the minimum; keep only those
  // close to the best meaning match (word matches always stay).
  const best = Math.max(0, ...matches.map((m) => m.similarity));
  const kept = matches.filter((m) => m.word_match || m.similarity >= best - 0.06);
  if (!kept.length) return [];
  const items = check(await supabase.from('knowledge_items').select(COLUMNS).in('id', kept.map((m) => m.id))) as KnowledgeItem[];
  const byId = new Map(items.map((i) => [i.id, i]));
  return kept.map((m) => byId.get(m.id)).filter(Boolean) as KnowledgeItem[];
}

/** Items close in meaning to one item (for "Similar"). */
export async function similarKnowledge(item: KnowledgeItem, limit = 6) {
  const found = await searchKnowledge(item.title + (item.tags.length ? ` ${item.tags.join(' ')}` : ''), limit + 1);
  return found.filter((i) => i.id !== item.id).slice(0, limit);
}

// ---------- Categories ----------

let categoryCache: { at: number; list: KnowledgeCategory[] } | null = null;

export async function listCategories(fresh = false) {
  if (!fresh && categoryCache && Date.now() - categoryCache.at < 60_000) return categoryCache.list;
  const list = check(await supabase.from('knowledge_categories').select('id, name, emoji, sort').order('sort').order('name')) as KnowledgeCategory[];
  categoryCache = { at: Date.now(), list };
  return list;
}

/** Adds a category (or returns the existing one with the same name, ignoring case). */
export async function createCategory(name: string) {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!clean) throw new Error('Category name is empty.');
  const existing = (await listCategories(true)).find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  const created = check(
    await supabase
      .from('knowledge_categories')
      .insert({ id: crypto.randomBytes(4).toString('base64url'), name: clean, emoji: '📁', sort: 100 })
      .select('id, name, emoji, sort')
      .single()
  ) as KnowledgeCategory;
  categoryCache = null;
  return created;
}

export async function setItemCategory(id: string, categoryId: string) {
  return check(
    await supabase.from('knowledge_items').update({ category_id: categoryId, category_confirmed: true }).eq('id', id).select(COLUMNS).single()
  ) as KnowledgeItem;
}
