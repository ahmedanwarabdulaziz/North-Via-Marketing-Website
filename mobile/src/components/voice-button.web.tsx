import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Audio } from '@/lib/types';

import { Button } from './ui';

// The PC version's voice button (the phone uses voice-button.tsx with expo-audio): records from the
// PC microphone with the browser's MediaRecorder and hands the note (base64) to onDone, same as the phone.

function toBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function VoiceButton({ onDone, disabled, label = '🎙 Voice note', compact }: { onDone: (audio: Audio) => void; disabled?: boolean; label?: string; compact?: boolean }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) return null;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
          if (!blob.size) throw new Error('Nothing was recorded.');
          onDone({ data: await toBase64(blob), mimeType: (rec.mimeType || 'audio/webm').split(';')[0] });
        } catch (error) {
          Alert.alert('Voice note', error instanceof Error ? error.message : String(error));
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setTimeout(() => recorder.current === rec && stop(), 180_000); // 3 minutes at most
    } catch {
      Alert.alert('Microphone', 'Allow the microphone for Anwarz in the browser (the lock icon next to the address).');
    }
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    recorder.current?.stop();
    recorder.current = null;
  };

  return (
    <Button
      title={recording ? (compact ? `⏹ ${seconds}s` : `⏹ Stop (${seconds}s)`) : label}
      tone={recording ? 'danger' : 'brand'}
      kind={recording ? 'primary' : 'soft'}
      busy={busy}
      disabled={disabled}
      onPress={recording ? stop : () => void start()}
    />
  );
}
