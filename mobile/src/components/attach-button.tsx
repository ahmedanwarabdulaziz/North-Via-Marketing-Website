import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

import { MAX_TOTAL_BASE64, type ChatFile } from '@/lib/attachments';

import { Button } from './ui';

// 📎 in the Chat tab (phone): a photo or screenshot, the camera, or a file (PDF…). Pictures are
// compressed by the picker so they fit in one request. The PC version uses attach-button.web.tsx.

const pictureOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.5, exif: false };

export function AttachButton({ onPick, disabled }: { onPick: (files: ChatFile[]) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);

  const fromPictures = (camera: boolean) => async () => {
    setBusy(true);
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Camera', 'Allow the camera for Anwarz in the phone settings.');
      }
      const r = camera ? await ImagePicker.launchCameraAsync(pictureOptions) : await ImagePicker.launchImageLibraryAsync({ ...pictureOptions, allowsMultipleSelection: true, selectionLimit: 4 });
      if (r.canceled) return;
      onPick(
        r.assets
          .filter((a) => a.base64)
          .map((a, i) => ({ name: a.fileName || `photo-${i + 1}.jpg`, mimeType: a.mimeType || 'image/jpeg', data: a.base64!, size: a.fileSize || Math.round((a.base64!.length * 3) / 4) }))
      );
    } catch (e) {
      Alert.alert('Not attached', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const fromFiles = async () => {
    setBusy(true);
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*', 'text/*'], multiple: true, copyToCacheDirectory: true });
      if (r.canceled) return;
      const files: ChatFile[] = [];
      for (const a of r.assets.slice(0, 4)) {
        if ((a.size || 0) * 1.37 > MAX_TOTAL_BASE64) {
          Alert.alert('Too big', `${a.name} is over 3 MB. Share a smaller file, or a screenshot of the page you need.`);
          continue;
        }
        files.push({ name: a.name, mimeType: a.mimeType || 'application/octet-stream', data: await new File(a.uri).base64(), size: a.size || 0 });
      }
      onPick(files);
    } catch (e) {
      Alert.alert('Not attached', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const choose = () =>
    Alert.alert('Attach', 'What do you want to send to the chat?', [
      { text: '🖼 Photo or screenshot', onPress: () => void fromPictures(false)() },
      { text: '📸 Camera', onPress: () => void fromPictures(true)() },
      { text: '📄 File (PDF…)', onPress: () => void fromFiles() },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return <Button title="📎" kind="soft" busy={busy} disabled={disabled} onPress={choose} />;
}
