import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorBox, Input, Loading, Row, T } from '@/components/ui';
import { VoiceButton } from '@/components/voice-button';
import { api, apiStream } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';
import type { Audio } from '@/lib/types';
import { useKeyboardSpace } from '@/lib/use-keyboard-space';
import { fileIcon, takePendingChatFiles, takePendingChatText, tooBig, type ChatFile } from '@/lib/attachments';
import { AttachButton } from '@/components/attach-button';
import { RichText } from '@/components/rich-text';
import { useApi } from '@/lib/use-api';

// The AI chat: the same assistant as the Telegram bot, seeing tasks, emails (skipped ones too),
// the library, clients and their rules, reviews, ads, websites, Facebook/Instagram and JL Comfort.
// Type or tap 🎙 and speak. A task, a library note or "remember …" is done at once (with ↩️ Undo);
// anything else comes as a card with ✅ Confirm.

interface ChatAction {
  id: string;
  type: string;
  state: 'proposed' | 'drafted' | 'done' | 'cancelled' | 'failed' | 'undone';
  result?: string;
  undo?: { kind: string; id: string } | null;
  link?: { type: 'task' | 'email' | 'library'; id: string } | null;
  // The action's own fields, for the card text:
  text?: string;
  title?: string;
  subject?: string;
  change?: string;
  clientName?: string | null;
  url?: string;
  fields?: Record<string, string>;
  // Email replies:
  to?: string;
  notes?: string;
  draft?: string;
  from?: string;
  toEmail?: string | null;
  inbox?: string;
  draftSubject?: string;
  // Ads:
  pause?: boolean;
  campaigns?: { platform: 'google' | 'meta'; id: string; name: string }[];
  // Comments:
  author?: string;
  message?: string;
  /** The server's wording for the card: used for kinds of action this version of the app doesn't know. */
  card?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  heard?: boolean;
  model?: string;
  actions?: ChatAction[];
  links?: { type: 'task' | 'email' | 'library'; id: string; title: string }[];
  feedback?: 'bad' | 'good' | null;
  attachments?: { name: string; kind: string; mimeType: string; size: number }[];
}

const SUGGESTIONS = [
  'What needs me today?',
  'Any emails I should worry about?',
  'How did the ads do this week?',
  'Reviews waiting for a reply?',
  'How are the followers this week?',
  'JL Comfort orders this week?',
  'Mark S-1040 confirmed by the supplier',
  'What did I finish this week?',
  'Any comments waiting on Facebook or Instagram?',
  'What are the competitors doing?',
  'Pause the ads for a client',
];

function describe(a: ChatAction) {
  switch (a.type) {
    case 'task':
      return `📌 Task: ${a.text}`;
    case 'library_note':
      return `📚 Library: ${a.text}`;
    case 'remember':
      return `🧠 Remember: ${a.text}`;
    case 'forget':
      return `🗑 Forget: ${a.text}`;
    case 'update_profile':
      return `📄 Master profile: ${a.change}`;
    case 'complete_task':
      return `✅ Mark done: ${a.title}`;
    case 'email_important':
      return `⭐ Bring back as important: ${a.subject}`;
    case 'email_done':
      return `✔️ Mark email done: ${a.subject}`;
    case 'email_reply':
      return `✉️ Reply to ${a.to}: ${a.subject}${a.notes ? `\n“${a.notes}”` : ''}`;
    case 'email_new':
      return `✉️ New email from ${a.inbox} to ${a.to}\n“${a.notes}”`;
    case 'ads_status':
      return `${a.pause ? '⏸ Pause' : '▶️ Resume'} ${a.clientName}'s ads:\n${(a.campaigns ?? []).map((c) => `• ${c.platform === 'google' ? 'Google' : 'Meta'}: ${c.name}`).join('\n')}`;
    case 'comment_reply':
      return `💬 Reply to ${a.author}${a.clientName ? ` (${a.clientName})` : ''}: “${a.message}”${a.text ? `\n→ ${a.text}` : '\n→ the AI draft'}`;
    case 'comment_hide':
      return `🙈 Hide ${a.author}'s comment${a.clientName ? ` (${a.clientName})` : ''}: “${a.message}”`;
    case 'comment_skip':
      return `Skip ${a.author}'s comment: “${a.message}”`;
    case 'approve_five_star':
      return `⭐ Post all ready 5★ review replies${a.clientName ? ` for ${a.clientName}` : ' (all clients)'}`;
    case 'add_client':
      return `➕ New client: ${a.fields?.brandName ?? ''}${a.fields?.websiteUrl ? ` · ${a.fields.websiteUrl}` : ''}`;
    case 'update_client':
      return `✏️ Update ${a.clientName}: ${Object.entries(a.fields ?? (a as unknown as { changes?: Record<string, string> }).changes ?? {})
        .map(([k, v]) => `${k} → ${v}`)
        .join(', ')}`;
    case 'add_website':
      return `🌐 Check ${a.url} hourly for ${a.clientName}`;
    case 'jl_status':
    case 'jl_ship':
    case 'jl_confirmed':
    case 'jl_resend':
      return a.card ?? a.type;
    default:
      return a.card ?? a.type;
  }
}

function openLink(link: { type: 'task' | 'email' | 'library'; id: string; title?: string }) {
  if (link.type === 'task') router.push(`/task/${link.id}`);
  else if (link.type === 'email') router.push(`/email/${link.id}`);
  else router.push({ pathname: '/library', params: link.title ? { q: link.title } : {} });
}

function ActionCard({ action, onChange }: { action: ChatAction; onChange: (a: ChatAction) => void }) {
  const p = usePalette();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [subject, setSubject] = useState('');

  const decide = async (decision: 'confirm' | 'cancel' | 'undo' | 'send' | 'edit', extra: Record<string, string> = {}) => {
    setBusy(decision);
    try {
      const r = await api<{ action: ChatAction }>(`/chat/actions/${action.id}`, { body: { decision, ...extra }, timeoutMs: 90_000 });
      onChange(r.action);
      return true;
    } catch (e) {
      Alert.alert('Not done', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const tone = action.state === 'done' ? p.ok : action.state === 'failed' ? p.danger : action.state === 'proposed' || action.state === 'drafted' ? p.brand : p.muted;
  const newMail = action.type === 'email_new';
  const reply = action.type === 'email_reply' || newMail;

  const send = () =>
    Alert.alert(newMail ? 'Send this email?' : 'Send this reply?', `To ${action.toEmail ?? action.to}\nFrom ${action.from ?? ''}`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Send', onPress: () => void decide('send') },
    ]);
  return (
    <View style={{ borderWidth: 1.5, borderColor: tone, borderRadius: radius.md, padding: space.md, gap: space.sm, backgroundColor: p.card }}>
      <T style={{ fontWeight: '600', textDecorationLine: action.state === 'cancelled' || action.state === 'undone' ? 'line-through' : 'none' }}>{describe(action)}</T>
      {action.result ? <T variant="small" color={tone}>{action.result}</T> : null}
      {action.state === 'cancelled' ? <T variant="small">{reply ? 'Not sent' : 'Cancelled'}</T> : null}
      {editing ? (
        <View style={{ gap: space.sm }}>
          <Input value={subject} onChangeText={setSubject} placeholder="Subject" />
          <Input value={draftText} onChangeText={setDraftText} multiline style={{ minHeight: 180 }} />
          <Row>
            <Button
              title="Save"
              small
              busy={busy === 'edit'}
              disabled={draftText.trim().length < 2}
              onPress={async () => {
                if (await decide('edit', { draft: draftText.trim(), subject: subject.trim() })) setEditing(false);
              }}
            />
            <Button title="Cancel" small kind="outline" onPress={() => setEditing(false)} />
          </Row>
        </View>
      ) : reply && action.draft && (action.state === 'drafted' || action.state === 'done') ? (
        <View style={{ backgroundColor: p.bg, borderRadius: radius.md, padding: space.md, gap: 4 }}>
          {newMail && action.draftSubject ? <T style={{ fontWeight: '700' }}>{`Subject: ${action.draftSubject}`}</T> : null}
          <T selectable>{action.draft}</T>
        </View>
      ) : null}
      {action.state === 'drafted' && /\[[^\]]+\]/.test(action.draft ?? '') ? <T variant="small" color={p.danger}>Fill in the [brackets] first: tap ✏️ Edit.</T> : null}
      {busy === 'confirm' && reply ? <T variant="small">{newMail ? 'Writing the email…' : 'Writing the reply…'}</T> : null}
      <Row wrap>
        {action.state === 'proposed' ? (
          <>
            <Button title={newMail ? '✍️ Write the email' : reply ? '✍️ Write the reply' : '✅ Confirm'} small tone="ok" busy={busy === 'confirm'} disabled={busy !== null} onPress={() => void decide('confirm')} />
            <Button title="✖️ Cancel" small kind="outline" busy={busy === 'cancel'} disabled={busy !== null} onPress={() => void decide('cancel')} />
          </>
        ) : null}
        {action.state === 'drafted' && !editing ? (
          <>
            <Button title="📨 Send" small tone="ok" busy={busy === 'send'} disabled={busy !== null} onPress={send} />
            {newMail ? (
              <Button
                title="✏️ Edit"
                small
                kind="soft"
                disabled={busy !== null}
                onPress={() => {
                  setDraftText(action.draft ?? '');
                  setSubject(action.draftSubject ?? '');
                  setEditing(true);
                }}
              />
            ) : action.link ? (
              <Button title="✏️ Edit" small kind="soft" disabled={busy !== null} onPress={() => openLink(action.link!)} />
            ) : null}
            <Button title="🗑 Drop" small kind="outline" busy={busy === 'cancel'} disabled={busy !== null} onPress={() => void decide('cancel')} />
          </>
        ) : null}
        {action.state === 'done' && action.link ? <Button title="Open" small kind="soft" onPress={() => openLink({ ...action.link!, title: action.result?.replace(/^📚 Saved: /, '') })} /> : null}
        {action.state === 'done' && action.undo ? <Button title="↩️ Undo" small kind="outline" busy={busy === 'undo'} disabled={busy !== null} onPress={() => void decide('undo')} /> : null}
      </Row>
    </View>
  );
}

/** 👍 / 👎 under an answer: a 👎 goes to the list of answers to fix. */
function Rate({ message, onRated }: { message: ChatMessage; onRated: (m: ChatMessage) => void }) {
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const rate = async (rating: 'bad' | 'good') => {
    const next = message.feedback === rating ? null : rating;
    setBusy(true);
    try {
      await api('/chat', { body: { action: 'rate', at: message.at, rating: next } });
      onRated({ ...message, feedback: next });
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const chip = (rating: 'bad' | 'good', icon: string) => (
    <Pressable
      key={rating}
      disabled={busy}
      onPress={() => void rate(rating)}
      hitSlop={8}
      style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: message.feedback === rating ? p.brandSoft : 'transparent', opacity: pressed || busy ? 0.5 : message.feedback && message.feedback !== rating ? 0.35 : 0.8 })}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: -4 }}>
      {chip('good', '👍')}
      {chip('bad', '👎')}
      {message.feedback === 'bad' ? <Text style={{ color: p.muted, fontSize: 11 }}>Saved to fix</Text> : null}
    </View>
  );
}

function Bubble({ message, onActionChange, onRated }: { message: ChatMessage; onActionChange: (a: ChatAction) => void; onRated?: (m: ChatMessage) => void }) {
  const p = usePalette();
  const mine = message.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'stretch', gap: space.sm }}>
      <View
        style={{
          maxWidth: mine ? '85%' : '100%',
          backgroundColor: mine ? p.brand : p.card,
          borderRadius: radius.lg,
          borderBottomRightRadius: mine ? 4 : radius.lg,
          borderBottomLeftRadius: mine ? radius.lg : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: mine ? 0 : 1,
          borderColor: p.border,
        }}>
        {message.heard ? <Text style={{ color: mine ? p.onBrand : p.muted, fontSize: 11, opacity: 0.8 }}>🎙 voice</Text> : null}
        {message.attachments?.length ? (
          <Text style={{ color: mine ? p.onBrand : p.muted, fontSize: 13, marginBottom: 4 }}>{message.attachments.map((f) => `${fileIcon(f)} ${f.name}`).join('   ')}</Text>
        ) : null}
        {mine ? (
          <Text selectable style={{ color: p.onBrand, fontSize: 15, lineHeight: 22, writingDirection: /[؀-ۿ]/.test(message.content.slice(0, 40)) ? 'rtl' : 'ltr' }}>
            {message.content}
          </Text>
        ) : (
          <RichText text={message.content} />
        )}
        {message.model ? <Text style={{ color: p.muted, fontSize: 11, marginTop: 4 }}>{`— ${message.model}`}</Text> : null}
      </View>
      {message.actions?.map((a) => <ActionCard key={a.id} action={a} onChange={onActionChange} />)}
      {!mine && onRated ? <Rate message={message} onRated={onRated} /> : null}
      {message.links?.length ? (
        <Row wrap>
          {message.links.map((l) => (
            <Pressable
              key={`${l.type}:${l.id}`}
              onPress={() => openLink(l)}
              style={({ pressed }) => ({ backgroundColor: p.brandSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, opacity: pressed ? 0.6 : 1, maxWidth: '100%' })}>
              <Text numberOfLines={1} style={{ color: p.brand, fontSize: 13, fontWeight: '600' }}>
                {`${l.type === 'task' ? '📌' : l.type === 'email' ? '📧' : '📚'} ${l.title}`}
              </Text>
            </Pressable>
          ))}
        </Row>
      ) : null}
    </View>
  );
}

/** The answer while it's being worked out: each step it took (✓) and the words so far. */
function LiveAnswer({ steps, text, heard }: { steps: string[]; text: string; heard: boolean }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm }}>
      {steps.map((s, i) => (
        <Row key={`${s}:${i}`}>
          {i === steps.length - 1 && !text ? <ActivityIndicator size="small" color={p.brand} /> : <Text style={{ color: p.ok, width: 20, textAlign: 'center' }}>✓</Text>}
          <T variant="small">{`${s}…`}</T>
        </Row>
      ))}
      {text ? (
        <View style={{ backgroundColor: p.card, borderRadius: radius.lg, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: p.border }}>
          <RichText selectable={false} text={text.replace(/\s*\[(K|T|E):[A-Za-z0-9_-]{6,40}\]/g, '').replace(/\s*\[M:[^\]\s]{4,200}\]/g, '')} />
        </View>
      ) : null}
      {!steps.length && !text ? (
        <Row>
          <ActivityIndicator color={p.brand} />
          <T variant="small">{heard ? 'Listening and thinking…' : 'Thinking…'}</T>
        </Row>
      ) : null}
    </View>
  );
}

export default function Chat() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { data, setData, error, loading, refresh } = useApi<{ messages: ChatMessage[]; model: string | null }>('/chat');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage | null>(null); // the question while the AI thinks
  // What the AI is doing right now (its steps) and the words of its answer so far, as they stream in.
  const [live, setLive] = useState<{ steps: string[]; text: string }>({ steps: [], text: '' });
  const answering = live.text.length > 0;
  // Files to send with the next message (📎, or "Ask the chat" from the Share screen).
  const [files, setFiles] = useState<ChatFile[]>([]);
  const addFiles = (more: ChatFile[]) =>
    setFiles((now) => {
      const next = [...now];
      for (const f of more) {
        if (next.length >= 4) break;
        if (tooBig(next, f)) {
          Alert.alert('Too much at once', `${f.name} didn’t fit: send the files in two messages.`);
          continue;
        }
        next.push(f);
      }
      return next;
    });
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const screen = useRef<ComponentRef<typeof View>>(null);
  const keyboardSpace = useKeyboardSpace(screen);
  const messages = data?.messages ?? [];

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, pending, keyboardSpace, live.steps.length, answering]);

  // Files from the Share screen ("Ask the chat") arrive whenever this tab comes into view.
  useFocusEffect(
    useCallback(() => {
      const shared = takePendingChatFiles();
      if (shared.length) setFiles((now) => [...now, ...shared].slice(0, 4));
      const sharedText = takePendingChatText();
      if (sharedText) setText((now) => (now ? `${now}\n${sharedText}` : sharedText));
    }, [])
  );

  const ask = async (body: { text?: string; audio?: Audio }) => {
    const sending = files;
    setPending({
      role: 'user',
      content: body.text ?? (body.audio ? '🎙 …' : ''),
      at: new Date().toISOString(),
      heard: Boolean(body.audio),
      attachments: sending.map((f) => ({ name: f.name, kind: '', mimeType: f.mimeType, size: f.size })),
    });
    setText('');
    setFiles([]);
    setLive({ steps: [], text: '' });
    try {
      const attachments = sending.map(({ name, mimeType, data }) => ({ name, mimeType, data }));
      let finished: ChatMessage[] | null = null;
      let failed: string | null = null;
      await apiStream('/chat', { ...body, ...(attachments.length ? { attachments } : {}), stream: true }, (event) => {
        if (event.type === 'heard' && typeof event.text === 'string') {
          const heardText = event.text;
          setPending((now) => (now ? { ...now, content: heardText } : now));
        } else if (event.type === 'step' && typeof event.label === 'string') {
          const label = event.label;
          setLive((now) => (now.steps[now.steps.length - 1] === label ? now : { ...now, steps: [...now.steps, label] }));
        } else if (event.type === 'text' && typeof event.delta === 'string') {
          const delta = event.delta;
          setLive((now) => ({ ...now, text: now.text + delta }));
        } else if (event.type === 'reset') {
          setLive((now) => ({ ...now, text: '' }));
        } else if (event.type === 'error') {
          failed = typeof event.error === 'string' ? event.error : 'No answer.';
        } else if (Array.isArray(event.messages)) {
          // 'done' (or a server that answers in one piece)
          finished = event.messages as ChatMessage[];
        }
      });
      if (failed) throw new Error(failed);
      if (!finished) throw new Error('The answer was cut off. Try again.');
      const done: ChatMessage[] = finished;
      setData((d) => ({ model: d?.model ?? null, messages: done }));
    } catch (e) {
      if (body.text) setText(body.text);
      setFiles(sending); // keep them for another try
      Alert.alert('No answer', e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
      setLive({ steps: [], text: '' });
    }
  };

  const send = () => {
    const q = text.trim();
    if ((q || files.length) && !pending) void ask({ text: q });
  };

  const newChat = () =>
    Alert.alert('Start a new chat?', 'The AI forgets this conversation (what you asked it to remember stays saved).', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New chat',
        onPress: async () => {
          await api('/chat', { body: { action: 'new' } }).catch(() => undefined);
          setData({ messages: [], model: null });
        },
      },
    ]);

  const updateMessage = (updated: ChatMessage) =>
    setData((d) => (d ? { ...d, messages: d.messages.map((m) => (m.role === 'assistant' && m.at === updated.at ? updated : m)) } : d));

  const updateAction = (updated: ChatAction) =>
    setData((d) =>
      d ? { ...d, messages: d.messages.map((m) => (m.actions?.some((a) => a.id === updated.id) ? { ...m, actions: m.actions.map((a) => (a.id === updated.id ? updated : a)) } : m)) } : d
    );

  return (
    <View ref={screen} style={{ flex: 1, backgroundColor: p.bg, paddingBottom: keyboardSpace }}>
      <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.sm, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: p.text }}>Chat</Text>
          <Text style={{ color: p.muted }}>Ask anything · say “add a task …” or “save to library …”</Text>
        </View>
        {messages.length ? <Button title="✨ New" small kind="soft" onPress={newChat} /> : null}
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingTop: space.sm, gap: space.md }} keyboardShouldPersistTaps="handled">
        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
        {data && !messages.length && !pending ? (
          <View style={{ gap: space.sm }}>
            <T variant="small">I can see your tasks, emails (skipped ones too), library, clients and their rules, Google reviews, ads, websites, Facebook/Instagram and JL Comfort. Try:</T>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => void ask({ text: s })} style={({ pressed }) => ({ backgroundColor: p.card, borderWidth: 1, borderColor: p.border, borderRadius: radius.md, padding: space.md, opacity: pressed ? 0.6 : 1 })}>
                <Text style={{ color: p.text }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {messages.map((m, i) => (
          <Bubble key={`${m.at}:${i}`} message={m} onActionChange={updateAction} onRated={updateMessage} />
        ))}
        {pending ? (
          <>
            <Bubble message={pending} onActionChange={updateAction} />
            <LiveAnswer steps={live.steps} text={live.text} heard={Boolean(pending.heard)} />
          </>
        ) : null}
      </ScrollView>

      {files.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: p.border, backgroundColor: p.card }}>
          {files.map((f, i) => (
            <Pressable
              key={`${f.name}:${i}`}
              onPress={() => setFiles((now) => now.filter((_, j) => j !== i))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: p.brandSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%' }}>
              <Text numberOfLines={1} style={{ color: p.brand, fontWeight: '600', maxWidth: 220 }}>{`${fileIcon(f)} ${f.name}`}</Text>
              <Text style={{ color: p.brand, fontWeight: '800' }}>✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm, paddingHorizontal: space.md, borderTopWidth: files.length ? 0 : 1, borderTopColor: p.border, backgroundColor: p.card }}>
        <AttachButton disabled={Boolean(pending) || files.length >= 4} onPick={addFiles} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={files.length ? 'What should I do with it? (or just send)' : 'Ask or tell me what to do…'}
          placeholderTextColor={p.muted}
          multiline
          style={{
            flex: 1,
            maxHeight: 120,
            minHeight: 44,
            backgroundColor: p.bg,
            borderRadius: radius.lg,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 16,
            color: p.text,
            writingDirection: /[؀-ۿ]/.test(text.slice(0, 20)) ? 'rtl' : 'ltr',
          }}
        />
        {text.trim() || files.length ? (
          <Button title="➤" onPress={send} disabled={Boolean(pending)} />
        ) : (
          <VoiceButton label="🎙" compact disabled={Boolean(pending)} onDone={(audio) => void ask({ audio })} />
        )}
      </View>
    </View>
  );
}
