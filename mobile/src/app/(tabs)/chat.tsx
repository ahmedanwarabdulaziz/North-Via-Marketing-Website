import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorBox, Input, Loading, Row, T } from '@/components/ui';
import { VoiceButton } from '@/components/voice-button';
import { api } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';
import type { Audio } from '@/lib/types';
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
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  at: string;
  heard?: boolean;
  model?: string;
  actions?: ChatAction[];
  links?: { type: 'task' | 'email' | 'library'; id: string; title: string }[];
}

const SUGGESTIONS = [
  'What needs me today?',
  'Any emails I should worry about?',
  'How did the ads do this week?',
  'Reviews waiting for a reply?',
  'How are the followers this week?',
  'JL Comfort orders this week?',
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
    default:
      return a.type;
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

function Bubble({ message, onActionChange }: { message: ChatMessage; onActionChange: (a: ChatAction) => void }) {
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
        <Text selectable style={{ color: mine ? p.onBrand : p.text, fontSize: 15, lineHeight: 22, writingDirection: /[؀-ۿ]/.test(message.content.slice(0, 40)) ? 'rtl' : 'ltr' }}>
          {message.content.replace(/\*\*(.+?)\*\*/g, '$1')}
        </Text>
        {message.model ? <Text style={{ color: p.muted, fontSize: 11, marginTop: 4 }}>{`— ${message.model}`}</Text> : null}
      </View>
      {message.actions?.map((a) => <ActionCard key={a.id} action={a} onChange={onActionChange} />)}
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

export default function Chat() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { data, setData, error, loading, refresh } = useApi<{ messages: ChatMessage[]; model: string | null }>('/chat');
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage | null>(null); // the question while the AI thinks
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const messages = data?.messages ?? [];

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, pending]);

  const ask = async (body: { text?: string; audio?: Audio }) => {
    setPending({ role: 'user', content: body.text ?? '🎙 …', at: new Date().toISOString(), heard: Boolean(body.audio) });
    setText('');
    try {
      const r = await api<{ messages: ChatMessage[] }>('/chat', { body, timeoutMs: 90_000 });
      setData((d) => ({ model: d?.model ?? null, messages: r.messages }));
    } catch (e) {
      if (body.text) setText(body.text);
      Alert.alert('No answer', e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  };

  const send = () => {
    const q = text.trim();
    if (q && !pending) void ask({ text: q });
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

  const updateAction = (updated: ChatAction) =>
    setData((d) =>
      d ? { ...d, messages: d.messages.map((m) => (m.actions?.some((a) => a.id === updated.id) ? { ...m, actions: m.actions.map((a) => (a.id === updated.id ? updated : a)) } : m)) } : d
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Bubble key={`${m.at}:${i}`} message={m} onActionChange={updateAction} />
        ))}
        {pending ? (
          <>
            <Bubble message={pending} onActionChange={updateAction} />
            <Row>
              <ActivityIndicator color={p.brand} />
              <T variant="small">{pending.heard ? 'Listening and thinking…' : 'Thinking…'}</T>
            </Row>
          </>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.sm, paddingHorizontal: space.md, borderTopWidth: 1, borderTopColor: p.border, backgroundColor: p.card }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask or tell me what to do…"
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
        {text.trim() ? (
          <Button title="➤" onPress={send} disabled={Boolean(pending)} />
        ) : (
          <VoiceButton label="🎙" compact disabled={Boolean(pending)} onDone={(audio) => void ask({ audio })} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
