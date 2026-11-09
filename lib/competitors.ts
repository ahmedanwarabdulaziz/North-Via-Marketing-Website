import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { getSetting, setSetting } from './data/store';
import { decryptString } from './encryption';
import { readPage } from './knowledge';
import { openRouterJson } from './openrouter';
import { aiJson } from './ai-json';
import { supabase } from './supabase';
import { cairoParts } from './tasks';

// Competitor watch, per client. For each competitor: Instagram (official Business Discovery:
// profile, new posts with caption + cover image + likes; Reels' video files aren't provided by
// the API, so a Reel is read from its caption and cover), the website (text changes, summarized
// by the AI), and Google (rating, review count, latest reviews; needs GOOGLE_PLACES_API_KEY).
// New posts are checked by the AI for offers, new products, events and giveaways; anything
// notable becomes a "finding" (Telegram alert for offers, and the weekly report).
// Stored in app_settings: competitors:<client id> (the list), competitor_state:<id> (last seen),
// competitor_findings:<client id> (newest 200).

const GRAPH = 'https://graph.facebook.com/v21.0';
const IG_EVERY_MS = 3 * 3_600_000;
const WEB_EVERY_MS = 24 * 3_600_000;
const GOOGLE_EVERY_MS = 24 * 3_600_000;
const MAX_FINDINGS = 200;

export interface Competitor {
  id: string;
  clientId: string;
  name: string;
  website?: string;
  instagram?: string; // handle without @
  google?: string; // Google Maps name / search text, or a place id
  notes?: string;
  createdAt: string;
}

interface MenuItem {
  name: string;
  price?: string; // as written, e.g. "$13.99" or "150 EGP"
}

interface CompetitorState {
  ig?: { checkedAt: string; followers?: number; seen: string[]; history?: { d: string; followers: number }[]; error?: string };
  web?: { checkedAt: string; text: string; items?: MenuItem[]; error?: string };
  google?: { checkedAt: string; placeId?: string; rating?: number; count?: number; seenReviews: string[]; history?: { d: string; rating?: number; count?: number }[]; error?: string };
}

export interface Finding {
  id: string;
  at: string;
  clientId: string;
  competitorId: string;
  competitorName: string;
  source: 'instagram' | 'website' | 'google';
  kind: 'offer' | 'new_product' | 'event' | 'giveaway' | 'post' | 'website_change' | 'rating' | 'review' | 'followers';
  title: string;
  detail: string;
  idea?: string;
  url?: string;
  likes?: number;
  alerted?: boolean;
}

const listKey = (clientId: string) => `competitors:${clientId}`;
const stateKey = (id: string) => `competitor_state:${id}`;
const findingsKey = (clientId: string) => `competitor_findings:${clientId}`;

// ---------- The list ----------

export async function listCompetitors(clientId: string): Promise<Competitor[]> {
  const v = await getSetting<{ items?: Competitor[] }>(listKey(clientId)).catch(() => null);
  return Array.isArray(v?.items) ? v!.items! : [];
}

export async function allCompetitors(): Promise<Competitor[]> {
  const { data } = await supabase.from('app_settings').select('value').like('key', 'competitors:%');
  return ((data || []) as { value: { items?: Competitor[] } }[]).flatMap((r) => r.value?.items || []);
}

function cleanHandle(v?: string) {
  if (!v) return undefined;
  const m = v.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9._]{1,30})\/?$/);
  return m ? m[1].toLowerCase() : undefined;
}

function cleanUrl(v?: string) {
  if (!v?.trim()) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`).toString();
  } catch {
    return undefined;
  }
}

export async function saveCompetitor(input: Omit<Competitor, 'id' | 'createdAt'> & { id?: string }) {
  const items = await listCompetitors(input.clientId);
  const clean: Competitor = {
    id: input.id || crypto.randomBytes(5).toString('base64url'),
    clientId: input.clientId,
    name: input.name.trim().slice(0, 80),
    website: cleanUrl(input.website),
    instagram: cleanHandle(input.instagram),
    google: input.google?.trim().slice(0, 200) || undefined,
    notes: input.notes?.trim().slice(0, 500) || undefined,
    createdAt: items.find((c) => c.id === input.id)?.createdAt || new Date().toISOString(),
  };
  if (!clean.name) throw new Error('A competitor needs a name.');
  const next = input.id ? items.map((c) => (c.id === input.id ? clean : c)) : [...items, clean];
  await setSetting(listKey(input.clientId), { items: next.slice(0, 30) });
  return clean;
}

export async function deleteCompetitor(clientId: string, id: string) {
  await setSetting(listKey(clientId), { items: (await listCompetitors(clientId)).filter((c) => c.id !== id) });
}

async function getState(id: string): Promise<CompetitorState> {
  return (await getSetting<CompetitorState>(stateKey(id)).catch(() => null)) || {};
}

export async function listFindings(clientId: string): Promise<Finding[]> {
  const v = await getSetting<{ items?: Finding[] }>(findingsKey(clientId)).catch(() => null);
  return Array.isArray(v?.items) ? v!.items! : [];
}

async function addFindings(clientId: string, fresh: Finding[]) {
  if (!fresh.length) return;
  const items = [...fresh, ...(await listFindings(clientId))].slice(0, MAX_FINDINGS);
  await setSetting(findingsKey(clientId), { items });
}

export async function getFinding(clientId: string, id: string) {
  return (await listFindings(clientId)).find((f) => f.id === id) || null;
}

// ---------- Instagram (Business Discovery) ----------

interface IgPost {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

let workingAccount: { igUserId: string; token: string } | null = null;

/** Any connected Instagram business account whose token works (Business Discovery needs one). */
async function igAccounts() {
  const { data } = await supabase.from('social_accounts').select('ig_user_id, encrypted_page_token').not('ig_user_id', 'is', null).limit(20);
  return ((data || []) as { ig_user_id: string; encrypted_page_token: string }[]).map((a) => ({ igUserId: a.ig_user_id, token: decryptString(a.encrypted_page_token) }));
}

export async function instagramProfile(handle: string) {
  const fields = `business_discovery.username(${handle}){username,name,followers_count,media_count,media.limit(8){caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}}`;
  const candidates = workingAccount ? [workingAccount, ...(await igAccounts())] : await igAccounts();
  let lastError = 'No connected Instagram business account to look competitors up with.';
  for (const acc of candidates) {
    const res = await fetch(`${GRAPH}/${acc.igUserId}?${new URLSearchParams({ fields, access_token: acc.token })}`, { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json().catch(() => ({}))) as { business_discovery?: { followers_count?: number; media?: { data?: IgPost[] } }; error?: { message?: string; code?: number } };
    if (res.ok && data.business_discovery) {
      workingAccount = acc;
      return { followers: data.business_discovery.followers_count, posts: data.business_discovery.media?.data || [] };
    }
    lastError = data.error?.message || `Instagram ${res.status}`;
    // "not a business account / not found" is about the handle, not the token: stop trying others.
    if (/business_discovery|Invalid user id|cannot be found|does not exist/i.test(lastError) && !/access token/i.test(lastError)) break;
  }
  throw new Error(lastError);
}

interface PostVerdict {
  kind: Finding['kind'];
  notable: boolean;
  title: string;
  detail: string;
  idea: string;
}

async function judgePost(post: IgPost, competitor: Competitor, clientName: string): Promise<PostVerdict> {
  const image = post.media_product_type === 'REELS' || post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url || post.thumbnail_url;
  const prompt = {
    system: `You watch competitors' Instagram for a marketing agency. Client: ${clientName}. Competitor: ${competitor.name}${competitor.notes ? ` (${competitor.notes})` : ''}.
From the caption and the image (a Reel's cover, or the photo), decide what this post is:
- "offer": a discount, deal, price, bundle, coupon, free item, limited-time promotion
- "new_product": a new product, menu item, service or collection
- "event": an opening, event, workshop, live, collaboration
- "giveaway": a contest or giveaway
- "post": anything else
"notable": true for offer / new_product / event / giveaway, or a post doing unusually well.
"title": one line (e.g. "2 lattes for 99 EGP until Thursday"). "detail": 1-2 sentences with prices, dates, conditions as stated.
"idea": one practical idea for ${clientName} in response (counter-offer, similar content), or "" if none.
Write in the language of the post (Arabic or English). Never invent prices or dates not shown.
Return ONLY JSON: {"kind": "...", "notable": true|false, "title": "...", "detail": "...", "idea": "..."}`,
    user: `Post type: ${post.media_product_type || ''} ${post.media_type || ''}\nLikes: ${post.like_count ?? '?'} · Comments: ${post.comments_count ?? '?'}\nCaption:\n${(post.caption || '(no caption)').slice(0, 2000)}${
      post.media_product_type === 'REELS' ? '\n(Reel: only the cover image is available, not the video.)' : ''
    }`,
  };
  let raw: Record<string, unknown>;
  try {
    raw = await openRouterJson({ ...prompt, feature: 'knowledge', imageUrls: image ? [image] : [], timeoutMs: 25_000 });
  } catch {
    raw = await aiJson({ ...prompt, feature: 'knowledge', timeBudgetMs: 20_000 }); // free models, caption only
  }
  const kinds = ['offer', 'new_product', 'event', 'giveaway', 'post'] as const;
  const kind = kinds.find((k) => k === raw.kind) || 'post';
  return {
    kind,
    notable: raw.notable === true || kind !== 'post',
    title: typeof raw.title === 'string' ? raw.title.slice(0, 160) : 'New post',
    detail: typeof raw.detail === 'string' ? raw.detail.slice(0, 500) : '',
    idea: typeof raw.idea === 'string' ? raw.idea.slice(0, 300) : '',
  };
}

async function checkInstagram(c: Competitor, state: CompetitorState, clientName: string, deadline: number): Promise<Finding[]> {
  if (!c.instagram) return [];
  const findings: Finding[] = [];
  try {
    const { followers, posts } = await instagramProfile(c.instagram);
    const seen = new Set(state.ig?.seen || []);
    const firstRun = !state.ig;
    // On the first check only remember what's there (no flood of "new" posts); afterwards judge new ones.
    const fresh = firstRun ? [] : posts.filter((p) => !seen.has(p.id)).slice(0, 4);
    for (const p of fresh) {
      if (Date.now() > deadline) break;
      const v = await judgePost(p, c, clientName).catch(() => null);
      if (!v) continue;
      findings.push({
        id: crypto.randomBytes(5).toString('base64url'),
        at: p.timestamp || new Date().toISOString(),
        clientId: c.clientId,
        competitorId: c.id,
        competitorName: c.name,
        source: 'instagram',
        kind: v.notable ? v.kind : 'post',
        title: v.title,
        detail: v.detail,
        idea: v.idea || undefined,
        url: p.permalink,
        likes: p.like_count,
      });
      seen.add(p.id);
    }
    const prev = state.ig?.followers;
    if (prev && followers && Math.abs(followers - prev) / prev >= 0.05 && Math.abs(followers - prev) >= 200) {
      findings.push({
        id: crypto.randomBytes(5).toString('base64url'),
        at: new Date().toISOString(),
        clientId: c.clientId,
        competitorId: c.id,
        competitorName: c.name,
        source: 'instagram',
        kind: 'followers',
        title: `${followers > prev ? 'Gained' : 'Lost'} ${Math.abs(followers - prev).toLocaleString('en')} followers`,
        detail: `${prev.toLocaleString('en')} → ${followers.toLocaleString('en')}`,
      });
    }
    // One follower count a day, for "+N this week" next to the client's own growth.
    const day = new Date().toISOString().slice(0, 10);
    const history = followers !== undefined ? [...(state.ig?.history || []).filter((x) => x.d !== day), { d: day, followers }].slice(-120) : state.ig?.history;
    state.ig = { checkedAt: new Date().toISOString(), followers, seen: [...new Set([...posts.map((p) => p.id), ...seen])].slice(0, 60), history };
  } catch (error) {
    state.ig = { ...(state.ig || { seen: [] }), checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message.slice(0, 200) : 'failed' };
  }
  return findings;
}

// ---------- Website ----------

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 20_000);
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0;
  const wa = new Set(a.toLowerCase().split(' '));
  const wb = new Set(b.toLowerCase().split(' '));
  let same = 0;
  for (const w of wa) if (wb.has(w)) same++;
  return same / Math.max(wa.size, wb.size);
}

/** "$13.99" / "150 EGP" / "13,99" → 13.99, for comparing prices; null if there's no number. */
function priceNumber(p?: string) {
  const m = p?.replace(/,(?=\d{2})/, '.').replace(/[^\d.]/g, ' ').trim().split(/\s+/)[0];
  const n = m ? Number(m) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

const itemKey = (name: string) => name.toLowerCase().replace(/[^\w؀-ۿ]+/g, ' ').trim();

/**
 * Daily, no AI unless the page changed: the page text is compared with yesterday's. Only when it
 * changed (or on the first check) does the AI list the items and prices on it, and new items,
 * removed items and price changes are worked out here by comparing the lists. Anything else
 * important (an offer, a new branch, new hours) comes from the same AI call.
 */
async function checkWebsite(c: Competitor, state: CompetitorState, clientName: string): Promise<Finding[]> {
  if (!c.website) return [];
  try {
    const page = await readPage(c.website, 20_000); // menus are long
    const text = normalize([page?.title, page?.description, page?.text].filter(Boolean).join(' · '));
    if (!text) throw new Error('Could not read the page (it may need JavaScript or block bots).');
    const before = state.web?.text || '';
    const oldItems = state.web?.items;
    if (before && similarity(before, text) > 0.97 && oldItems) {
      state.web = { ...state.web!, checkedAt: new Date().toISOString() };
      return [];
    }
    const raw = await aiJson({
      system: `You read a competitor's website for a marketing agency (client: ${clientName}; competitor: ${c.name}).
1) "items": every product / menu item / service with its price exactly as written on the page (no price → omit "price"). Use the item names as written. [] if the page lists none.
2) "other": other meaningful changes compared with BEFORE — offers, discounts, a new branch or page, opening hours, delivery — in 1-2 sentences, or "" if none (or if there's no BEFORE).
Return ONLY JSON: {"items": [{"name": "...", "price": "..."}], "other": "...", "offer": true|false}`,
      user: `${before ? `BEFORE:
${before.slice(0, 4000)}

` : ''}NOW:
${text.slice(0, 16_000)}`,
      feature: 'knowledge',
      timeBudgetMs: 25_000,
    });
    const items: MenuItem[] = (Array.isArray(raw.items) ? (raw.items as MenuItem[]) : [])
      .filter((i) => i && typeof i.name === 'string' && i.name.trim())
      .map((i) => ({ name: i.name.trim().slice(0, 80), ...(typeof i.price === 'string' && i.price.trim() ? { price: i.price.trim().slice(0, 30) } : {}) }))
      .slice(0, 150);
    state.web = { checkedAt: new Date().toISOString(), text, items };
    if (!oldItems) return []; // first check: remember the starting point only

    const base = { clientId: c.clientId, competitorId: c.id, competitorName: c.name, source: 'website' as const, url: c.website };
    const findings: Finding[] = [];
    const oldMap = new Map(oldItems.map((i) => [itemKey(i.name), i]));
    const newMap = new Map(items.map((i) => [itemKey(i.name), i]));
    const added = items.filter((i) => !oldMap.has(itemKey(i.name)));
    const removed = items.length ? oldItems.filter((i) => !newMap.has(itemKey(i.name))) : []; // an empty read isn't "everything removed"
    const changed = items
      .map((i) => ({ now: i, was: oldMap.get(itemKey(i.name)) }))
      .filter((x) => x.was && x.was.price !== x.now.price && priceNumber(x.was.price) !== priceNumber(x.now.price));
    if (added.length) {
      findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: new Date().toISOString(), kind: 'new_product', title: `${added.length} new item${added.length === 1 ? '' : 's'} on the website`, detail: added.slice(0, 8).map((i) => `${i.name}${i.price ? ` (${i.price})` : ''}`).join(' · ') });
    }
    if (changed.length) {
      const fmt = (x: (typeof changed)[number]) => {
        const a = priceNumber(x.was!.price);
        const b = priceNumber(x.now.price);
        const pct = a && b ? ` (${b > a ? '+' : ''}${Math.round(((b - a) / a) * 100)}%)` : '';
        return `${x.now.name}: ${x.was!.price || '?'} → ${x.now.price || '?'}${pct}`;
      };
      findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: new Date().toISOString(), kind: 'website_change', title: `${changed.length} price change${changed.length === 1 ? '' : 's'}`, detail: changed.slice(0, 8).map(fmt).join(' · ') });
    }
    if (removed.length) {
      findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: new Date().toISOString(), kind: 'website_change', title: `${removed.length} item${removed.length === 1 ? '' : 's'} removed`, detail: removed.slice(0, 8).map((i) => i.name).join(' · ') });
    }
    if (typeof raw.other === 'string' && raw.other.trim()) {
      findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: new Date().toISOString(), kind: raw.offer === true ? 'offer' : 'website_change', title: raw.offer === true ? 'Offer on the website' : 'Website update', detail: raw.other.slice(0, 500) });
    }
    return findings;
  } catch (error) {
    state.web = { ...(state.web || { text: '' }), checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message.slice(0, 200) : 'failed' };
    return [];
  }
}

// ---------- Google (Places API, New) ----------

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

async function places<T>(path: string, init: RequestInit & { fieldMask: string }): Promise<T> {
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY || '', 'X-Goog-FieldMask': init.fieldMask },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Places: ${(data as { error?: { message?: string } }).error?.message || res.status}`);
  return data as T;
}

async function checkGoogle(c: Competitor, state: CompetitorState): Promise<Finding[]> {
  if (!c.google || !googleConfigured()) return [];
  try {
    let placeId = state.google?.placeId || (/^ChIJ[\w-]{10,}$/.test(c.google) ? c.google : undefined);
    if (!placeId) {
      const found = await places<{ places?: { id: string }[] }>('places:searchText', { method: 'POST', body: JSON.stringify({ textQuery: c.google }), fieldMask: 'places.id' });
      placeId = found.places?.[0]?.id;
      if (!placeId) throw new Error('Not found on Google Maps. Try the exact name and area.');
    }
    const p = await places<{ rating?: number; userRatingCount?: number; reviews?: { name: string; rating?: number; text?: { text?: string }; publishTime?: string }[] }>(`places/${placeId}`, {
      method: 'GET',
      fieldMask: 'rating,userRatingCount,reviews',
    });
    const findings: Finding[] = [];
    const prev = state.google;
    const base = { clientId: c.clientId, competitorId: c.id, competitorName: c.name, source: 'google' as const, url: `https://www.google.com/maps/place/?q=place_id:${placeId}` };
    if (prev?.rating !== undefined && p.rating !== undefined && Math.abs(p.rating - prev.rating) >= 0.1) {
      findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: new Date().toISOString(), kind: 'rating', title: `Google rating ${p.rating > prev.rating ? 'up' : 'down'}: ${prev.rating} → ${p.rating}`, detail: `${p.userRatingCount ?? '?'} reviews` });
    }
    const seen = new Set(prev?.seenReviews || []);
    if (prev) {
      for (const r of (p.reviews || []).filter((r) => !seen.has(r.name) && (r.rating || 5) <= 2).slice(0, 2)) {
        findings.push({ ...base, id: crypto.randomBytes(5).toString('base64url'), at: r.publishTime || new Date().toISOString(), kind: 'review', title: `New ${r.rating}★ review`, detail: (r.text?.text || '').slice(0, 300) });
      }
    }
    // One point a day, for "+N reviews this week" next to the client's own.
    const day = new Date().toISOString().slice(0, 10);
    const history = [...(prev?.history || []).filter((x) => x.d !== day), { d: day, rating: p.rating, count: p.userRatingCount }].slice(-120);
    state.google = { checkedAt: new Date().toISOString(), placeId, rating: p.rating, count: p.userRatingCount, seenReviews: [...new Set([...(p.reviews || []).map((r) => r.name), ...seen])].slice(0, 50), history };
    return findings;
  } catch (error) {
    state.google = { ...(state.google || { seenReviews: [] }), checkedAt: new Date().toISOString(), error: error instanceof Error ? error.message.slice(0, 200) : 'failed' };
    return [];
  }
}

// ---------- The run ----------

const due = (checkedAt: string | undefined, every: number) => !checkedAt || Date.now() - Date.parse(checkedAt) >= every;

/** Called every 5 minutes; checks whatever is due (Instagram every 3 h, website and Google daily) within a time budget. */
export async function runCompetitorChecks(opts: { budgetMs?: number; onlyId?: string; force?: boolean } = {}) {
  const deadline = Date.now() + (opts.budgetMs ?? 25_000);
  const competitors = (await allCompetitors()).filter((c) => !opts.onlyId || c.id === opts.onlyId);
  if (!competitors.length) return { checked: 0, findings: [] as Finding[] };
  const names = new Map((await listClientProfiles()).map((c) => [c.id, c.brandName]));
  const all: Finding[] = [];
  let checked = 0;
  for (const c of competitors) {
    if (Date.now() > deadline) break;
    const state = await getState(c.id);
    const clientName = names.get(c.clientId) || 'the client';
    const wantIg = c.instagram && (opts.force || due(state.ig?.checkedAt, IG_EVERY_MS));
    const wantWeb = c.website && (opts.force || due(state.web?.checkedAt, WEB_EVERY_MS));
    const wantGoogle = c.google && googleConfigured() && (opts.force || due(state.google?.checkedAt, GOOGLE_EVERY_MS));
    if (!wantIg && !wantWeb && !wantGoogle) continue;
    const found = [
      ...(wantIg ? await checkInstagram(c, state, clientName, deadline) : []),
      ...(wantWeb ? await checkWebsite(c, state, clientName) : []),
      ...(wantGoogle ? await checkGoogle(c, state) : []),
    ];
    await setSetting(stateKey(c.id), state);
    await addFindings(c.clientId, found);
    all.push(...found);
    checked++;
  }
  return { checked, findings: all };
}

/** Instagram followers now and gained in the last 7 days (null when not tracked yet). */
export async function instagramGrowth(id: string) {
  const ig = (await getState(id)).ig;
  if (!ig?.history?.length) return null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const last = ig.history[ig.history.length - 1];
  const base = [...ig.history].reverse().find((x) => x.d <= weekAgo) || ig.history[0];
  return { followers: last.followers, gained7: base.d !== last.d ? last.followers - base.followers : null };
}

/** The client's own Instagram followers now and gained in the last 7 days (from the daily snapshots). */
export async function clientInstagramGrowth(clientId: string) {
  const { data } = await supabase.from('social_follower_snapshots').select('day, ig_followers').eq('client_id', clientId).not('ig_followers', 'is', null).order('day', { ascending: false }).limit(10);
  const rows = (data || []) as { day: string; ig_followers: number }[];
  if (!rows.length) return null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const base = rows.find((r) => r.day <= weekAgo) || rows[rows.length - 1];
  return { followers: rows[0].ig_followers, gained7: base.day !== rows[0].day ? rows[0].ig_followers - base.ig_followers : null };
}

/** Google rating, review count and reviews gained in the last 7 days (null when not tracked yet). */
export async function googleGrowth(id: string) {
  const g = (await getState(id)).google;
  if (!g?.history?.length) return null;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const base = [...g.history].reverse().find((x) => x.d <= weekAgo) || g.history[0];
  const gained7 = base && base.count !== undefined && g.count !== undefined && base.d !== g.history[g.history.length - 1].d ? g.count - base.count : null;
  return { rating: g.rating, count: g.count, gained7 };
}

/** Last-seen status for the admin page. */
export async function competitorStatus(id: string) {
  const s = await getState(id);
  return {
    ig: s.ig ? { checkedAt: s.ig.checkedAt, followers: s.ig.followers, error: s.ig.error } : null,
    web: s.web ? { checkedAt: s.web.checkedAt, error: s.web.error } : null,
    google: s.google ? { checkedAt: s.google.checkedAt, rating: s.google.rating, count: s.google.count, error: s.google.error } : null,
  };
}

export function isoWeekday() {
  return cairoParts(new Date());
}
