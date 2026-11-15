import crypto from 'crypto';
import { getSetting, setSetting } from './data/store';

// Quick links: links Ahmed shares often (portfolio, booking page, payment link, a client's
// Google review link…), each with an optional message sent with it. Kept in app_settings so
// every device sees the same list. Used by the Anwarz app's Links page.

const KEY = 'quick_links';
const MAX_LINKS = 100;

export interface QuickLink {
  id: string;
  title: string;
  url: string;
  message: string | null; // text sent before the link, e.g. "Here's our portfolio 👇"
  clientId: string | null;
  pinned: boolean; // shown as a one-tap chip on Home
  uses: number; // times shared, so the most used come first
  createdAt: string;
  updatedAt: string;
}

export async function listQuickLinks(): Promise<QuickLink[]> {
  const stored = await getSetting<{ links?: QuickLink[] }>(KEY).catch(() => null);
  return (stored?.links || []).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.uses - a.uses || a.title.localeCompare(b.title));
}

async function save(links: QuickLink[]) {
  await setSetting(KEY, { links: links.slice(0, MAX_LINKS) });
}

export function normalizeLinkUrl(input: string) {
  const raw = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme); // throws on garbage
  if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) throw new Error('Only web, email and phone links are allowed.');
  return url.toString();
}

export async function addQuickLink(input: { title: string; url: string; message?: string | null; clientId?: string | null; pinned?: boolean }) {
  const links = await listQuickLinks();
  if (links.length >= MAX_LINKS) throw new Error(`You can keep up to ${MAX_LINKS} links.`);
  const now = new Date().toISOString();
  const link: QuickLink = {
    id: crypto.randomBytes(5).toString('base64url'),
    title: input.title.trim().slice(0, 80),
    url: normalizeLinkUrl(input.url),
    message: input.message?.trim().slice(0, 1000) || null,
    clientId: input.clientId || null,
    pinned: Boolean(input.pinned),
    uses: 0,
    createdAt: now,
    updatedAt: now,
  };
  await save([...links, link]);
  return link;
}

export async function updateQuickLink(id: string, patch: Partial<Pick<QuickLink, 'title' | 'url' | 'message' | 'clientId' | 'pinned'>>) {
  const links = await listQuickLinks();
  const link = links.find((l) => l.id === id);
  if (!link) throw new Error('Link not found.');
  if (patch.title !== undefined) link.title = patch.title.trim().slice(0, 80) || link.title;
  if (patch.url !== undefined) link.url = normalizeLinkUrl(patch.url);
  if (patch.message !== undefined) link.message = patch.message?.trim().slice(0, 1000) || null;
  if (patch.clientId !== undefined) link.clientId = patch.clientId || null;
  if (patch.pinned !== undefined) link.pinned = Boolean(patch.pinned);
  link.updatedAt = new Date().toISOString();
  await save(links);
  return link;
}

export async function removeQuickLink(id: string) {
  const links = await listQuickLinks();
  if (!links.some((l) => l.id === id)) throw new Error('Link not found.');
  await save(links.filter((l) => l.id !== id));
}

/** Counts a share, so the links used most rise to the top. */
export async function countQuickLinkUse(id: string) {
  const links = await listQuickLinks();
  const link = links.find((l) => l.id === id);
  if (!link) return;
  link.uses += 1;
  await save(links);
}
