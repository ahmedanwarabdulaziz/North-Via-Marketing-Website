// Files sent in the Anwarz chat (📎 on the PC and phone, or Share → "Ask the chat").
// Images are shown to Claude (scaled down so they stay small); PDFs and text files are read as text.
// Each prepared attachment is kept on his chat message, so follow-ups ("what's the total?",
// "save it to the library") still see it.

export interface ChatAttachment {
  name: string;
  kind: 'image' | 'pdf' | 'text' | 'file';
  mimeType: string;
  /** PDFs and text files: their text (first ~10,000 characters). */
  text?: string;
  /** Images: a JPEG, at most 1,568 px on the longest side, base64. */
  image?: string;
  size: number;
}

export interface RawAttachment {
  name?: unknown;
  mimeType?: unknown;
  data?: unknown; // base64
}

const MAX_FILES = 4;
const MAX_BYTES = 12 * 1024 * 1024;

export async function prepareAttachments(raw: unknown): Promise<ChatAttachment[]> {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachment[] = [];
  let total = 0;
  for (const r of raw.slice(0, MAX_FILES) as RawAttachment[]) {
    if (typeof r?.data !== 'string' || !r.data) continue;
    const bytes = Buffer.from(r.data, 'base64');
    total += bytes.length;
    if (total > MAX_BYTES) throw new Error('The files are too big together (over 12 MB).');
    const name = (typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'file').slice(0, 120);
    const mimeType = typeof r.mimeType === 'string' ? r.mimeType.toLowerCase() : '';
    if (mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name)) {
      const sharp = (await import('sharp')).default;
      const jpeg = await sharp(bytes, { failOn: 'none' }).rotate().resize(1568, 1568, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
      out.push({ name, kind: 'image', mimeType: 'image/jpeg', image: jpeg.toString('base64'), size: bytes.length });
    } else if (mimeType.includes('pdf') || /\.pdf$/i.test(name)) {
      let text = '';
      try {
        const { extractText, getDocumentProxy } = await import('unpdf');
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        text = String((await extractText(pdf, { mergePages: true })).text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      } catch {
        text = '';
      }
      out.push({ name, kind: 'pdf', mimeType: 'application/pdf', text: text.slice(0, 10_000) || '(No text in this PDF: it may be a scanned image.)', size: bytes.length });
    } else if (mimeType.startsWith('text/') || /csv|json|xml/.test(mimeType) || /\.(txt|csv|md|json|xml|html?)$/i.test(name)) {
      out.push({ name, kind: 'text', mimeType: mimeType || 'text/plain', text: bytes.toString('utf8').slice(0, 10_000), size: bytes.length });
    } else {
      out.push({ name, kind: 'file', mimeType: mimeType || 'application/octet-stream', size: bytes.length });
    }
  }
  return out;
}

/** What the AI reads about the files (images are passed separately, as pictures). */
export function attachmentsText(files: ChatAttachment[]) {
  if (!files.length) return '';
  return [
    'ATTACHED FILES (from Ahmed, in this conversation):',
    ...files.map((f) =>
      f.kind === 'image'
        ? `- ${f.name}: a picture (shown to you)`
        : f.kind === 'file'
        ? `- ${f.name}: a ${f.mimeType} file (it can't be read here; only its name)`
        : `- ${f.name} (${f.kind.toUpperCase()}):\n"""\n${f.text}\n"""`
    ),
  ].join('\n');
}
