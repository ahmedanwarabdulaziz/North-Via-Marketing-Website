import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appLibraryItems } from '@/lib/app-library';
import { getKnowledge, listCategories, setItemCategory, setKnowledgeStatus, similarKnowledge } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function load(params: Ctx['params']) {
  const { id } = await params;
  const item = await getKnowledge(id);
  if (!item) throw new AppError('Not found in the library.', 404);
  return item;
}

/** One item in full (text read from the screenshot or page) with similar items. */
export const GET = appRoute<Ctx>(async (_request, _device, { params }) => {
  const item = await load(params);
  const similar = await similarKnowledge(item, 4).catch(() => []);
  const [full] = await appLibraryItems([item], true);
  return { item: full, similar: await appLibraryItems(similar.filter((s) => s.status === 'active')) };
});

/** { action: 'remove' | 'restore' } or { action: 'category', categoryId } */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const item = await load(params);
  const body = await jsonBody<{ action?: unknown; categoryId?: unknown }>(request);
  let updated;
  switch (body.action) {
    case 'remove':
      updated = await setKnowledgeStatus(item.id, 'removed');
      break;
    case 'restore':
      updated = await setKnowledgeStatus(item.id, 'active');
      break;
    case 'category': {
      const categories = await listCategories();
      if (typeof body.categoryId !== 'string' || !categories.some((c) => c.id === body.categoryId)) throw new AppError('Unknown category.');
      updated = await setItemCategory(item.id, body.categoryId);
      break;
    }
    default:
      throw new AppError('Unknown action.');
  }
  const [full] = await appLibraryItems([updated], true);
  return { item: full, removed: updated.status === 'removed' };
});
