import { useState } from 'react';

import { EmailRow } from '@/components/rows';
import { Chip, Empty, ErrorBox, Loading, Row, Screen } from '@/components/ui';
import type { AppEmail } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type View = 'waiting' | 'handled' | 'all';
interface InboxData {
  inboxes: { id: string; email: string; label: string | null; provider: string; enabled: boolean; lastError: string | null }[];
  emails: AppEmail[];
}

export default function Inbox() {
  const [view, setView] = useState<View>('waiting');
  const [inbox, setInbox] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh } = useApi<InboxData>(`/emails?view=${view}${inbox ? `&inbox=${encodeURIComponent(inbox)}` : ''}`);

  return (
    <Screen title="Inbox" subtitle="Important email the AI kept" refreshing={refreshing} onRefresh={refresh}>
      <Row wrap>
        <Chip text="Needs me" selected={view === 'waiting'} onPress={() => setView('waiting')} />
        <Chip text="Handled" selected={view === 'handled'} onPress={() => setView('handled')} />
        <Chip text="All" selected={view === 'all'} onPress={() => setView('all')} />
      </Row>
      {data && data.inboxes.length > 1 ? (
        <Row wrap>
          <Chip text="All inboxes" selected={!inbox} onPress={() => setInbox(null)} />
          {data.inboxes.map((i) => (
            <Chip key={i.id} text={`${i.label || i.email}${i.lastError ? ' ⚠️' : ''}`} selected={inbox === i.id} onPress={() => setInbox(i.id)} />
          ))}
        </Row>
      ) : null}
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? data.emails.length ? data.emails.map((e) => <EmailRow key={e.id} email={e} />) : <Empty text={view === 'waiting' ? 'Nothing waiting on you. ✅' : 'No emails here.'} /> : null}
    </Screen>
  );
}
