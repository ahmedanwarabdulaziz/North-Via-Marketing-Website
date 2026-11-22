import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { MAX_TOTAL_BASE64, type ChatFile } from '@/lib/attachments';

import { Button } from './ui';

// 📎 in the Chat tab on the PC: the browser's own file picker (pictures, PDFs, text files).
// Pictures are scaled down to 1600 px (JPEG) here so several fit in one request.

const readBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function shrinkPicture(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8));
  } catch {
    return file; // not a picture the browser can draw (e.g. HEIC): send as it is
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AttachButton({ onPick, disabled }: { onPick: (files: ChatFile[]) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const picked = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const files: ChatFile[] = [];
      for (const f of Array.from(list).slice(0, 4)) {
        const isPicture = f.type.startsWith('image/');
        const blob = isPicture ? await shrinkPicture(f) : f;
        if (blob.size * 1.37 > MAX_TOTAL_BASE64) {
          Alert.alert('Too big', `${f.name} is over 3 MB. Send a smaller file, or a screenshot of the page you need.`);
          continue;
        }
        files.push({ name: isPicture ? f.name.replace(/\.\w+$/, '.jpg') : f.name, mimeType: isPicture ? 'image/jpeg' : f.type || 'application/octet-stream', data: await readBase64(blob), size: blob.size });
      }
      onPick(files);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  if (typeof document === 'undefined') return null;
  return (
    <>
      <input ref={input} type="file" multiple accept="image/*,application/pdf,text/*,.csv,.txt,.md" style={{ display: 'none' }} onChange={(e) => void picked(e.target.files)} />
      <Button title="📎" kind="soft" busy={busy} disabled={disabled} onPress={() => input.current?.click()} />
    </>
  );
}
