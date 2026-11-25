import { AppError, appRoute } from '@/lib/app-auth';
import { quoteShareLink } from '@/lib/quote-share';
import { blankDoc, nextNumber, todayIso, type DocKind } from '@/lib/sales-docs-shared';
import { deleteDoc, getCompany, getDocById, listDocs } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * One document with its signed preview link. `id` = "new" gives a blank one (?kind=quote|invoice),
 * or with ?from=<quote id> an invoice that starts as a copy of that quote.
 */
export const GET = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const url = new URL(request.url);
  const [company, docs] = await Promise.all([getCompany(), listDocs()]);

  if (id === 'new') {
    const kind: DocKind = url.searchParams.get('kind') === 'invoice' ? 'invoice' : 'quote';
    const doc = blankDoc(kind, docs, company);
    const source = url.searchParams.get('from') ? await getDocById(url.searchParams.get('from') as string) : null;
    if (source) {
      const issueDate = todayIso();
      Object.assign(doc, { ...source, id: '', kind: 'invoice', number: nextNumber('invoice', docs, issueDate), status: 'draft', issueDate, fromQuoteId: source.id, createdAt: doc.createdAt, updatedAt: doc.updatedAt });
    }
    return { doc, link: null };
  }

  const doc = docs.find((d) => d.id === id);
  if (!doc) throw new AppError('Not found', 404);
  return { doc, link: quoteShareLink(url.origin, doc.id) };
});

/** The app only sends GET and POST: `{ action: 'delete' }` removes the document. */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== 'delete') throw new AppError('Unknown action');
  await deleteDoc((await params).id);
  return { ok: true };
});
