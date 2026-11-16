import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { finishProcessText } from '../../modules/anwarz-text';
import { api, ensureSession } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';

// "Improve with Anwarz": the panel that opens over any app when text is selected and
// "Anwarz ✓ Correct" or "Anwarz ✨ Rephrase" is picked in the selection menu.
//   ✓ Correct   fixes grammar, spelling and punctuation at once.
//   ✨ Rephrase  shows every mode from More → Writing modes; pick one.
// Replace puts the result in place of the selected text; Copy is for read-only text.

interface Props {
  text?: string;
  readonly?: boolean;
  action?: 'correct' | 'rephrase';
}

interface Mode {
  id: string;
  name: string;
  emoji: string;
}

const isArabic = (t: string) => /[؀-ۿ]/.test(t.slice(0, 60));

function Panel({ text = '', readonly = false, action = 'rephrase' }: Props) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [modes, setModes] = useState<Mode[] | null>(null);
  const [picked, setPicked] = useState<string | null>(action === 'correct' ? 'correct' : null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = useCallback(
    async (mode: string) => {
      setPicked(mode);
      setResult(null);
      setError(null);
      setBusy(true);
      try {
        if (!(await ensureSession())) throw new Error('Open Anwarz and sign in first.');
        const r = await api<{ text: string }>('/writing', { body: { text, mode }, timeoutMs: 45_000 });
        setResult(r.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [text]
  );

  useEffect(() => {
    let live = true;
    if (action === 'correct') {
      void Promise.resolve().then(() => {
        if (live) void run('correct'); // starts right after the panel shows
      });
    } else {
      void ensureSession().then((ok) => {
        if (!ok) {
          if (live) setError('Open Anwarz and sign in first.');
          return;
        }
        api<{ modes: Mode[] }>('/writing')
          .then((r) => live && setModes(r.modes))
          .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
      });
    }
    return () => {
      live = false;
    };
  }, [action, run]);

  const close = () => finishProcessText(null);
  const replace = () => result && finishProcessText(result);
  const copy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    setCopied(true);
    setTimeout(() => finishProcessText(null), 600);
  };

  const rtl = (t: string) => (isArabic(t) ? 'rtl' : 'ltr');
  const chip = (id: string, label: string) => (
    <Pressable
      key={id}
      disabled={busy}
      onPress={() => void run(id)}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: picked === id ? p.brand : p.brandSoft,
        opacity: pressed || (busy && picked !== id) ? 0.6 : 1,
      })}>
      <Text style={{ color: picked === id ? p.onBrand : p.brand, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable onPress={close} style={{ ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backgroundColor: 'rgba(8,12,24,0.45)' }} />
      <View
        style={{
          backgroundColor: p.card,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: space.lg,
          paddingBottom: insets.bottom + space.lg,
          gap: space.md,
          maxHeight: '85%',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: p.text }}>{action === 'correct' ? '✓ Correct with Anwarz' : '✨ Rephrase with Anwarz'}</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={{ fontSize: 18, color: p.muted }}>✕</Text>
          </Pressable>
        </View>

        <Text numberOfLines={3} style={{ color: p.muted, fontSize: 13, writingDirection: rtl(text) }}>{text}</Text>

        {action === 'rephrase' ? (
          modes ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
              {chip('correct', '✓ Correct only')}
              {modes.map((m) => chip(m.id, `${m.emoji} ${m.name}`))}
            </ScrollView>
          ) : !error ? (
            <ActivityIndicator color={p.brand} />
          ) : null
        ) : null}

        {busy ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <ActivityIndicator color={p.brand} />
            <Text style={{ color: p.muted }}>{action === 'correct' ? 'Correcting…' : 'Writing…'}</Text>
          </View>
        ) : null}

        {error ? <Text style={{ color: p.danger }}>{error}</Text> : null}

        {result !== null ? (
          <ScrollView style={{ flexGrow: 0, maxHeight: 280, backgroundColor: p.bg, borderRadius: radius.md }} contentContainerStyle={{ padding: space.md }}>
            <Text selectable style={{ color: p.text, fontSize: 16, lineHeight: 24, writingDirection: rtl(result) }}>
              {result}
            </Text>
          </ScrollView>
        ) : null}
        {result !== null && result.trim() === text.trim() ? <Text style={{ color: p.ok }}>✓ No mistakes found.</Text> : null}

        {result !== null ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {!readonly ? (
              <Pressable onPress={replace} style={({ pressed }) => ({ flex: 1, backgroundColor: p.brand, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: p.onBrand, fontWeight: '800', fontSize: 16 }}>Replace</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => void copy()} style={({ pressed }) => ({ flex: 1, borderWidth: 1.5, borderColor: p.brand, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ color: p.brand, fontWeight: '800', fontSize: 16 }}>{copied ? 'Copied ✓' : 'Copy'}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Registered as the "ProcessText" component (index.js), shown by ProcessTextActivity. */
export default function ProcessTextRoot(props: Props) {
  return (
    <SafeAreaProvider>
      <Panel {...props} />
    </SafeAreaProvider>
  );
}
