import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { EmailCard } from '@/components/email-card';
import { Chip, Empty, ErrorBox, Loading, Row, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { radius, space, usePalette } from '@/lib/theme';
import type { AppEmail } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Filter = 'waiting' | 'handled' | 'all';
type BulkAction = 'done' | 'ignore' | 'ignore_similar';
interface InboxData {
  inboxes: { id: string; email: string; label: string | null; provider: string; enabled: boolean; lastError: string | null }[];
  emails: AppEmail[];
}

/** Hold an email to start selecting; tap others to add them; then one action for all. */
export default function Inbox() {
  const p = usePalette();
  const [view, setView] = useState<Filter>('waiting');
  const [inbox, setInbox] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh } = useApi<InboxData>(`/emails?view=${view}${inbox ? `&inbox=${encodeURIComponent(inbox)}` : ''}`);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<BulkAction | null>(null);
  const selecting = selected.size > 0;

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async (action: BulkAction) => {
    const ids = [...selected];
    setWorking(action);
    let ok = 0;
    const failed: string[] = [];
    // A few at a time, so 30 emails don't take 30 round trips one after another.
    for (let i = 0; i < ids.length; i += 4) {
      await Promise.all(
        ids.slice(i, i + 4).map((id) =>
          api(`/emails/${id}`, { body: { action } })
            .then(() => ok++)
            .catch((e) => failed.push(e instanceof Error ? e.message : String(e)))
        )
      );
    }
    setWorking(null);
    setSelected(new Set());
    void refresh();
    if (failed.length) Alert.alert('Partly done', `✅ ${ok} done\n⚠️ ${failed.length} failed: ${failed[0]}`);
  };

  const confirm = (action: BulkAction) => {
    const n = selected.size;
    if (action === 'done') return void run('done');
    Alert.alert(
      action === 'ignore' ? `Ignore ${n === 1 ? 'this sender' : `the senders of ${n} emails`}?` : `Ignore emails like these ${n}?`,
      action === 'ignore'
        ? 'Nothing from these senders (in the same inbox) will be shown again.'
        : 'Emails with the same kind of content will be skipped from now on. Other emails from these senders still show.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Ignore', style: 'destructive', onPress: () => void run(action) },
      ]
    );
  };

  const emails = data?.emails ?? [];
  const allSelected = selecting && emails.length > 0 && emails.every((e) => selected.has(e.id));

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Screen title="Inbox" subtitle={selecting ? `${selected.size} selected` : 'Important email the AI kept · hold one to select many'} refreshing={refreshing} onRefresh={refresh}>
        <Row wrap>
          <Chip text="Needs me" selected={view === 'waiting'} onPress={() => { setView('waiting'); setSelected(new Set()); }} />
          <Chip text="Handled" selected={view === 'handled'} onPress={() => { setView('handled'); setSelected(new Set()); }} />
          <Chip text="All" selected={view === 'all'} onPress={() => { setView('all'); setSelected(new Set()); }} />
        </Row>
        {data && data.inboxes.length > 1 ? (
          <Row wrap>
            <Chip text="All inboxes" selected={!inbox} onPress={() => { setInbox(null); setSelected(new Set()); }} />
            {data.inboxes.map((i) => (
              <Chip key={i.id} text={`${i.label || i.email}${i.lastError ? ' ⚠️' : ''}`} selected={inbox === i.id} onPress={() => { setInbox(i.id); setSelected(new Set()); }} />
            ))}
          </Row>
        ) : null}
        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
        {data ? (
          emails.length ? (
            emails.map((e) => <EmailCard key={`${e.id}:${e.status}`} email={e} selecting={selecting} selected={selected.has(e.id)} onSelect={toggle} />)
          ) : (
            <Empty text={view === 'waiting' ? 'Nothing waiting on you. ✅' : 'No emails here.'} />
          )
        ) : null}
        {selecting ? <View style={{ height: 120 }} /> : null}
      </Screen>

      {selecting ? (
        <View
          style={{
            position: 'absolute',
            left: space.md,
            right: space.md,
            bottom: space.md,
            backgroundColor: p.card,
            borderRadius: radius.lg,
            padding: space.sm,
            gap: space.sm,
            borderWidth: 1,
            borderColor: p.border,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 12,
          }}>
          <Row>
            <Text style={{ flex: 1, color: p.text, fontWeight: '800', fontSize: 15, paddingLeft: 6 }}>{`${selected.size} selected`}</Text>
            <BarLink label={allSelected ? 'Unselect all' : 'Select all'} onPress={() => setSelected(allSelected ? new Set() : new Set(emails.map((e) => e.id)))} />
            <BarLink label="✖️" onPress={() => setSelected(new Set())} />
          </Row>
          <Row>
            <BarButton icon="✔️" label="Done" tone="ok" busy={working === 'done'} disabled={working !== null} onPress={() => confirm('done')} />
            <BarButton icon="🔕" label="Ignore senders" busy={working === 'ignore'} disabled={working !== null} onPress={() => confirm('ignore')} />
            <BarButton icon="🚫" label="Ignore like these" busy={working === 'ignore_similar'} disabled={working !== null} onPress={() => confirm('ignore_similar')} />
          </Row>
        </View>
      ) : null}
    </View>
  );
}

function BarLink({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: p.brand, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function BarButton({ icon, label, onPress, tone, busy, disabled }: { icon: string; label: string; onPress: () => void; tone?: 'ok'; busy?: boolean; disabled?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 2,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: tone === 'ok' ? p.okSoft : p.bg,
        opacity: disabled && !busy ? 0.5 : pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontSize: 18 }}>{busy ? '⏳' : icon}</Text>
      <Text style={{ color: tone === 'ok' ? p.ok : p.text, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
