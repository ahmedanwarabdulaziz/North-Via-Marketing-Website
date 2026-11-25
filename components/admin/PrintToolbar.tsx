'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Mail, MessageCircle, Printer, X } from 'lucide-react';

interface Props {
  docId: string;
  editHref?: string;
  emailEndpoint: string;
  fileName: string;
  kindLabel: string;
  number: string;
  companyName: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  totalText?: string;
  validUntil?: string;
}

/** Egyptian 01XXXXXXXXX → 20…, "+" and "00" numbers as given. */
function whatsappDigits(phone?: string) {
  if (!phone) return '';
  const raw = phone.trim();
  let d = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return d;
  if (d.startsWith('00')) return d.slice(2);
  if (/^01\d{9}$/.test(d)) return `2${d}`;
  return d;
}

async function toDataUrl(src: string) {
  const blob = await (await fetch(src)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('تعذر تحميل اللوجو'));
    reader.readAsDataURL(blob);
  });
}

async function makePdf(): Promise<Blob> {
  const el = document.querySelector<HTMLElement>('.sales-sheet');
  if (!el) throw new Error('الصفحة غير جاهزة');
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts?.ready;

  // Images inside an SVG are lost when the page is turned into a picture, so embed them as data.
  const embedded = new Map<string, string>();
  for (const img of Array.from(el.querySelectorAll('image, img'))) {
    const src = img.getAttribute('href') || img.getAttribute('src') || '';
    if (src && !src.startsWith('data:') && !embedded.has(src)) embedded.set(src, await toDataUrl(src));
  }

  // Where a page may end: the top of any table row or block, so nothing is cut through the middle.
  const sheetTop = el.getBoundingClientRect().top;
  const breakPoints = [
    ...Array.from(el.children).filter((c) => (c as HTMLElement).style.flex !== '1 1 0%' && (c as HTMLElement).offsetHeight > 0),
    ...Array.from(el.querySelectorAll('tbody tr')),
  ]
    .map((n) => n.getBoundingClientRect().top - sheetTop)
    .filter((y) => y > 1)
    .sort((x, y) => x - y);

  const thead = el.querySelector('thead');
  const tbody = el.querySelector('tbody');
  const headTop = thead ? thead.getBoundingClientRect().top - sheetTop : 0;
  const headH = thead ? thead.getBoundingClientRect().height : 0;
  const tableEnd = tbody ? tbody.getBoundingClientRect().bottom - sheetTop : 0;

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (doc) => {
      // html2canvas draws table text a few pixels low; move it up inside each cell (same cell height).
      doc.querySelectorAll<HTMLElement>('.sales-sheet th, .sales-sheet tbody td').forEach((cell) => {
        const cs = doc.defaultView?.getComputedStyle(cell);
        const top = parseFloat(cs?.paddingTop || '0');
        const bottom = parseFloat(cs?.paddingBottom || '0');
        const shift = Math.min(top - 1, 6);
        cell.style.paddingTop = `${top - shift}px`;
        cell.style.paddingBottom = `${bottom + shift}px`;
      });
      doc.querySelectorAll('.sales-sheet image').forEach((node) => {
        const src = node.getAttribute('href') || '';
        if (embedded.has(src)) node.setAttribute('href', embedded.get(src) as string);
      });
      doc.querySelectorAll<HTMLImageElement>('.sales-sheet img').forEach((node) => {
        const src = node.getAttribute('src') || '';
        if (embedded.has(src)) node.src = embedded.get(src) as string;
      });
    },
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 12; // mm kept free at the top and bottom of the pages after the first
  const pxPerMm = el.offsetWidth / pageW; // CSS px per mm
  const ratio = canvas.width / el.offsetWidth; // canvas px per CSS px
  const totalPx = el.offsetHeight;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const slicePx = (fromPx: number, toPx: number) => {
    const sy = Math.round(fromPx * ratio);
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.round((toPx - fromPx) * ratio)));
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sh;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('تعذر إنشاء الملف');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    return slice;
  };
  const place = (slice: HTMLCanvasElement, yMm: number) =>
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, yMm, pageW, (slice.height * pageW) / slice.width);

  let start = 0;
  for (let page = 0; start < totalPx - 1; page++) {
    const topOffset = page === 0 ? 0 : margin;
    // Pages after the first repeat the table's header row while rows of the table continue.
    const repeatHeader = page > 0 && headH > 0 && start < tableEnd - 1;
    const headMm = repeatHeader ? headH / pxPerMm : 0;
    const bodyTopMm = topOffset + headMm;
    const capacityPx = (pageH - bodyTopMm - margin) * pxPerMm;
    const remaining = totalPx - start;
    let end: number;
    if (remaining <= (pageH - bodyTopMm) * pxPerMm) {
      end = totalPx;
    } else {
      const limit = start + capacityPx;
      const fit = breakPoints.filter((y) => y > start + 20 * pxPerMm && y <= limit);
      end = fit.length ? fit[fit.length - 1] : limit;
    }
    if (page) pdf.addPage();
    if (repeatHeader) place(slicePx(headTop, headTop + headH), topOffset);
    const body = slicePx(start, end);
    place(body, bodyTopMm);
    start = end;
  }
  return pdf.output('blob');
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(blob);
  });

export function PrintToolbar(p: Props) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [mailOpen, setMailOpen] = useState(false);
  const [to, setTo] = useState(p.clientEmail || '');
  const defaultMessage = `السادة / ${p.clientName}\nتحية طيبة وبعد،\n\nمرفق ${p.kindLabel} رقم ${p.number}${p.totalText ? ` بإجمالي ${p.totalText}` : ''}.${p.validUntil ? `\nالعرض ساري حتى ${p.validUntil}.` : ''}\n\nيسعدنا خدمتكم دائماً.\n${p.companyName}`;
  const [subject, setSubject] = useState(`${p.kindLabel} ${p.number} - ${p.companyName}`);
  const [message, setMessage] = useState(defaultMessage);
  const pdfName = `${p.fileName}.pdf`;

  const print = () => {
    const previous = document.title;
    document.title = p.fileName;
    window.print();
    setTimeout(() => { document.title = previous; }, 1000);
  };

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setNote('');
    try {
      await fn();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'حصلت مشكلة');
    } finally {
      setBusy('');
    }
  }

  const downloadPdf = () => run('pdf', async () => { download(await makePdf(), pdfName); });

  const whatsapp = () =>
    run('wa', async () => {
      const blob = await makePdf();
      const file = new File([blob], pdfName, { type: 'application/pdf' });
      const text = `${p.kindLabel} رقم ${p.number} من ${p.companyName}${p.totalText ? `\nالإجمالي: ${p.totalText}` : ''}${p.validUntil ? `\nساري حتى ${p.validUntil}` : ''}`;
      // Phones and tablets: the share sheet takes the file straight to WhatsApp.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }
      // Computers: WhatsApp can't take a file from a link, so save it and open the chat with the text ready.
      download(blob, pdfName);
      window.open(`https://wa.me/${whatsappDigits(p.clientPhone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      setNote('اتحفظ ملف الـ PDF على جهازك. اسحبه أو أرفقه في محادثة الواتساب اللي اتفتحت.');
    });

  const sendMail = () =>
    run('mail', async () => {
      if (!to.trim()) throw new Error('اكتب الإيميل');
      const pdfBase64 = await blobToBase64(await makePdf());
      const res = await fetch(p.emailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, message, pdfBase64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذر الإرسال');
      setMailOpen(false);
      setNote(`تم إرسال الإيميل إلى ${to}`);
    });

  const btn = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50';

  return (
    <div dir="rtl" className="print:hidden mx-auto mb-4 max-w-[210mm] px-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {p.editHref ? (
          <Link href={p.editHref} className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50">
            <ArrowRight className="w-4 h-4" /> رجوع للتعديل
          </Link>
        ) : <span />}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadPdf} disabled={!!busy} className={`${btn} border border-zinc-300 bg-white hover:bg-zinc-50`}>
            <Download className="w-4 h-4" /> {busy === 'pdf' ? 'جاري التجهيز…' : 'تنزيل PDF'}
          </button>
          <button onClick={whatsapp} disabled={!!busy} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
            <MessageCircle className="w-4 h-4" /> {busy === 'wa' ? 'جاري التجهيز…' : 'واتساب'}
          </button>
          <button onClick={() => setMailOpen(true)} disabled={!!busy} className={`${btn} bg-zinc-800 text-white hover:bg-zinc-900`}>
            <Mail className="w-4 h-4" /> إيميل
          </button>
          <button onClick={print} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
            <Printer className="w-4 h-4" /> طباعة
          </button>
        </div>
      </div>
      {note && <div className="mt-3 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700">{note}</div>}

      {mailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-zinc-900">إرسال {p.kindLabel} بالإيميل</h2>
              <button onClick={() => setMailOpen(false)} aria-label="إغلاق" className="text-zinc-400 hover:text-zinc-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500">إلى</label>
                <input dir="ltr" type="email" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="client@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500">العنوان</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500">الرسالة (الـ PDF هيتبعت مرفق)</label>
                <textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setMailOpen(false)} className={`${btn} border border-zinc-300 bg-white`}>إلغاء</button>
              <button onClick={sendMail} disabled={!!busy} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
                <Mail className="w-4 h-4" /> {busy === 'mail' ? 'جاري الإرسال…' : 'إرسال الآن'}
              </button>
            </div>
            {note && busy === '' && !note.startsWith('تم') && <p className="mt-3 text-sm text-red-600">{note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
