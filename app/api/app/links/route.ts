import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { addQuickLink, countQuickLinkUse, listQuickLinks, removeQuickLink, updateQuickLink } from '@/lib/quick-links';

export const dynamic = 'force-dynamic';

/** Quick links to share fast: pinned first, then the most used. */
export const GET = appRoute(async () => {
  const [links, names] = await Promise.all([listQuickLinks(), clientNames()]);
  return {
    links: links.map((l) => ({ ...l, clientName: l.clientId ? names.get(l.clientId) || null : null })),
    clients: [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
});

/**
 * { action: 'add', title, url, message?, clientId?, pinned? }
 * { action: 'edit', id, title?, url?, message?, clientId?, pinned? }
 * { action: 'remove', id }
 * { action: 'used', id }   counted when shared, so the most used rise to the top
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<Record<string, unknown>>(request);
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const id = str(body.id);
  try {
    switch (body.action) {
      case 'add': {
        const title = str(body.title)?.trim();
        const url = str(body.url)?.trim();
        if (!title || !url) throw new AppError('A link needs a name and a URL.');
        return { link: await addQuickLink({ title, url, message: str(body.message) ?? null, clientId: str(body.clientId) ?? null, pinned: body.pinned === true }) };
      }
      case 'edit':
        if (!id) throw new AppError('Which link?');
        return {
          link: await updateQuickLink(id, {
            ...(body.title !== undefined ? { title: str(body.title) ?? '' } : {}),
            ...(body.url !== undefined ? { url: str(body.url) ?? '' } : {}),
            ...(body.message !== undefined ? { message: str(body.message) ?? null } : {}),
            ...(body.clientId !== undefined ? { clientId: str(body.clientId) ?? null } : {}),
            ...(body.pinned !== undefined ? { pinned: body.pinned === true } : {}),
          }),
        };
      case 'remove':
        if (!id) throw new AppError('Which link?');
        await removeQuickLink(id);
        return { ok: true };
      case 'used':
        if (id) await countQuickLinkUse(id);
        return { ok: true };
      default:
        throw new AppError('Unknown action.');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Bad URL, not found, too many: the message is meant for the user.
    throw new AppError(error instanceof Error ? error.message : String(error));
  }
});
