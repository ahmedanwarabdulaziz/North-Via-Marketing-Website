'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Save } from 'lucide-react';
import { CompanyStamp } from '@/components/admin/CompanyStamp';
import type { CompanyProfile } from '@/lib/sales-docs-shared';

const input = 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const label = 'block text-xs font-semibold text-zinc-500 mb-1';

export function CompanyForm({ initial }: { initial: CompanyProfile }) {
  const [c, setC] = useState<CompanyProfile>(initial);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => setC((p) => ({ ...p, [key]: value }));

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/quotes/company', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر الحفظ');
      setMsg('تم الحفظ');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  }

  const text = (key: keyof CompanyProfile, title: string, ltr = false) => (
    <div>
      <label className={label}>{title}</label>
      <input className={input} dir={ltr ? 'ltr' : undefined} value={String(c[key] ?? '')} onChange={(e) => set(key, e.target.value as never)} />
    </div>
  );

  return (
    <div dir="rtl" className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/quotes" className="text-zinc-500 hover:text-zinc-900" aria-label="رجوع"><ArrowRight className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold text-zinc-900">بيانات الشركة والختم</h1>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> حفظ
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-bold mb-4">الشركة</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('nameAr', 'اسم الشركة بالعربي')}
            {text('nameEn', 'اسم الشركة بالإنجليزي', true)}
            {text('taglineAr', 'سطر تعريفي تحت الاسم')}
            {text('address', 'العنوان')}
            {text('phone', 'التليفون', true)}
            {text('email', 'الإيميل', true)}
            {text('website', 'الموقع', true)}
            {text('commercialRegister', 'رقم السجل التجاري', true)}
            {text('taxCard', 'رقم البطاقة الضريبية', true)}
            {text('signerTitle', 'صفة الموقّع (مثال: المدير العام)')}
            {text('signerName', 'اسم الموقّع')}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="font-bold mb-4">الختم</h2>
          <p className="text-xs text-zinc-500 mb-4">الختم هو لوجو سند الثابت بس، وحواليه رقم السجل التجاري والبطاقة الضريبية (من الخانات اللي فوق). اسم الشركة ممكن تغيّره في أي وقت من «الشركة».</p>
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-4 content-start">
              <div>
                <label className={label}>لون حبر الختم</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={c.stampColor} onChange={(e) => set('stampColor', e.target.value)} className="h-10 w-14 rounded border border-zinc-300" />
                  <span className="text-xs text-zinc-500" dir="ltr">{c.stampColor}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center rounded-xl bg-zinc-50 p-6">
              <CompanyStamp commercialRegister={c.commercialRegister} taxCard={c.taxCard} color={c.stampColor} size={170} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="font-bold">القيم الافتراضية للمستندات الجديدة</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>مدة سريان العرض (أيام)</label>
              <input className={input} type="number" min={0} value={c.defaultValidDays} onChange={(e) => set('defaultValidDays', Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className={label}>ضريبة القيمة المضافة %</label>
              <input className={input} type="number" min={0} value={c.defaultVatPercent} onChange={(e) => set('defaultVatPercent', Number(e.target.value) || 0)} />
            </div>
            {text('defaultCurrency', 'العملة')}
          </div>
          <div>
            <label className={label}>الشروط الافتراضية (كل سطر شرط، وبتظهر كسجلات في كل مستند جديد)</label>
            <textarea className={input} rows={4} value={c.defaultTerms} onChange={(e) => set('defaultTerms', e.target.value)} />
          </div>
          <div>
            <label className={label}>بيانات الدفع (حساب بنكي / إنستاباي… كل سطر لوحده)</label>
            <textarea className={input} rows={3} value={c.paymentInfo} onChange={(e) => set('paymentInfo', e.target.value)} />
          </div>
        </section>
      </div>
    </div>
  );
}
