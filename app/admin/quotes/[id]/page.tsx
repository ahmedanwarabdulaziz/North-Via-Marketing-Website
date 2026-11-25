import { notFound } from 'next/navigation';
import { SalesDocEditor } from '@/components/admin/SalesDocEditor';
import { getCompany, getDocById, listDocs } from '@/lib/sales-docs';
import { blankDoc, nextNumber, todayIso, type DocKind } from '@/lib/sales-docs-shared';

export const dynamic = 'force-dynamic';

export default async function QuoteEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; from?: string }>;
}) {
  const { id } = await params;
  const { kind, from } = await searchParams;
  const [company, docs] = await Promise.all([getCompany(), listDocs()]);

  if (id !== 'new') {
    const doc = docs.find((d) => d.id === id);
    if (!doc) notFound();
    return <SalesDocEditor key={doc.id} initial={doc} allDocs={docs} />;
  }

  const docKind: DocKind = kind === 'invoice' ? 'invoice' : 'quote';
  const initial = blankDoc(docKind, docs, company);

  // An invoice made from a quote starts as a copy of it.
  const source = from ? await getDocById(from) : null;
  if (source) {
    const issueDate = todayIso();
    Object.assign(initial, {
      ...source,
      id: '',
      kind: 'invoice' as const,
      number: nextNumber('invoice', docs, issueDate),
      status: 'draft' as const,
      issueDate,
      fromQuoteId: source.id,
      createdAt: initial.createdAt,
      updatedAt: initial.updatedAt,
    });
  }

  return <SalesDocEditor key={`new-${docKind}-${from || ''}`} initial={initial} allDocs={docs} />;
}
