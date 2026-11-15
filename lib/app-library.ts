import { listClientProfiles } from './admin-ops';
import {
  analyzeLink,
  analyzeNote,
  analyzeScreenshot,
  findUrls,
  listCategories,
  newKnowledgeId,
  readPage,
  saveKnowledge,
  storeImage,
  type KnowledgeItem,
  type LibraryClient,
} from './knowledge';
import { supabase } from './supabase';

// The library for the Anwarz app: same AI reading and storage as the Telegram bot
// (lib/knowledge-telegram.ts), without the Telegram messages.

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const NOTE_PREFIX = /^(save|note|keep|احفظ|حفظ|ملاحظة|ملاحظه)\s*[:：\-–]?\s+/i;

export async function libraryClients(): Promise<LibraryClient[]> {
  return (await listClientProfiles()).filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName, owner: c.ownerName || undefined }));
}

/** Short-lived links to screenshots in the private bucket (one call for the whole list). */
async function imageLinks(items: KnowledgeItem[]) {
  const paths = items.map((i) => i.file_path).filter((p): p is string => Boolean(p));
  if (!paths.length) return new Map<string, string>();
  const { data, error } = await supabase.storage.from('knowledge').createSignedUrls(paths, 3600);
  if (error || !data) return new Map<string, string>();
  return new Map(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
}

export async function appLibraryItems(items: KnowledgeItem[], full = false) {
  const [links, clients, categories] = await Promise.all([imageLinks(items), libraryClients(), listCategories()]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const category = new Map(categories.map((c) => [c.id, c]));
  return items.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    summary: i.summary,
    url: i.url,
    domain: i.domain,
    tags: i.tags,
    clientId: i.client_id,
    clientName: i.client_id ? clientName.get(i.client_id) || null : null,
    personal: i.category === 'personal',
    categoryId: i.category_id,
    categoryName: category.get(i.category_id) ? `${category.get(i.category_id)!.emoji} ${category.get(i.category_id)!.name}` : null,
    imageUrl: i.file_path ? links.get(i.file_path) || null : null,
    createdAt: i.created_at,
    ...(full ? { content: i.content, sourceText: i.source_text } : {}),
  }));
}

/** A screenshot or photo shared from the phone. */
export async function saveImageFromApp(image: { data: string; mimeType: string }, caption: string) {
  const bytes = Buffer.from(image.data, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error('That image is too big (over 15 MB).');
  const id = newKnowledgeId();
  const clients = await libraryClients();
  const [analysis, filePath] = await Promise.all([
    analyzeScreenshot({ data: image.data, mimeType: image.mimeType }, caption, clients),
    storeImage(id, bytes, image.mimeType).catch((error) => {
      console.error('App library: image upload failed:', error);
      return null;
    }),
  ]);
  const item = await saveKnowledge({ id, chatId: 'app', type: 'screenshot', analysis, filePath, sourceText: caption || null, extra: { source: 'app' } });
  return { item, taskRequest: analysis.taskRequest };
}

/** A link (with any words around it) or a plain note. */
export async function saveTextFromApp(text: string) {
  const clients = await libraryClients();
  const url = findUrls(text)[0];
  if (url) {
    const note = text.replace(url, '').replace(NOTE_PREFIX, '').trim();
    const page = await readPage(url);
    const analysis = await analyzeLink(url, page, note, clients);
    const item = await saveKnowledge({ chatId: 'app', type: 'link', analysis, url, sourceText: text, extra: { pageRead: Boolean(page), source: 'app' } });
    return { item, taskRequest: analysis.taskRequest };
  }
  const body = text.replace(NOTE_PREFIX, '').trim();
  const analysis = await analyzeNote(body, clients);
  const item = await saveKnowledge({ chatId: 'app', type: 'note', analysis, sourceText: text, extra: { source: 'app' } });
  return { item, taskRequest: null };
}
