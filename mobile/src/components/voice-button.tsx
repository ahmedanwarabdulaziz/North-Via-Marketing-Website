import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { Audio } from '@/lib/types';

import { Button } from './ui';

/**
 * Tap to record, tap again to stop: hands the voice note (base64 m4a) to onDone.
 * The website's AI (Groq Whisper / Gemini) turns it into text.
 */
export function VoiceButton({ onDone, disabled, label = '🎙 Voice note' }: { onDone: (audio: Audio) => void; disabled?: boolean; label?: string }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [busy, setBusy] = useState(false);

  if (Platform.OS === 'web') return null;

  const start = async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone', 'Allow the microphone in the phone settings to record voice notes.');
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 180 });
  };

  const stop = async () => {
    setBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (!recorder.uri) throw new Error('Nothing was recorded.');
      const data = await new File(recorder.uri).base64();
      onDone({ data, mimeType: 'audio/m4a' });
    } catch (error) {
      Alert.alert('Voice note', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const seconds = Math.floor((state.durationMillis || 0) / 1000);
  return (
    <Button
      title={state.isRecording ? `⏹ Stop (${seconds}s)` : label}
      tone={state.isRecording ? 'danger' : 'brand'}
      kind={state.isRecording ? 'primary' : 'soft'}
      busy={busy}
      disabled={disabled}
      onPress={state.isRecording ? stop : start}
    />
  );
}
