import type { CSSProperties } from 'react';
import { CompanyStamp } from '@/components/admin/CompanyStamp';
import {
  addDays,
  amountInArabicWords,
  computeTotals,
  formatNumber,
  formatQty,
  KIND_LABELS,
  lineTotal,
  SANAD_LOGO,
  type CompanyProfile,
  type SalesDoc,
} from '@/lib/sales-docs-shared';

const accent = '#1d3fa8';
const th = (width?: number): CSSProperties => ({ padding: '9px 6px', lineHeight: 1.2, fontSize: 12, fontWeight: 700, textAlign: 'center', verticalAlign: 'middle', width });
const td = (align: 'center' | 'right'): CSSProperties => ({ padding: '9px 8px', lineHeight: 1.2, borderBottom: '1px solid #e4e4e7', textAlign: align, verticalAlign: 'middle' });
const sumTd: CSSProperties = { whiteSpace: 'nowrap', padding: '5px 8px', borderBottom: '1px solid #e4e4e7' };
const sumVal: CSSProperties = { width: 120, whiteSpace: 'nowrap', padding: '5px 8px', borderBottom: '1px solid #e4e4e7', textAlign: 'left', fontWeight: 600 };

/** The printed copy: an A4 page. Cost and profit are never drawn here. */
export function SalesDocPrint({ doc, company }: { doc: SalesDoc; company: CompanyProfile }) {
  const t = computeTotals(doc);
  const s = doc.show;
  const isQuote = doc.kind === 'quote';
  const items = doc.items.filter((item) => item.name.trim() || item.price || item.qty);
  const validUntil = isQuote && doc.validDays > 0 ? addDays(doc.issueDate, doc.validDays) : '';
  const showVat = s.vat && doc.vatPercent > 0;
  const showDiscount = s.discount && t.discount > 0;
  const grand = showVat ? t.total : t.afterDiscount;
  const signer = (doc.signerName || company.signerName || '').trim();
  const termLines = doc.terms.filter((t) => t.on && t.text.trim()).map((t) => t.text.trim());
  const paymentLines = (company.paymentInfo || '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <div
      dir="rtl"
      className="sales-sheet mx-auto bg-white text-zinc-900"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm 15mm 12mm',
        fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
        fontSize: '12.5px',
        lineHeight: 1.6,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `3px solid ${accent}`, paddingBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <img src={SANAD_LOGO} alt="" style={{ height: 56, maxWidth: 120, objectFit: 'contain' }} />
          <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{company.nameAr}</div>
          {company.nameEn && <div style={{ fontSize: 12, color: '#52525b', direction: 'ltr', textAlign: 'right' }}>{company.nameEn}</div>}
          {company.taglineAr && <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{company.taglineAr}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#18181b' }}>{KIND_LABELS[doc.kind]}</div>
          <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>رقم: <b dir="ltr">{doc.number}</b></div>
          <div style={{ fontSize: 12, color: '#52525b' }}>التاريخ: <b dir="ltr">{doc.issueDate}</b></div>
          {s.validity && validUntil && (
            <div style={{ fontSize: 12, color: '#52525b' }}>ساري حتى: <b dir="ltr">{validUntil}</b> ({doc.validDays} يوم)</div>
          )}
        </div>
      </div>

      {/* Parties */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        <div style={{ flex: 1, border: '1px solid #e4e4e7', borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, color: '#71717a', fontWeight: 700 }}>{isQuote ? 'مقدم إلى' : 'فاتورة إلى'}</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{doc.clientName || '—'}</div>
          {doc.clientContact && <div>عناية: {doc.clientContact}</div>}
          {doc.clientAddress && <div>{doc.clientAddress}</div>}
          {doc.clientPhone && <div dir="ltr" style={{ textAlign: 'right' }}>{doc.clientPhone}</div>}
          {doc.clientTaxId && <div>الرقم الضريبي: <span dir="ltr">{doc.clientTaxId}</span></div>}
        </div>
        <div style={{ flex: 1, border: '1px solid #e4e4e7', borderRadius: 6, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, color: '#71717a', fontWeight: 700 }}>من</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{company.nameAr}</div>
          {company.address && <div>{company.address}</div>}
          {company.phone && <div dir="ltr" style={{ textAlign: 'right' }}>{company.phone}</div>}
          {company.email && <div dir="ltr" style={{ textAlign: 'right' }}>{company.email}</div>}
          {s.registration && company.commercialRegister && <div>السجل التجاري: <span dir="ltr">{company.commercialRegister}</span></div>}
          {s.registration && company.taxCard && <div>البطاقة الضريبية: <span dir="ltr">{company.taxCard}</span></div>}
        </div>
      </div>

      {doc.subject && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <b>الموضوع:</b> {doc.subject}
        </div>
      )}

      {/* Items */}
      <table className="items" style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr style={{ background: accent, color: '#fff' }}>
            <th style={th(34)}>#</th>
            <th style={th()}>البند</th>
            {s.unit && <th style={th(60)}>الوحدة</th>}
            {s.qty && <th style={th(60)}>الكمية</th>}
            {s.unitPrice && <th style={th(90)}>سعر الوحدة</th>}
            {s.lineTotal && <th style={th(100)}>الإجمالي</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 ? '#f8fafc' : '#fff', breakInside: 'avoid' }}>
              <td style={td('center')}>{i + 1}</td>
              <td style={td('center')}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                {s.itemDescription && item.description && (
                  <div style={{ fontSize: 11, color: '#52525b', whiteSpace: 'pre-line' }}>{item.description}</div>
                )}
              </td>
              {s.unit && <td style={td('center')}>{item.unit || ''}</td>}
              {s.qty && <td style={td('center')}>{formatQty(item.qty)}</td>}
              {s.unitPrice && <td style={td('center')} dir="ltr">{formatNumber(item.price)}</td>}
              {s.lineTotal && <td style={{ ...td('center'), fontWeight: 600 }} dir="ltr">{formatNumber(lineTotal(item))}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      {s.totals && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, breakInside: 'avoid' }}>
        <table style={{ width: 340, borderCollapse: 'collapse' }}>
          <tbody>
            {(showDiscount || showVat) && (
              <tr><td style={sumTd}>المجموع</td><td style={sumVal} dir="ltr">{formatNumber(t.subtotal)}</td></tr>
            )}
            {showDiscount && (
              <tr><td style={sumTd}>الخصم{doc.discountIsPercent ? ` (${doc.discount}%)` : ''}</td><td style={sumVal} dir="ltr">- {formatNumber(t.discount)}</td></tr>
            )}
            {showVat && (
              <>
                <tr><td style={sumTd}>الإجمالي بعد الخصم</td><td style={sumVal} dir="ltr">{formatNumber(t.afterDiscount)}</td></tr>
                <tr><td style={sumTd}>ضريبة القيمة المضافة ({doc.vatPercent}%)</td><td style={sumVal} dir="ltr">{formatNumber(t.vat)}</td></tr>
              </>
            )}
            <tr style={{ background: accent, color: '#fff' }}>
              <td style={{ ...sumTd, color: '#fff', fontWeight: 800, fontSize: 14 }}>الإجمالي</td>
              <td style={{ ...sumVal, color: '#fff', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap' }} dir="ltr">
                {formatNumber(grand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      )}

      {s.totals && s.amountInWords && (
        <div style={{ marginTop: 8, fontWeight: 600, color: '#3f3f46' }}>{amountInArabicWords(grand, doc.currency)}</div>
      )}

      {/* Terms and payment */}
      {((s.terms && termLines.length > 0) || (s.paymentInfo && paymentLines.length > 0)) && (
        <div style={{ display: 'flex', gap: 16, marginTop: 14, breakInside: 'avoid' }}>
          {s.terms && termLines.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: accent, marginBottom: 2 }}>الشروط والأحكام</div>
              <div style={{ fontSize: 12 }}>
                {termLines.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <span>•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {s.paymentInfo && paymentLines.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: accent, marginBottom: 2 }}>بيانات الدفع</div>
              {paymentLines.map((line, i) => <div key={i} style={{ fontSize: 12 }}>{line}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Signature and stamp */}
      {(s.stamp || s.signature) && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 28, alignItems: 'flex-end', marginTop: 6, breakInside: 'avoid', minHeight: 150, paddingTop: 4, position: 'relative' }}>
          <div style={{ width: 200, textAlign: 'center' }}>
            {s.signature && (
              <>
                <div style={{ fontWeight: 700 }}>{company.signerTitle}</div>
                <div style={{ minHeight: 62, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {signer && <HandSignature name={signer} color={company.stampColor} />}
                </div>
                <div style={{ borderTop: '1px solid #71717a', marginTop: 2 }} />
              </>
            )}
          </div>
          <div style={{ marginTop: -22 }}>
            {s.stamp && (
              <CompanyStamp commercialRegister={company.commercialRegister} taxCard={company.taxCard} color={company.stampColor} size={165} />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #d4d4d8', marginTop: 12, paddingTop: 6, fontSize: 10.5, color: '#71717a', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{company.nameAr}{company.address ? ` — ${company.address}` : ''}</span>
        <span dir="ltr">{[company.phone, company.email, company.website].filter(Boolean).join('  •  ')}</span>
      </div>
    </div>
  );
}

/** A name written like a signature: calligraphic Arabic, or a script font for Latin letters. */
function HandSignature({ name, color }: { name: string; color: string }) {
  const arabic = /[؀-ۿ]/.test(name);
  return (
    <span
      style={{
        fontFamily: arabic ? "'Aref Ruqaa', 'Segoe UI', serif" : "'Mrs Saint Delafield', 'Brush Script MT', cursive",
        fontSize: arabic ? 30 : 46,
        fontWeight: arabic ? 700 : 400,
        lineHeight: 1.1,
        color,
        display: 'inline-block',
        transform: 'rotate(-5deg)',
        mixBlendMode: 'multiply',
        opacity: 0.92,
        whiteSpace: 'nowrap',
      }}
    >
      {name}
    </span>
  );
}
