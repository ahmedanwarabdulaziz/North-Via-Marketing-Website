import { router } from 'expo-router';
import { useState } from 'react';

import { Card, Empty, ErrorBox, Input, Loading, Pill, Row, Screen, T } from '@/components/ui';
import type { AppClient } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function Clients() {
  const { data, error, loading, refreshing, refresh } = useApi<{ clients: AppClient[] }>('/clients');
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const list = (data?.clients || []).filter((c) => !q || c.name.toLowerCase().includes(q) || (c.owner || '').toLowerCase().includes(q));

  return (
    <Screen padTop={false} refreshing={refreshing} onRefresh={refresh}>
      <Input value={search} onChangeText={setSearch} placeholder="Search clients" autoCorrect={false} />
      {loading && !data ? <Loading /> : null}
      {error && !data ? <ErrorBox message={error} onRetry={refresh} /> : null}
      {data && !list.length ? <Empty text="No clients found." /> : null}
      {list.map((c) => (
        <Card key={c.id} onPress={() => router.push(`/client/${c.id}`)} tone={c.sitesDown ? 'danger' : undefined}>
          <T variant="heading">{c.name}</T>
          {c.owner ? <T variant="small">{c.owner}</T> : null}
          <Row wrap>
            {c.openTasks ? <Pill text={`${c.openTasks} open task${c.openTasks === 1 ? '' : 's'}`} /> : null}
            {c.sitesDown ? <Pill text={`${c.sitesDown} site down`} tone="danger" /> : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
