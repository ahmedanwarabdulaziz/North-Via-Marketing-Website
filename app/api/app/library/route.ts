import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appLibraryItems, saveImageFromApp, saveTextFromApp } from '@/lib/app-library';
import { knowledgeCounts, listCategories, listKnowledge, searchKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * The library, newest first, or a search (by meaning and by words, like /find).
 * GET ?q=<search> &category=<category id> &client=<client id | '-' work without client> &personal=1
 */
export const GET = appRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim();
  const [items, categories, counts] = await Promise.all([
    q
      ? searchKnowledge(q.slice(0, 200), 30)
      : listKnowledge({
          limit: 60,
          categoryId: params.get('category') || undefined,
          clientId: params.get('client') || null,
          personal: params.get('personal') === '1',
        }),
    listCategories(),
    knowledgeCounts(),
  ]);
  return {
    items: await appLibraryItems(items.filter((i) => i.status === 'active')),
    total: counts.total,
    categories: categories
      .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, count: counts.byCategory.get(c.id) || 0 }))
      .filter((c) => c.count > 0),
  };
});

/**
 * Saves to the library (the AI reads and files it, like sending it to the Telegram bot).
 * { text }                                          a link (with any note) or a plain note
 * { image: { data: base64, mimeType }, caption? }   a screenshot or photo
 * → { item, taskRequest } (taskRequest: the AI saw "remind me …" in the caption or note)
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ text?: unknown; image?: { data?: unknown; mimeType?: unknown }; caption?: unknown }>(request);
  const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, 1000) : '';
  let saved;
  if (body.image && typeof body.image.data === 'string' && typeof body.image.mimeType === 'string') {
    if (!/^image\//.test(body.image.mimeType)) throw new AppError('Only images can be saved this way.');
    if (body.image.data.length > 21_000_000) throw new AppError('That image is too big (over 15 MB).', 413);
    saved = await saveImageFromApp({ data: body.image.data, mimeType: body.image.mimeType }, caption);
  } else if (typeof body.text === 'string' && body.text.trim()) {
    saved = await saveTextFromApp(body.text.trim().slice(0, 8000));
  } else {
    throw new AppError('Send text, a link or an image.');
  }
  const [item] = await appLibraryItems([saved.item], true);
  return { item, taskRequest: saved.taskRequest };
});
