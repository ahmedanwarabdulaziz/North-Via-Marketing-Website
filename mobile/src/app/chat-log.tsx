import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip, ChipRow, Empty, ErrorBox, Loading, Pill, Row, Screen, T } from '@/components/ui';
import { ago } from '@/lib/format';
import { space, usePalette } from '@/lib/theme';
import { useApi } from '@/lib/use-api';

// Chat log: the AI chat's answers that went wrong (a change it couldn't prepare, an action that
// failed, or a 👎), so they can be fixed. Also which engine answers and the AI credit left.

interface Failure {
  at: string;
  loggedAt: string;
  kind: 'auto' | 'thumbs_down' | 'action_failed';
  question: string;
  answer: string;
  model: string | null;
  actions: string[];
  problems: string[];
  note: string | null;
}

interface LogData {
  engine: 'agent' | 'classic';
  credit: { left: number; used: number; total: number; low: boolean } | null;
  failures: Failure[];
}

const KIND = {
  thumbs_down: { label: '👎 You', tone: 'danger' },
  action_failed: { label: '⚠️ Action failed', tone: 'warn' },
  auto: { label: '🤖 Couldn’t do it', tone: 'muted' },
} as const;

export default function ChatLog() {
  const p = usePalette();
  const { data, error, loading, refreshing, refresh } = useApi<LogData>('/chat/log');
  const [filter, setFilter] = useState<'all' | Failure['kind']>('all');
  const [open, setOpen] = useState<string | null>(null);
  const list = (data?.failures ?? []).filter((f) => filter === 'all' || f.kind === filter);

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data ? (
        <>
          <Card>
            <Row wrap>
              <Pill text={data.engine === 'agent' ? '🛠 Tools chat' : '💬 Classic chat'} tone="brand" />
              {data.credit ? (
                <Pill text={`🤖 AI credit $${data.credit.left.toFixed(2)} of $${data.credit.total.toFixed(2)}`} tone={data.credit.low ? 'danger' : 'ok'} />
              ) : (
                <Pill text="AI credit unknown" tone="muted" />
              )}
            </Row>
            <T variant="small">
              {data.credit?.low ? 'Credit is low: top up at openrouter.ai/credits. When it runs out, the chat falls back to the free models.' : 'Send /classic or /tools in the chat to switch engines.'}
            </T>
          </Card>

          <ChipRow>
            <Chip text={`All (${data.failures.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
            {(Object.keys(KIND) as Failure['kind'][]).map((k) => {
              const n = data.failures.filter((f) => f.kind === k).length;
              return <Chip key={k} text={`${KIND[k].label} (${n})`} selected={filter === k} onPress={() => setFilter(k)} />;
            })}
          </ChipRow>

          {!list.length ? <Empty text={data.failures.length ? 'Nothing of this kind.' : 'Nothing has gone wrong yet. ✅'} /> : null}

          {list.map((f) => {
            const key = `${f.loggedAt}:${f.at}`;
            const expanded = open === key;
            return (
              <Card key={key} onPress={() => setOpen(expanded ? null : key)}>
                <Row>
                  <Pill text={KIND[f.kind].label} tone={KIND[f.kind].tone} />
                  <View style={{ flex: 1 }} />
                  <T variant="small">{ago(f.loggedAt)}</T>
                </Row>
                <T style={{ fontWeight: '600' }} numberOfLines={expanded ? undefined : 2}>{`“${f.question}”`}</T>
                {f.problems.slice(0, expanded ? undefined : 2).map((pr, i) => (
                  <T key={i} variant="small" color={p.danger} numberOfLines={expanded ? undefined : 2}>{`• ${pr}`}</T>
                ))}
                {expanded ? (
                  <View style={{ gap: space.sm, marginTop: space.sm }}>
                    <T variant="small" color={p.muted}>Answer</T>
                    <Text selectable style={{ color: p.text, fontSize: 14, lineHeight: 20 }}>{f.answer}</Text>
                    {f.actions.length ? (
                      <>
                        <T variant="small" color={p.muted}>Cards</T>
                        {f.actions.map((a, i) => (
                          <T key={i} variant="small" selectable>{`• ${a}`}</T>
                        ))}
                      </>
                    ) : null}
                    {f.note ? <T variant="small">{`Your note: ${f.note}`}</T> : null}
                    {f.model ? <T variant="small" color={p.muted}>{`— ${f.model}`}</T> : null}
                  </View>
                ) : (
                  <T variant="small" color={p.muted}>Tap for the answer and details</T>
                )}
              </Card>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}
