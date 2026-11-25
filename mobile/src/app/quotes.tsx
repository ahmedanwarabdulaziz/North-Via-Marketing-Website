import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { Button, Card, Empty, ErrorBox, Input, Loading, Pill, Row, Screen, Segmented, T } from '@/components/ui';
import { STATUS_LABELS, money, type QuoteListItem } from '@/lib/quotes';
import { useApi } from '@/lib/use-api';

type Filter = 'all' | 'quote' | 'invoice';

export default function Quotes() {
  const { data, error, loading, refreshing, refresh } = useApi<{ docs: QuoteListItem[] }>('/quotes', { live: true });
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const docs = data?.docs || [];
  const q = search.trim().toLowerCase();
  const list = docs.filter((d) => (filter === 'all' || d.kind === filter) && (!q || d.clientName.toLowerCase().includes(q) || d.number.toLowerCase().includes(q)));

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      <Row>
        <Button title="＋ Quote" onPress={() => router.push('/quote/new?kind=quote' as Href)} style={{ flex: 1 }} />
        <Button title="＋ Invoice" kind="outline" onPress={() => router.push('/quote/new?kind=invoice' as Href)} style={{ flex: 1 }} />
      </Row>
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'All', count: docs.length },
          { key: 'quote', label: 'Quotes', count: docs.filter((d) => d.kind === 'quote').length },
          { key: 'invoice', label: 'Invoices', count: docs.filter((d) => d.kind === 'invoice').length },
        ]}
      />
      <Input value={search} onChangeText={setSearch} placeholder="Search client or number" autoCorrect={false} />
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data && !list.length ? <Empty text="Nothing here yet. Start with a new quote." /> : null}
      {list.map((d) => (
        <Card key={d.id} onPress={() => router.push(`/quote/${d.id}` as Href)}>
          <Row>
            <T variant="heading" style={{ flex: 1 }}>
              {d.clientName || '—'}
            </T>
            {d.total !== null ? <T variant="heading">{money(d.total)}</T> : null}
          </Row>
          <Row wrap>
            <Pill text={d.kind === 'quote' ? 'Quote' : 'Invoice'} tone={d.kind === 'quote' ? 'brand' : 'warn'} />
            <Pill text={STATUS_LABELS[d.status]} tone={d.status === 'paid' || d.status === 'accepted' ? 'ok' : d.status === 'rejected' || d.status === 'cancelled' ? 'danger' : 'muted'} />
            <T variant="small">{`${d.number} · ${d.issueDate}`}</T>
          </Row>
          {d.profit !== null ? <T variant="small" color={d.profit >= 0 ? undefined : '#C62828'}>{`Profit ${money(d.profit)} (${d.margin}%)`}</T> : null}
        </Card>
      ))}
    </Screen>
  );
}
