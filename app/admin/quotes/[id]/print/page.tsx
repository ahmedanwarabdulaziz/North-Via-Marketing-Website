import { notFound } from 'next/navigation';
import { QuotePrintView } from '@/components/admin/QuotePrintView';
import { getCompany, getDocById } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, company] = await Promise.all([getDocById(id), getCompany()]);
  if (!doc) notFound();
  return <QuotePrintView doc={doc} company={company} editHref={`/admin/quotes/${doc.id}`} emailEndpoint={`/api/admin/quotes/${doc.id}/email`} />;
}
