import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { clearSharedPayloads, useIncomingShare } from 'expo-sharing';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Note, Tile } from '@/components/sheet';
import { Card, Empty, Input, Loading, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { setPendingChat, tooBig, type ChatFile } from '@/lib/attachments';
import { radius, space, usePalette } from '@/lib/theme';
import type { AddTaskResult, LibraryItem } from '@/lib/types';

/**
 * Opens when something is shared to Anwarz from another app: screenshots or photos, a link, or text.
 * 📚 Save to Library (the AI reads and files it, like the Telegram bot), ✅ Make it a task, or
 * 💬 Ask the chat about it (pictures and PDFs go with the next chat message).
 */
export default function ShareReceived() {
  const p = usePalette();
  const { resolvedSharedPayloads, isResolving, error } = useIncomingShare();
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState<'library' | 'task' | 'chat' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const images = resolvedSharedPayloads.filter((s) => s.contentType === 'image' && s.contentUri);
  // PDFs (and other files) only go to the chat, which reads them.
  const docs = resolvedSharedPayloads.filter((s) => s.contentType === 'file' && s.contentUri);
  const texts = resolvedSharedPayloads
    .filter((s) => s.contentType !== 'image' && s.contentType !== 'file')
    .map((s) => (s.contentType === 'website' ? s.contentUri || s.value : s.value) || '')
    .filter(Boolean);
  const text = [...new Set(texts)].join('\n').trim();

  const finish = (message: string, go: '/library' | '/tasks') => {
    clearSharedPayloads();
    Alert.alert('Done', message);
    router.replace(go);
  };

  // 💬 Ask the chat: the pictures go with the next chat message; text and links go in its box.
  const askChat = async () => {
    setBusy('chat');
    setNote(null);
    try {
      const files: ChatFile[] = [];
      for (const [i, img] of images.slice(0, 4).entries()) {
        const data = await new File(img.contentUri!).base64();
        const file = { name: `shared-${i + 1}.jpg`, mimeType: img.contentMimeType || img.mimeType || 'image/jpeg', data, size: Math.round((data.length * 3) / 4) };
        if (tooBig(files, file)) {
          setNote(`Picture ${i + 1} is too big for the chat (over 3 MB). Send a screenshot instead, or save it to the library.`);
          continue;
        }
        files.push(file);
      }
      for (const [i, doc] of docs.slice(0, 4 - files.length).entries()) {
        const data = await new File(doc.contentUri!).base64();
        const mimeType = doc.contentMimeType || doc.mimeType || 'application/pdf';
        const file = { name: /pdf/i.test(mimeType) ? `shared-${i + 1}.pdf` : `shared-file-${i + 1}`, mimeType, data, size: Math.round((data.length * 3) / 4) };
        if (tooBig(files, file)) {
          setNote(`File ${i + 1} is too big for the chat (over 3 MB).`);
          continue;
        }
        files.push(file);
      }
      setPendingChat(files, [caption, text].filter(Boolean).join('\n'));
      clearSharedPayloads();
      router.replace('/chat');
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const saveToLibrary = async () => {
    setBusy('library');
    setNote(null);
    try {
      const saved: string[] = [];
      for (const img of images) {
        const data = await new File(img.contentUri!).base64();
        const r = await api<{ item: LibraryItem }>('/library', {
          body: { image: { data, mimeType: img.contentMimeType || img.mimeType || 'image/jpeg' }, caption: [caption, text].filter(Boolean).join('\n') },
          timeoutMs: 90_000,
        });
        saved.push(r.item.title);
      }
      if (!images.length && (text || caption)) {
        const r = await api<{ item: LibraryItem }>('/library', { body: { text: [caption, text].filter(Boolean).join('\n') }, timeoutMs: 60_000 });
        saved.push(r.item.title);
      }
      finish(`📚 Saved to your library:\n${saved.join('\n')}`, '/library');
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const makeTask = async () => {
    const what = [caption, text].filter(Boolean).join('\n').trim();
    if (!what) {
      setNote('Write what the task is first (e.g. “call them about this tomorrow at 3”).');
      return;
    }
    setBusy('task');
    setNote(null);
    try {
      const r = await api<AddTaskResult>('/tasks', { body: { text: what }, timeoutMs: 60_000 });
      if (r.saved && r.task) finish(`✅ Task saved:\n${r.task.title}${r.task.when ? `\n${r.task.when}` : ''}`, '/tasks');
      else {
        // Missing details (work or personal, day, time…): finish it on the new-task screen.
        clearSharedPayloads();
        router.replace('/task/new');
        Alert.alert('Almost there', `Open ＋ Task and say: ${what.slice(0, 200)}`);
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (isResolving) return <Loading />;
  const nothing = !images.length && !text && !docs.length;
  const onlyDocs = docs.length > 0 && !images.length && !text;

  return (
    <Screen padTop={false}>
      {error ? <Note text={`Couldn’t read what was shared: ${error.message}`} tone="danger" /> : null}
      {nothing ? (
        <Empty text="Nothing was shared. Use the Share button in another app and pick Anwarz." />
      ) : (
        <>
          {images.length ? (
            <Row wrap style={{ gap: space.sm }}>
              {images.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: img.contentUri! }}
                  style={{ width: images.length === 1 ? '100%' : 150, height: images.length === 1 ? 280 : 150, borderRadius: radius.md, backgroundColor: p.border }}
                  contentFit={images.length === 1 ? 'contain' : 'cover'}
                />
              ))}
            </Row>
          ) : null}
          {docs.length ? (
            <Card>
              <T variant="label">Shared</T>
              <T>{docs.map((d, i) => `📄 ${d.originalName || `file ${i + 1}`}`).join('\n')}</T>
            </Card>
          ) : null}
          {text ? (
            <Card>
              <T variant="label">Shared</T>
              <T selectable numberOfLines={8}>
                {text}
              </T>
            </Card>
          ) : null}
          <View style={{ gap: space.sm }}>
            <T variant="small">Add a note (optional), e.g. which client it’s for or what to do with it:</T>
            <Input value={caption} onChangeText={setCaption} placeholder="e.g. for Pacific, idea for next month’s posts" multiline />
          </View>
          {note ? <Note text={note} tone="danger" /> : null}
          {onlyDocs ? null : (
            <>
              <Tile icon="📚" label={images.length > 1 ? `Save ${images.length} to Library` : 'Save to Library'} tone="brand" wide busy={busy === 'library'} disabled={busy !== null} onPress={saveToLibrary} />
              <Tile icon="✅" label="Make it a task" wide busy={busy === 'task'} disabled={busy !== null} onPress={makeTask} />
            </>
          )}
          <Tile icon="💬" label="Ask the chat about it" tone={onlyDocs ? 'brand' : undefined} wide busy={busy === 'chat'} disabled={busy !== null} onPress={() => void askChat()} />
          {busy ? <T variant="small" style={{ textAlign: 'center' }}>The AI is reading it…</T> : null}
        </>
      )}
    </Screen>
  );
}
