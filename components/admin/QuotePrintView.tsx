import { PrintToolbar } from '@/components/admin/PrintToolbar';
import { SalesDocPrint } from '@/components/admin/SalesDocPrint';
import { addDays, computeTotals, docFileName, formatNumber, KIND_LABELS, type CompanyProfile, type SalesDoc } from '@/lib/sales-docs-shared';

/** The preview page body: toolbar (download, WhatsApp, email, print) and the A4 sheet. */
export function QuotePrintView({ doc, company, editHref, emailEndpoint }: { doc: SalesDoc; company: CompanyProfile; editHref?: string; emailEndpoint: string }) {
  const totals = computeTotals(doc);
  const grand = doc.show.vat && doc.vatPercent > 0 ? totals.total : totals.afterDiscount;

  return (
    <div className="bg-zinc-200 print:bg-white py-6 print:py-0 min-h-full">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Mrs+Saint+Delafield&display=swap" />
      <style>{`
        @page { size: A4; margin: 12mm 0; }
        @media print {
          html, body { background: #fff !important; }
          .sales-sheet-wrap { overflow: visible !important; }
          .sales-sheet {
            display: block !important;
            width: 210mm !important;
            min-height: 0 !important;
            padding: 0 15mm !important;
            box-shadow: none !important;
          }
          .sales-sheet thead { display: table-header-group; }
          .sales-sheet tfoot { display: table-footer-group; }
          .sales-sheet tr, .sales-sheet table { break-inside: avoid; page-break-inside: avoid; }
          .sales-sheet table.items { break-inside: auto; page-break-inside: auto; }
          .sales-sheet th, .sales-sheet td { line-height: 1.2; vertical-align: middle; }
          .sales-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <PrintToolbar
        docId={doc.id}
        editHref={editHref}
        emailEndpoint={emailEndpoint}
        fileName={docFileName(doc, company)}
        kindLabel={KIND_LABELS[doc.kind]}
        number={doc.number}
        companyName={company.nameAr}
        clientName={doc.clientName}
        clientPhone={doc.clientPhone}
        clientEmail={doc.clientEmail}
        totalText={doc.show.totals ? `${formatNumber(grand)} ${doc.currency}` : undefined}
        validUntil={doc.kind === 'quote' && doc.validDays > 0 ? addDays(doc.issueDate, doc.validDays) : undefined}
      />
      <div className="sales-sheet-wrap overflow-x-auto">
        <div className="shadow-xl print:shadow-none mx-auto w-fit">
          <SalesDocPrint doc={doc} company={company} />
        </div>
      </div>
    </div>
  );
}
