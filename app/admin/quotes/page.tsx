import Link from 'next/link';
import { FileText, Plus, Building2 } from 'lucide-react';
import { listDocs } from '@/lib/sales-docs';
import { KIND_LABELS, STATUS_LABELS, computeTotals, formatNumber } from '@/lib/sales-docs-shared';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const docs = await listDocs();

  return (
    <div dir="rtl" className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" /> عروض الأسعار والفواتير
          </h1>
          <p className="text-zinc-500 mt-2">سند للتطوير العقاري: اعمل عرض سعر أو فاتورة واطبعها PDF بالختم.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/quotes/company" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <Building2 className="w-4 h-4" /> بيانات الشركة والختم
          </Link>
          <Link href="/admin/quotes/new?kind=invoice" className="inline-flex items-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
            <Plus className="w-4 h-4" /> فاتورة جديدة
          </Link>
          <Link href="/admin/quotes/new?kind=quote" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="w-4 h-4" /> عرض سعر جديد
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {docs.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">لسه مفيش مستندات. ابدأ بعرض سعر جديد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الرقم</th>
                  <th className="px-4 py-3 text-right font-semibold">النوع</th>
                  <th className="px-4 py-3 text-right font-semibold">العميل</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-left font-semibold">الإجمالي</th>
                  <th className="px-4 py-3 text-left font-semibold">الربح</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {docs.map((doc) => {
                  const t = computeTotals(doc);
                  return (
                    <tr key={doc.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium" dir="ltr"><Link href={`/admin/quotes/${doc.id}`} className="text-blue-700 hover:underline">{doc.number}</Link></td>
                      <td className="px-4 py-3">{KIND_LABELS[doc.kind]}</td>
                      <td className="px-4 py-3">{doc.clientName}</td>
                      <td className="px-4 py-3 text-zinc-500" dir="ltr">{doc.issueDate}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs">{STATUS_LABELS[doc.status]}</span></td>
                      <td className="px-4 py-3 text-left font-semibold" dir="ltr">{formatNumber(t.total)}</td>
                      <td className={`px-4 py-3 text-left ${t.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">
                        {doc.trackCost ? `${formatNumber(t.profit)} (${t.margin}%)` : '—'}
                      </td>
                      <td className="px-4 py-3 text-left whitespace-nowrap">
                        <Link href={`/admin/quotes/${doc.id}/print`} className="text-xs font-medium text-zinc-600 hover:text-blue-700">طباعة PDF</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
