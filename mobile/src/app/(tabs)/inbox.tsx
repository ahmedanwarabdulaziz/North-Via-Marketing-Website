import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { EmailCard } from '@/components/email-card';
import { SelectionBar, runForEach } from '@/components/selection-bar';
import { Chip, ChipRow, Empty, ErrorBox, Loading, Screen, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { usePalette } from '@/lib/theme';
import type { AppEmail } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Filter = 'waiting' | 'handled' | 'skipped' | 'all';
type BulkAction = 'done' | 'ignore' | 'ignore_similar' | 'important';
interface InboxData {
  inboxes: { id: string; email: string; label: string | null; provider: string; enabled: boolean; lastError: string | null }[];
  emails: AppEmail[];
}

/** Hold an email to start selecting; tap others to add them; then one action for all. */
export default function Inbox() {
  const p = usePalette();
  const [view, setView] = useState<Filter>('waiting');
  // The 9 PM "Skipped today" notification opens this tab on Skipped.
  const params = useLocalSearchParams<{ view?: string }>();
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    if (params.view === 'skipped' || params.view === 'waiting' || params.view === 'handled') setView(params.view);
  }
  const [inbox, setInbox] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh, reload } = useApi<InboxData>(`/emails?view=${view}${inbox ? `&inbox=${encodeURIComponent(inbox)}` : ''}`, { live: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<BulkAction | null>(null);
  const selecting = selected.size > 0;
  const emails = data?.emails ?? [];

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
    const { ok, failed } = await runForEach(ids, (id) => api(`/emails/${id}`, { body: { action } }));
    if (action === 'important' && !failed.length) Alert.alert('⭐ Moved to “Needs me”', `${ok} email${ok === 1 ? '' : 's'} back in your inbox.`);
    setWorking(null);
    setSelected(new Set());
    void reload();
    if (failed.length) Alert.alert('Partly done', `✅ ${ok} done\n⚠️ ${failed.length} failed: ${failed[0]}`);
  };

  const confirm = (action: BulkAction) => {
    const n = selected.size;
    if (action === 'done' || action === 'important') return void run(action);
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

  const allSelected = selecting && emails.length > 0 && emails.every((e) => selected.has(e.id));

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Screen
        title="Inbox"
        subtitle={selecting ? `${selected.size} selected` : view === 'skipped' ? 'Email the AI or your rules left out · ⭐ to bring one back' : 'Important email the AI kept · hold one to select many'} refreshing={refreshing} onRefresh={refresh}>
        <Segmented
          value={view}
          onChange={(v) => {
            setView(v);
            setSelected(new Set());
          }}
          options={[
            { key: 'waiting', label: 'Needs me', count: view === 'waiting' ? emails.length : null, alert: view === 'waiting' && emails.some((e) => e.urgent) },
            { key: 'handled', label: 'Handled' },
            { key: 'skipped', label: 'Skipped' },
            { key: 'all', label: 'All' },
          ]}
        />
        {data && data.inboxes.length > 1 ? (
          <ChipRow>
            <Chip text="All inboxes" selected={!inbox} onPress={() => { setInbox(null); setSelected(new Set()); }} />
            {data.inboxes.map((i) => (
              <Chip key={i.id} text={`${i.label || i.email}${i.lastError ? ' ⚠️' : ''}`} selected={inbox === i.id} onPress={() => { setInbox(i.id); setSelected(new Set()); }} />
            ))}
          </ChipRow>
        ) : null}
        {loading && !data ? <Loading /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
        {data ? (
          emails.length ? (
            emails.map((e) => <EmailCard key={`${e.id}:${e.status}`} email={e} selecting={selecting} selected={selected.has(e.id)} onSelect={toggle} onChanged={reload} hideWhenHandled={view === 'waiting' || view === 'skipped'} />)
          ) : (
            <Empty text={view === 'waiting' ? 'Nothing waiting on you. ✅' : view === 'skipped' ? 'Nothing skipped lately.' : 'No emails here.'} />
          )
        ) : null}
        {selecting ? <View style={{ height: 120 }} /> : null}
      </Screen>

      {selecting ? (
        <SelectionBar
          count={selected.size}
          allSelected={allSelected}
          onToggleAll={() => setSelected(allSelected ? new Set() : new Set(emails.map((e) => e.id)))}
          onCancel={() => setSelected(new Set())}
          working={working}
          onAction={(key) => confirm(key as BulkAction)}
          actions={
            view === 'skipped'
              ? [{ key: 'important', icon: '⭐', label: 'Make important', tone: 'ok' }]
              : [
                  { key: 'done', icon: '✔️', label: 'Done', tone: 'ok' },
                  { key: 'ignore', icon: '🔕', label: 'Ignore senders' },
                  { key: 'ignore_similar', icon: '🚫', label: 'Ignore like these' },
                ]
          }
        />
      ) : null}
    </View>
  );
}
