import { useState } from 'react';
import { Alert } from 'react-native';

import { ReviewCard } from '@/components/review-card';
import { Button, Card, Chip, Empty, ErrorBox, Loading, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { usePalette } from '@/lib/theme';
import type { AppReview } from '@/lib/types';
import { useApi } from '@/lib/use-api';

interface ReviewsData {
  reviews: AppReview[];
  clients: { id: string; name: string; count: number }[];
  fiveStarReady: number;
}

export default function Reviews() {
  const p = usePalette();
  const [view, setView] = useState<'waiting' | 'answered'>('waiting');
  const [client, setClient] = useState<string | null>(null);
  const { data, error, loading, refreshing, refresh } = useApi<ReviewsData>(`/reviews?view=${view}${client ? `&client=${encodeURIComponent(client)}` : ''}`);
  const [posting, setPosting] = useState(false);

  const approveFive = () => {
    const n = data?.fiveStarReady ?? 0;
    const who = client ? data?.clients.find((c) => c.id === client)?.name : null;
    Alert.alert(`Post ${n} five-star repl${n === 1 ? 'y' : 'ies'}?`, `The AI drafts for every ready ★★★★★ review${who ? ` of ${who}` : ''} go to Google now. Reviews with 4★ or less are never included.`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Post all',
        onPress: async () => {
          setPosting(true);
          try {
            const result = await api<{ posted: number; failed: string[] }>('/reviews', { body: { action: 'approve_five', ...(client ? { clientId: client } : {}) }, timeoutMs: 120_000 });
            Alert.alert('Done', `✅ Posted ${result.posted}${result.failed.length ? `\n⚠️ ${result.failed.length} failed: ${result.failed[0]}` : ''}`);
            void refresh();
          } catch (e) {
            Alert.alert('Not posted', e instanceof Error ? e.message : String(e));
          } finally {
            setPosting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen title="Reviews" subtitle="Google reviews for your clients" refreshing={refreshing} onRefresh={refresh}>
      <Row>
        <Chip text="Waiting" selected={view === 'waiting'} onPress={() => setView('waiting')} />
        <Chip text="Answered" selected={view === 'answered'} onPress={() => setView('answered')} />
      </Row>
      {view === 'waiting' && data && data.clients.length > 1 ? (
        <Row wrap>
          <Chip text="All clients" selected={!client} onPress={() => setClient(null)} />
          {data.clients.map((c) => (
            <Chip key={c.id} text={`${c.name} (${c.count})`} selected={client === c.id} onPress={() => setClient(c.id)} />
          ))}
        </Row>
      ) : null}

      {view === 'waiting' && data && data.fiveStarReady > 0 ? (
        <Card tone="ok">
          <T variant="heading" color={p.ok}>{`⭐ ${data.fiveStarReady} five-star repl${data.fiveStarReady === 1 ? 'y' : 'ies'} ready`}</T>
          <T variant="small">Check a few, then post them all in one tap.</T>
          <Button title="✅ Approve all 5★" tone="ok" busy={posting} onPress={approveFive} />
        </Card>
      ) : null}

      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        data.reviews.length ? (
          data.reviews.map((r) => <ReviewCard key={`${r.id}:${r.status}`} review={r} />)
        ) : (
          <Empty text={view === 'waiting' ? 'No reviews waiting. ✅' : 'No answered reviews yet.'} />
        )
      ) : null}
    </Screen>
  );
}
