import { appRoute, jsonBody } from '@/lib/app-auth';
import { listDocs, saveDoc } from '@/lib/sales-docs';
import { computeTotals, type SalesDoc } from '@/lib/sales-docs-shared';

export const dynamic = 'force-dynamic';

/** Quotes and invoices (Sanad), newest first, with their totals. */
export const GET = appRoute(async () => {
  const docs = await listDocs();
  return {
    docs: docs.map((doc) => {
      const t = computeTotals(doc);
      return {
        id: doc.id,
        kind: doc.kind,
        number: doc.number,
        status: doc.status,
        issueDate: doc.issueDate,
        clientName: doc.clientName,
        currency: doc.currency,
        total: doc.show.totals === false ? null : doc.show.vat && doc.vatPercent > 0 ? t.total : t.afterDiscount,
        profit: doc.trackCost ? t.profit : null,
        margin: doc.trackCost ? t.margin : null,
      };
    }),
  };
});

export const POST = appRoute(async (request) => ({ doc: await saveDoc(await jsonBody<Partial<SalesDoc>>(request)) }));
