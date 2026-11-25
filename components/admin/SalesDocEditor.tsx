'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Copy, Eye, Plus, Save, Trash2 } from 'lucide-react';
import {
  STATUS_LABELS,
  SHOW_LABELS,
  KIND_LABELS,
  addDays,
  computeTotals,
  formatNumber,
  itemMargin,
  lineTotal,
  newItem,
  newTerm,
  nextNumber,
  type DocItem,
  type DocKind,
  type DocShow,
  type DocStatus,
  type SalesDoc,
} from '@/lib/sales-docs-shared';

const input = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const label = 'block text-xs font-semibold text-zinc-500 mb-1';

export function SalesDocEditor({ initial, allDocs }: { initial: SalesDoc; allDocs: SalesDoc[] }) {
  const router = useRouter();
  const [doc, setDoc] = useState<SalesDoc>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const totals = useMemo(() => computeTotals(doc), [doc]);
  const isNew = !doc.id;
  const isQuote = doc.kind === 'quote';

  const set = <K extends keyof SalesDoc>(key: K, value: SalesDoc[K]) => setDoc((d) => ({ ...d, [key]: value }));
  const setItem = (id: string, patch: Partial<DocItem>) =>
    setDoc((d) => ({ ...d, items: d.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const changeKind = (kind: DocKind) => {
    setDoc((d) => ({ ...d, kind, number: isNew ? nextNumber(kind, allDocs, d.issueDate) : d.number }));
  };

  async function save(): Promise<SalesDoc | null> {
    setSaving(true);
    setError('');
    try {
      if (!doc.clientName.trim()) throw new Error('اكتب اسم العميل أولاً');
      const res = await fetch('/api/admin/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر الحفظ');
      setDoc(data.doc);
      setSavedAt(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      if (isNew) router.replace(`/admin/quotes/${data.doc.id}`);
      return data.doc as SalesDoc;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndPrint() {
    const saved = await save();
    if (saved) router.push(`/admin/quotes/${saved.id}/print`);
  }

  async function remove() {
    if (!doc.id || !confirm('حذف هذا المستند نهائياً؟')) return;
    await fetch(`/api/admin/quotes/${doc.id}`, { method: 'DELETE' });
    router.push('/admin/quotes');
  }

  async function convertToInvoice() {
    const saved = await save();
    if (saved) router.push(`/admin/quotes/new?kind=invoice&from=${saved.id}`);
  }

  return (
    <div dir="rtl" className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotes" className="text-zinc-500 hover:text-zinc-900" aria-label="رجوع">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">
            {isNew ? 'جديد: ' : ''}{KIND_LABELS[doc.kind]} <span className="text-zinc-400 font-normal" dir="ltr">{doc.number}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {savedAt && <span className="text-xs text-emerald-600">تم الحفظ {savedAt}</span>}
          {!isNew && isQuote && (
            <button onClick={convertToInvoice} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50">
              <Copy className="w-4 h-4" /> حوّل لفاتورة
            </button>
          )}
          {!isNew && (
            <button onClick={remove} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> حذف
            </button>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            <Save className="w-4 h-4" /> حفظ
          </button>
          <button onClick={saveAndPrint} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <Eye className="w-4 h-4" /> معاينة وطباعة PDF
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basics */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <span className={label}>النوع</span>
                <div className="flex rounded-lg border border-zinc-300 overflow-hidden text-sm">
                  {(['quote', 'invoice'] as DocKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={!isNew}
                      onClick={() => changeKind(k)}
                      className={`flex-1 py-2 ${doc.kind === k ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600'} disabled:cursor-not-allowed`}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label}>الرقم</label>
                <input className={input} dir="ltr" value={doc.number} onChange={(e) => set('number', e.target.value)} />
              </div>
              <div>
                <label className={label}>التاريخ</label>
                <input className={input} type="date" value={doc.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
              </div>
              <div>
                <label className={label}>الحالة</label>
                <select className={input} value={doc.status} onChange={(e) => set('status', e.target.value as DocStatus)}>
                  {(Object.keys(STATUS_LABELS) as DocStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              {isQuote && (
                <div className="sm:col-span-4 flex flex-wrap items-end gap-4">
                  <div className="w-48">
                    <label className={label}>مدة سريان العرض (بالأيام)</label>
                    <input className={input} type="number" min={0} value={doc.validDays} onChange={(e) => set('validDays', num(e.target.value))} />
                  </div>
                  {doc.validDays > 0 && (
                    <p className="text-sm text-zinc-500 pb-2">ينتهي العرض في <b dir="ltr">{addDays(doc.issueDate, doc.validDays)}</b></p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Client */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-bold text-zinc-900 mb-4">العميل</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={label}>اسم العميل / الجهة *</label>
                <input className={input} value={doc.clientName} onChange={(e) => set('clientName', e.target.value)} />
              </div>
              <div>
                <label className={label}>عناية السيد/ة</label>
                <input className={input} value={doc.clientContact || ''} onChange={(e) => set('clientContact', e.target.value)} />
              </div>
              <div>
                <label className={label}>التليفون</label>
                <input className={input} dir="ltr" value={doc.clientPhone || ''} onChange={(e) => set('clientPhone', e.target.value)} />
              </div>
              <div>
                <label className={label}>إيميل العميل</label>
                <input className={input} dir="ltr" type="email" value={doc.clientEmail || ''} onChange={(e) => set('clientEmail', e.target.value)} />
              </div>
              <div>
                <label className={label}>العنوان</label>
                <input className={input} value={doc.clientAddress || ''} onChange={(e) => set('clientAddress', e.target.value)} />
              </div>
              <div>
                <label className={label}>الرقم الضريبي للعميل</label>
                <input className={input} dir="ltr" value={doc.clientTaxId || ''} onChange={(e) => set('clientTaxId', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>الموضوع</label>
                <input className={input} value={doc.subject || ''} onChange={(e) => set('subject', e.target.value)} placeholder="مثال: توريد وتركيب أعمال التشطيبات" />
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-900">البنود</h2>
              <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                <input type="checkbox" checked={doc.trackCost} onChange={(e) => set('trackCost', e.target.checked)} className="h-4 w-4 accent-blue-600" />
                تسجيل سعر التكلفة ونسبة الربح
              </label>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500">
                    <th className="w-7 pb-1 text-center font-semibold">#</th>
                    <th className="pb-1 text-right font-semibold">البند</th>
                    <th className="w-16 pb-1 text-right font-semibold">الوحدة</th>
                    <th className="w-16 pb-1 text-right font-semibold">الكمية</th>
                    {doc.trackCost && <th className="w-24 pb-1 text-right font-semibold text-amber-700">التكلفة</th>}
                    <th className="w-24 pb-1 text-right font-semibold">سعر البيع</th>
                    <th className="w-24 pb-1 text-right font-semibold">الإجمالي</th>
                    {doc.trackCost && <th className="w-14 pb-1 text-right font-semibold text-amber-700">ربح</th>}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((item, i) => {
                    const cell = 'p-0.5 align-middle';
                    const small = 'w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
                    return (
                      <tr key={item.id}>
                        <td className="text-center text-xs text-zinc-400">{i + 1}</td>
                        <td className={cell}>
                          <input className={small} placeholder="اسم البند" value={item.name} onChange={(e) => setItem(item.id, { name: e.target.value })} />
                        </td>
                        <td className={cell}>
                          <input className={small} value={item.unit || ''} onChange={(e) => setItem(item.id, { unit: e.target.value })} placeholder="م٢" />
                        </td>
                        <td className={cell}>
                          <input className={small} type="number" min={0} step="any" value={item.qty} onChange={(e) => setItem(item.id, { qty: num(e.target.value) })} />
                        </td>
                        {doc.trackCost && (
                          <td className={cell}>
                            <input className={`${small} border-amber-300 bg-amber-50`} type="number" min={0} step="any" value={item.cost ?? ''} onChange={(e) => setItem(item.id, { cost: e.target.value === '' ? undefined : num(e.target.value) })} />
                          </td>
                        )}
                        <td className={cell}>
                          <input className={small} type="number" min={0} step="any" value={item.price} onChange={(e) => setItem(item.id, { price: num(e.target.value) })} />
                        </td>
                        <td className={`${cell} px-2 font-semibold whitespace-nowrap`} dir="ltr">{formatNumber(lineTotal(item))}</td>
                        {doc.trackCost && (
                          <td className={`${cell} text-xs whitespace-nowrap ${item.cost !== undefined && item.price - item.cost < 0 ? 'text-red-600' : 'text-emerald-700'}`} dir="ltr">
                            {item.cost !== undefined ? `${itemMargin(item)}%` : '—'}
                          </td>
                        )}
                        <td className={cell}>
                          <button
                            type="button"
                            onClick={() => set('items', doc.items.length > 1 ? doc.items.filter((x) => x.id !== item.id) : [newItem()])}
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="حذف البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => set('items', [...doc.items, newItem()])} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:border-blue-400 hover:text-blue-600">
              <Plus className="w-4 h-4" /> إضافة بند
            </button>
          </section>

          {/* Terms and notes */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={label}>الشروط والأحكام (علّم على اللي يظهر في الطباعة)</span>
                <button type="button" onClick={() => set('terms', [...doc.terms, newTerm()])} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                  <Plus className="w-3.5 h-3.5" /> إضافة شرط
                </button>
              </div>
              <div className="space-y-2">
                {doc.terms.map((term) => (
                  <div key={term.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={term.on}
                      onChange={(e) => set('terms', doc.terms.map((t) => (t.id === term.id ? { ...t, on: e.target.checked } : t)))}
                      className="mt-2.5 h-4 w-4 accent-blue-600"
                      aria-label="يظهر في الطباعة"
                    />
                    <textarea
                      rows={1}
                      className={`${input} ${term.on ? '' : 'text-zinc-400 line-through'}`}
                      value={term.text}
                      onChange={(e) => set('terms', doc.terms.map((t) => (t.id === term.id ? { ...t, text: e.target.value } : t)))}
                    />
                    <button type="button" onClick={() => set('terms', doc.terms.filter((t) => t.id !== term.id))} className="mt-1 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600" aria-label="حذف الشرط">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {doc.terms.length === 0 && <p className="text-sm text-zinc-400">مفيش شروط. اضغط «إضافة شرط».</p>}
              </div>
            </div>
            <div>
              <label className={label}>ملاحظات داخلية (لا تظهر في الطباعة أبداً)</label>
              <textarea className={`${input} border-amber-300 bg-amber-50`} rows={3} value={doc.notes || ''} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </section>
        </div>

        {/* Side: totals, profit, what shows */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-4">
            <h2 className="font-bold text-zinc-900 mb-4">الإجمالي</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={label}>الخصم</label>
                <div className="flex gap-1">
                  <input className={input} type="number" min={0} step="any" value={doc.discount} onChange={(e) => set('discount', num(e.target.value))} />
                  <button type="button" onClick={() => set('discountIsPercent', !doc.discountIsPercent)} className="rounded-lg border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    {doc.discountIsPercent ? '%' : 'ج'}
                  </button>
                </div>
              </div>
              <div>
                <label className={label}>ضريبة القيمة المضافة %</label>
                <input className={input} type="number" min={0} max={100} step="any" value={doc.vatPercent} onChange={(e) => set('vatPercent', num(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className={label}>العملة</label>
                <input className={input} value={doc.currency} onChange={(e) => set('currency', e.target.value)} />
              </div>
            </div>
            <dl className="space-y-1.5 text-sm">
              <Row k="الإجمالي" v={formatNumber(totals.subtotal)} />
              {totals.discount > 0 && <Row k="الخصم" v={`- ${formatNumber(totals.discount)}`} />}
              {doc.vatPercent > 0 && <Row k={`الضريبة ${doc.vatPercent}%`} v={formatNumber(totals.vat)} />}
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
                <dt>المطلوب</dt>
                <dd dir="ltr">{formatNumber(totals.total)}</dd>
              </div>
            </dl>

            {doc.trackCost && (
              <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h3 className="text-sm font-bold text-amber-900 mb-2">الربح (داخلي، لا يُطبع)</h3>
                <dl className="space-y-1.5 text-sm">
                  <Row k="التكلفة" v={formatNumber(totals.cost)} />
                  <Row k="سعر البيع بعد الخصم" v={formatNumber(totals.afterDiscount)} />
                  <div className={`flex justify-between font-bold ${totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    <dt>صافي الربح</dt>
                    <dd dir="ltr">{formatNumber(totals.profit)}</dd>
                  </div>
                  <div className={`flex justify-between font-bold ${totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    <dt>نسبة الربح من البيع</dt>
                    <dd dir="ltr">{totals.margin}%</dd>
                  </div>
                  <Row k="نسبة الزيادة على التكلفة" v={`${totals.markup}%`} />
                </dl>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="font-bold text-zinc-900 mb-1">اللي يظهر في النسخة المطبوعة</h2>
            <p className="text-xs text-zinc-500 mb-3">التكلفة ونسبة الربح لا تظهر أبداً.</p>
            <div className="mb-4">
              <label className={label}>اسم الموقّع (يتطبع كتوقيع بخط اليد)</label>
              <input className={input} value={doc.signerName || ''} onChange={(e) => set('signerName', e.target.value)} placeholder="Ahmed Anwar أو أحمد أنور" />
              {doc.signerName && (
                <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-center" style={{ fontFamily: /[؀-ۿ]/.test(doc.signerName) ? "'Aref Ruqaa', serif" : "'Mrs Saint Delafield', cursive", fontSize: /[؀-ۿ]/.test(doc.signerName) ? 28 : 42, color: '#1d3fa8' }}>
                  {doc.signerName}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {(Object.keys(SHOW_LABELS) as (keyof DocShow)[])
                .filter((k) => isQuote || k !== 'validity')
                .filter((k) => doc.show.totals || !['amountInWords', 'discount', 'vat'].includes(k))
                .map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={doc.show[k]} onChange={(e) => set('show', { ...doc.show, [k]: e.target.checked })} />
                    {SHOW_LABELS[k]}
                  </label>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <dt>{k}</dt>
      <dd dir="ltr" className="font-medium text-zinc-900">{v}</dd>
    </div>
  );
}
