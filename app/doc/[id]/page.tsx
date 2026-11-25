import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuotePrintView } from '@/components/admin/QuotePrintView';
import { verifyQuoteShare } from '@/lib/quote-share';
import { getCompany, getDocById } from '@/lib/sales-docs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false }, title: 'مستند' };

/** A quote or invoice opened from the Anwarz app through a signed link (no admin sign-in needed). */
export default async function SharedDocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s } = await searchParams;
  if (!verifyQuoteShare(id, s)) notFound();
  const [doc, company] = await Promise.all([getDocById(id), getCompany()]);
  if (!doc) notFound();
  return <QuotePrintView doc={doc} company={company} emailEndpoint={`/api/doc/${doc.id}/email?s=${encodeURIComponent(String(s))}`} />;
}
