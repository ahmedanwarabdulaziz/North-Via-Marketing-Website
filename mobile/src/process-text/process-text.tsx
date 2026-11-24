import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { finishProcessText } from '../../modules/anwarz-text';
import { RichText } from '@/components/rich-text';
import { VoiceButton } from '@/components/voice-button';
import { api, apiStream, ensureSession } from '@/lib/api';
import { radius, space, usePalette, type Palette } from '@/lib/theme';
import type { Audio } from '@/lib/types';
import { loadWriter, rememberCopy, rememberMode, type Recent } from './writer-store';

// "Improve with Anwarz": the panel Android opens over any app.
//   ✓ Correct   (text selected → "Anwarz ✓ Correct") fixes grammar, spelling and punctuation at once.
//   ✨ Rephrase  (text selected → "Anwarz ✨ Rephrase") shows every mode from More → Writing modes.
//                Replace puts the result in place of the selected text; Copy is for read-only text.
//   ✍️ Write     (the floating bubble, the quick-settings tile, More → Write a reply) an empty box: type,
//                paste or 🎙 speak what to say, pick a mode, then 📋 Copy & close and paste it anywhere.
//                A message he just copied from someone becomes "Replying to", so the result is a reply.
//   🎙 Speak     the same, recording straight away (bubble → long press → Speak).
//   📌 Task / 💬 Ask   a quick task or question for the Anwarz chat (bubble → long press).

type Action = 'correct' | 'rephrase' | 'compose' | 'speak' | 'task' | 'ask';

interface Props {
  text?: string;
  readonly?: boolean;
  action?: Action;
}

interface Mode {
  id: string;
  name: string;
  emoji?: string;
}

interface Choices {
  modes: Mode[];
  adjustments?: Mode[];
  clients?: { id: string; name: string }[];
}

const isArabic = (t: string) => /[؀-ۿ]/.test(t.slice(0, 60));
const dir = (t: string) => (isArabic(t) ? 'rtl' : 'ltr');
const close = () => finishProcessText(null);

function Chip({ label, on, onPress, disabled, p }: { label: string; on?: boolean; onPress: () => void; disabled?: boolean; p: Palette }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? p.brand : p.brandSoft, opacity: pressed || disabled ? 0.6 : 1 })}>
      <Text style={{ color: on ? p.onBrand : p.brand, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function BigButton({ title, onPress, outline, p }: { title: string; onPress: () => void; outline?: boolean; p: Palette }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: outline ? 'transparent' : p.brand,
        borderWidth: outline ? 1.5 : 0,
        borderColor: p.brand,
        borderRadius: radius.md,
        paddingVertical: 13,
        alignItems: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ color: outline ? p.brand : p.onBrand, fontWeight: '800', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

/** The sheet at the bottom of the screen, over the other app. */
function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,12,24,0.45)' }} />
      <View style={{ backgroundColor: p.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: space.lg, paddingBottom: insets.bottom + space.lg, gap: space.md, maxHeight: '90%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: p.text }}>{title}</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Text style={{ fontSize: 18, color: p.muted }}>✕</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}

// ---------- Correct / Rephrase / Write / Speak ----------

function Writer({ text = '', readonly = false, action = 'rephrase' }: Props) {
  const p = usePalette();
  const compose = action === 'compose' || action === 'speak';
  const [choices, setChoices] = useState<Choices | null>(null);
  const [uses, setUses] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<Recent[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [draft, setDraft] = useState(text);
  const [replyTo, setReplyTo] = useState('');
  const [client, setClient] = useState<string>('auto'); // 'auto' | 'none' | client id
  const [foundClient, setFoundClient] = useState<{ id: string; name: string } | null>(null);
  const [picked, setPicked] = useState<string | null>(action === 'correct' ? 'correct' : null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const source = compose ? draft : text;

  const run = useCallback(
    async (mode: string, adjusting?: string) => {
      if (!adjusting && !source.trim() && !replyTo.trim()) {
        setError('Type, paste or speak what you want to say first.');
        return;
      }
      if (!adjusting) setPicked(mode);
      setError(null);
      setBusy(mode);
      try {
        if (!(await ensureSession())) throw new Error('Open Anwarz and sign in first.');
        const clientId = client === 'auto' ? (adjusting ? foundClient?.id : undefined) : client;
        const r = await api<{ text: string; client?: { id: string; name: string } | null }>('/writing', {
          body: adjusting ? { text: adjusting, mode, clientId } : { text: source, mode, ...(replyTo.trim() ? { replyTo } : {}), ...(clientId ? { clientId } : {}) },
          timeoutMs: 45_000,
        });
        setResult(r.text);
        setCopied(false);
        if (!adjusting) setFoundClient(r.client ?? null);
        void rememberMode(mode);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [source, replyTo, client, foundClient]
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      const store = await loadWriter();
      if (!live) return;
      setUses(store.uses);
      setRecent(store.recent);
      // A message he just copied from someone (not his own last result) is what he's replying to.
      if (compose) {
        const copiedNow = (await Clipboard.getStringAsync().catch(() => '')).trim();
        if (live && copiedNow.length > 1 && copiedNow !== (store.lastCopied || '').trim()) setReplyTo(copiedNow.slice(0, 4000));
      }
      if (!(await ensureSession())) {
        if (live) setError('Open Anwarz and sign in first.');
        return;
      }
      if (action === 'correct') {
        if (live) void run('correct');
        return;
      }
      api<Choices>('/writing')
        .then((r) => live && setChoices(r))
        .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the panel opens
  }, []);

  // Most used modes first.
  const modes = useMemo(() => [...(choices?.modes ?? [])].sort((a, b) => (uses[b.id] || 0) - (uses[a.id] || 0)), [choices, uses]);

  const copy = async (value = result) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    await rememberCopy(value, picked || 'copy');
    setCopied(true);
    setTimeout(close, 500);
  };

  const heard = async (audio: Audio) => {
    setBusy('voice');
    setError(null);
    try {
      const r = await api<{ heard: string }>('/writing', { body: { audio }, timeoutMs: 60_000 });
      setDraft((now) => (now.trim() ? `${now} ${r.heard}` : r.heard));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const title = compose ? (replyTo ? '↩️ Reply with Anwarz' : '✍️ Write with Anwarz') : action === 'correct' ? '✓ Correct with Anwarz' : '✨ Rephrase with Anwarz';

  return (
    <Sheet title={title}>
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
        {replyTo ? (
          <View style={{ backgroundColor: p.bg, borderRadius: radius.md, padding: space.md, gap: 4, borderLeftWidth: 3, borderLeftColor: p.accent }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: p.muted, fontSize: 12, fontWeight: '700' }}>REPLYING TO (the message you copied)</Text>
              <Pressable hitSlop={10} onPress={() => setReplyTo('')}>
                <Text style={{ color: p.muted, fontWeight: '700' }}>✕</Text>
              </Pressable>
            </View>
            <Text numberOfLines={4} style={{ color: p.text, fontSize: 14, writingDirection: dir(replyTo) }}>
              {replyTo}
            </Text>
          </View>
        ) : null}

        {compose ? (
          <View style={{ gap: space.xs }}>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                setError(null);
              }}
              autoFocus={action === 'compose'}
              multiline
              placeholder={replyTo ? 'What should your reply say? (or leave empty for a short reply)' : 'What do you want to say? Type, paste or speak, any language…'}
              placeholderTextColor={p.muted}
              style={{
                minHeight: 80,
                maxHeight: 170,
                backgroundColor: p.bg,
                borderRadius: radius.md,
                padding: space.md,
                fontSize: 16,
                color: p.text,
                textAlignVertical: 'top',
                writingDirection: dir(draft),
                textAlign: isArabic(draft) ? 'right' : 'left',
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <VoiceButton label="🎙 Speak" compact autoStart={action === 'speak'} disabled={busy !== null} onDone={(a) => void heard(a)} />
              <Pressable
                hitSlop={8}
                onPress={() =>
                  void Clipboard.getStringAsync().then((t) => {
                    if (t) setDraft((now) => (now.trim() ? `${now}\n${t}` : t));
                  })
                }>
                <Text style={{ color: p.brand, fontWeight: '700' }}>📋 Paste</Text>
              </Pressable>
              {draft ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setDraft('');
                    setResult(null);
                    setPicked(null);
                  }}>
                  <Text style={{ color: p.muted, fontWeight: '700' }}>Clear</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }} />
              {recent.length ? (
                <Pressable hitSlop={8} onPress={() => setShowRecent((v) => !v)}>
                  <Text style={{ color: p.muted, fontWeight: '700' }}>{showRecent ? 'Hide recent' : '🕘 Recent'}</Text>
                </Pressable>
              ) : null}
            </View>
            {busy === 'voice' ? <Text style={{ color: p.muted }}>Listening to your voice note…</Text> : null}
          </View>
        ) : (
          <Text numberOfLines={3} style={{ color: p.muted, fontSize: 13, writingDirection: dir(text) }}>
            {text}
          </Text>
        )}

        {showRecent ? (
          <View style={{ gap: space.xs }}>
            {recent.map((r) => (
              <Pressable key={r.at} onPress={() => void copy(r.text)} style={({ pressed }) => ({ backgroundColor: p.bg, borderRadius: radius.md, padding: space.sm, opacity: pressed ? 0.6 : 1 })}>
                <Text numberOfLines={2} style={{ color: p.text, writingDirection: dir(r.text) }}>
                  {r.text}
                </Text>
                <Text style={{ color: p.muted, fontSize: 11 }}>Tap to copy again</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {compose && choices?.clients?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, alignItems: 'center' }} style={{ flexGrow: 0 }}>
            <Text style={{ color: p.muted, fontSize: 12, fontWeight: '700' }}>FOR</Text>
            <Chip p={p} label={client === 'auto' && foundClient ? `🔎 ${foundClient.name}` : '🔎 Auto'} on={client === 'auto'} onPress={() => setClient('auto')} />
            <Chip p={p} label="No client" on={client === 'none'} onPress={() => setClient('none')} />
            {choices.clients.map((c) => (
              <Chip key={c.id} p={p} label={c.name} on={client === c.id} onPress={() => setClient(c.id)} />
            ))}
          </ScrollView>
        ) : null}

        {action !== 'correct' ? (
          choices ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ flexGrow: 0 }}>
              <Chip p={p} label="✓ Correct only" on={picked === 'correct'} disabled={busy !== null} onPress={() => void run('correct')} />
              {modes.map((m) => (
                <Chip key={m.id} p={p} label={`${m.emoji ?? ''} ${m.name}`.trim()} on={picked === m.id} disabled={busy !== null} onPress={() => void run(m.id)} />
              ))}
            </ScrollView>
          ) : !error ? (
            <ActivityIndicator color={p.brand} />
          ) : null
        ) : null}

        {busy && busy !== 'voice' ? (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <ActivityIndicator color={p.brand} />
            <Text style={{ color: p.muted }}>{action === 'correct' ? 'Correcting…' : 'Writing…'}</Text>
          </View>
        ) : null}

        {error ? <Text style={{ color: p.danger }}>{error}</Text> : null}

        {result !== null ? (
          <View style={{ gap: space.sm }}>
            <View style={{ backgroundColor: p.bg, borderRadius: radius.md, padding: space.md }}>
              <Text selectable style={{ color: p.text, fontSize: 16, lineHeight: 24, writingDirection: dir(result) }}>
                {result}
              </Text>
            </View>
            {foundClient && client === 'auto' ? <Text style={{ color: p.muted, fontSize: 12 }}>{`Written for ${foundClient.name}, following their saved rules.`}</Text> : null}
            {!compose && result.trim() === text.trim() ? <Text style={{ color: p.ok }}>✓ No mistakes found.</Text> : null}
            {choices?.adjustments?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }} style={{ flexGrow: 0 }}>
                {choices.adjustments.map((a) => (
                  <Chip key={a.id} p={p} label={a.id === 'adjust_shorter' ? '✂️ Shorter' : a.id === 'adjust_warmer' ? '😊 Warmer' : a.id === 'adjust_formal' ? '👔 More formal' : a.name} disabled={busy !== null} onPress={() => void run(a.id, result)} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {result !== null ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {!readonly && !compose ? <BigButton p={p} title="Replace" onPress={() => finishProcessText(result)} /> : null}
          <BigButton p={p} outline={!compose && !readonly} title={copied ? 'Copied ✓' : compose ? '📋 Copy & close' : 'Copy'} onPress={() => void copy()} />
        </View>
      ) : null}
    </Sheet>
  );
}

// ---------- Quick task / Ask (the Anwarz chat, from the bubble) ----------

interface ChatAction {
  id: string;
  state: string;
  result?: string;
  card?: string;
  undo?: unknown;
}

function Quick({ action }: { action: 'task' | 'ask' }) {
  const p = usePalette();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const task = action === 'task';

  const send = async (words = draft, audio?: Audio) => {
    if (!words.trim() && !audio) return;
    setBusy(true);
    setError(null);
    setSteps([]);
    setAnswer('');
    setActions([]);
    try {
      if (!(await ensureSession())) throw new Error('Open Anwarz and sign in first.');
      let done = false;
      let failed: string | null = null;
      const body = audio ? { audio, stream: true } : { text: task ? `Add a task: ${words.trim()}` : words.trim(), stream: true };
      await apiStream('/chat', body, (e) => {
        if (e.type === 'heard' && typeof e.text === 'string') setDraft(e.text);
        else if (e.type === 'step' && typeof e.label === 'string') setSteps((s) => [...s, e.label as string]);
        else if (e.type === 'text' && typeof e.delta === 'string') setAnswer((a) => a + (e.delta as string));
        else if (e.type === 'reset') setAnswer('');
        else if (e.type === 'error') failed = typeof e.error === 'string' ? e.error : 'No answer.';
        else if (e.answer && typeof e.answer === 'object') {
          const a = e.answer as { content?: string; actions?: ChatAction[] };
          setAnswer(a.content || '');
          setActions(a.actions || []);
          done = true;
        }
      });
      if (failed) throw new Error(failed);
      if (!done) throw new Error('The answer was cut off. Try again.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const undo = async (a: ChatAction) => {
    try {
      const r = await api<{ action: ChatAction }>(`/chat/actions/${a.id}`, { body: { decision: 'undo' }, timeoutMs: 30_000 });
      setActions((now) => now.map((x) => (x.id === a.id ? r.action : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const openChat = () => {
    void Linking.openURL('anwarz://chat').catch(() => undefined);
    close();
  };

  return (
    <Sheet title={task ? '📌 Quick task' : '💬 Ask Anwarz'}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoFocus
        multiline
        editable={!busy}
        placeholder={task ? 'e.g. Call Sanad tomorrow at 3 about the invoice' : 'Ask anything: emails, tasks, clients, ads, orders…'}
        placeholderTextColor={p.muted}
        style={{ minHeight: 60, maxHeight: 140, backgroundColor: p.bg, borderRadius: radius.md, padding: space.md, fontSize: 16, color: p.text, textAlignVertical: 'top', writingDirection: dir(draft), textAlign: isArabic(draft) ? 'right' : 'left' }}
      />
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <VoiceButton label="🎙" compact disabled={busy} onDone={(a) => void send('', a)} />
        <View style={{ flex: 1 }} />
        <Pressable
          disabled={busy || !draft.trim()}
          onPress={() => void send()}
          style={({ pressed }) => ({ backgroundColor: p.brand, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 18, opacity: pressed || busy || !draft.trim() ? 0.6 : 1 })}>
          <Text style={{ color: p.onBrand, fontWeight: '800' }}>{task ? 'Save task' : 'Ask'}</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flexGrow: 0, maxHeight: 320 }} contentContainerStyle={{ gap: space.sm }}>
        {steps.map((s, i) => (
          <Text key={`${s}:${i}`} style={{ color: p.muted, fontSize: 13 }}>{`${i === steps.length - 1 && busy && !answer ? '…' : '✓'} ${s}`}</Text>
        ))}
        {busy && !steps.length && !answer ? <ActivityIndicator color={p.brand} /> : null}
        {answer ? <RichText text={answer} /> : null}
        {actions.map((a) => (
          <View key={a.id} style={{ borderWidth: 1.5, borderColor: a.state === 'done' ? p.ok : p.brand, borderRadius: radius.md, padding: space.sm, gap: 4 }}>
            <Text style={{ color: p.text, fontWeight: '600' }}>{a.result || a.card || 'Change prepared'}</Text>
            {a.state === 'done' && a.undo ? (
              <Pressable hitSlop={8} onPress={() => void undo(a)}>
                <Text style={{ color: p.brand, fontWeight: '700' }}>↩️ Undo</Text>
              </Pressable>
            ) : a.state === 'proposed' || a.state === 'drafted' ? (
              <Pressable hitSlop={8} onPress={openChat}>
                <Text style={{ color: p.brand, fontWeight: '700' }}>Open in Anwarz to confirm ›</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {error ? <Text style={{ color: p.danger }}>{error}</Text> : null}
      </ScrollView>
      {answer && !busy ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <BigButton p={p} outline title="Open chat" onPress={openChat} />
          <BigButton p={p} title="Done" onPress={close} />
        </View>
      ) : null}
    </Sheet>
  );
}

function Panel(props: Props) {
  if (props.action === 'task' || props.action === 'ask') return <Quick action={props.action} />;
  return <Writer {...props} />;
}

/** Registered as the "ProcessText" component (index.js), shown by ProcessTextActivity. */
export default function ProcessTextRoot(props: Props) {
  return (
    <SafeAreaProvider>
      <Panel {...props} />
    </SafeAreaProvider>
  );
}
