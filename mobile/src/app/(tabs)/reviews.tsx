import { useState } from 'react';
import { Alert, View } from 'react-native';

import { ReviewCard } from '@/components/review-card';
import { Button, Card, Chip, Empty, ErrorBox, Loading, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { space, usePalette } from '@/lib/theme';
import type { AppReview } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface ReviewsData {
  reviews: AppReview[];
  clients: { id: string; name: string; count: number }[];
  fiveStarReady: number;
}

const isFiveReady = (r: AppReview) => r.rating === 5 && r.status === 'draft_ready' && Boolean(r.draft);

export default function Reviews() {
  const p = usePalette();
  const [view, setView] = useState<'waiting' | 'answered'>('waiting');
  const [client, setClient] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh } = useApi<ReviewsData>(`/reviews?view=${view}${client ? `&client=${encodeURIComponent(client)}` : ''}`);
  const [posting, setPosting] = useState<string | null>(null); // 'all' or a client id

  // Ready 5★ drafts per client, from the list on screen.
  const five = new Map<string, { name: string; count: number }>();
  for (const r of data?.reviews ?? []) {
    if (!isFiveReady(r)) continue;
    const row = five.get(r.clientId) ?? { name: r.clientName || 'Client', count: 0 };
    row.count++;
    five.set(r.clientId, row);
  }
  const fiveTotal = [...five.values()].reduce((n, c) => n + c.count, 0);

  const approveFive = (clientId: string | null) => {
    const n = clientId ? five.get(clientId)?.count ?? 0 : fiveTotal;
    const who = clientId ? five.get(clientId)?.name : 'all clients';
    Alert.alert(
      `Post ${n} five-star repl${n === 1 ? 'y' : 'ies'} for ${who}?`,
      'The AI replies shown on the cards go to Google now. Reviews with 4★ or less are never included.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Post',
          onPress: async () => {
            setPosting(clientId ?? 'all');
            try {
              const result = await api<{ posted: number; failed: string[] }>('/reviews', {
                body: { action: 'approve_five', ...(clientId ? { clientId } : {}) },
                timeoutMs: 120_000,
              });
              Alert.alert('Done', `✅ Posted ${result.posted} on Google${result.failed.length ? `\n⚠️ ${result.failed.length} failed: ${result.failed[0]}` : ''}`);
              void refresh();
            } catch (e) {
              Alert.alert('Not posted', e instanceof Error ? e.message : String(e));
            } finally {
              setPosting(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen title="Reviews" subtitle="Google reviews for your clients" refreshing={refreshing} onRefresh={refresh}>
      <Row>
        <Chip text="Waiting" selected={view === 'waiting'} onPress={() => setView('waiting')} />
        <Chip text="Answered" selected={view === 'answered'} onPress={() => setView('answered')} />
      </Row>
      {view === 'waiting' && data && (data.clients.length > 1 || client) ? (
        <Row wrap>
          <Chip text="All clients" selected={!client} onPress={() => setClient(null)} />
          {data.clients.map((c) => (
            <Chip key={c.id} text={`${c.name} (${c.count})`} selected={client === c.id} onPress={() => setClient(c.id)} />
          ))}
        </Row>
      ) : null}

      {view === 'waiting' && fiveTotal > 0 ? (
        <Card tone="ok">
          <T variant="heading" color={p.ok}>{`⭐ ${fiveTotal} five-star repl${fiveTotal === 1 ? 'y' : 'ies'} ready`}</T>
          <T variant="small">Read the AI replies on the cards below, then post them in one tap.</T>
          {five.size > 1 ? (
            <View style={{ gap: space.sm }}>
              {[...five.entries()].map(([id, c]) => (
                <Row key={id}>
                  <T style={{ flex: 1, fontWeight: '600' }}>{`${c.name} · ${c.count}`}</T>
                  <Button title="Post" tone="ok" kind="soft" small busy={posting === id} disabled={posting !== null && posting !== id} onPress={() => approveFive(id)} />
                </Row>
              ))}
            </View>
          ) : null}
          <Button
            title={five.size > 1 || !client ? `✅ Post all ${fiveTotal} (${five.size > 1 ? 'all clients' : [...five.values()][0]?.name})` : `✅ Post all ${fiveTotal}`}
            tone="ok"
            busy={posting === 'all' || (five.size === 1 && posting !== null)}
            disabled={posting !== null}
            onPress={() => (five.size === 1 ? approveFive([...five.keys()][0]) : approveFive(null))}
          />
        </Card>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        data.reviews.length ? (
          data.reviews.map((r) => <ReviewCard key={`${r.id}:${r.status}:${r.draft?.length ?? 0}`} review={r} />)
        ) : (
          <Empty text={view === 'waiting' ? 'No reviews waiting. ✅' : 'No answered reviews yet.'} />
        )
      ) : null}
    </Screen>
  );
}
