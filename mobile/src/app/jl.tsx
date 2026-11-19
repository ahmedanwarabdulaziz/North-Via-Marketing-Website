import { useState } from 'react';

import { JlSheet, STATUS_TONE, customerSource, money, type JlKind } from '@/components/jl-sheet';
import { Card, Chip, ChipRow, Empty, ErrorBox, Loading, Pill, Row, Screen, Segmented, T } from '@/components/ui';
import { ago } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { JlOrder, JlOverview, JlSample } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// JL Comfort (jlcomfort.com): orders and sample requests. Data and emails stay in JL Comfort;
// this page reads them and runs the same actions as its admin panel.

type Filter = { key: string; label: string; statuses: string[] };

const ORDER_FILTERS: Filter[] = [
  { key: 'todo', label: 'To do', statuses: ['paid', 'sent_to_supplier', 'problem'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
  { key: 'done', label: 'Done', statuses: ['delivered', 'closed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { key: 'all', label: 'All', statuses: [] },
];

const SAMPLE_FILTERS: Filter[] = [
  { key: 'todo', label: 'To do', statuses: ['pending', 'sent_to_supplier', 'supplier_confirmed', 'problem'] },
  { key: 'shipped', label: 'Shipped', statuses: ['shipped'] },
  { key: 'done', label: 'Delivered', statuses: ['delivered'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { key: 'all', label: 'All', statuses: [] },
];

const sum = (counts: Record<string, number> | undefined, statuses: string[]) =>
  statuses.reduce((n, s) => n + (counts?.[s] ?? 0), 0);

export default function JlComfort() {
  const p = usePalette();
  const [kind, setKind] = useState<JlKind>('order');
  const [filterKey, setFilterKey] = useState('todo');
  const [open, setOpen] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  const filters = kind === 'order' ? ORDER_FILTERS : SAMPLE_FILTERS;
  const filter = filters.find((f) => f.key === filterKey) ?? filters[0];
  const overview = useApi<JlOverview>('/jl/overview');
  const listPath =
    kind === 'order'
      ? `/jl/orders?${filter.statuses.length ? `status=${filter.statuses.join(',')}&` : ''}${showTest ? 'test=1' : ''}`
      : `/jl/samples${filter.statuses.length ? `?status=${filter.statuses.join(',')}` : ''}`;
  const list = useApi<{ orders?: JlOrder[]; samples?: JlSample[] }>(listPath);

  const counts = kind === 'order' ? overview.data?.orders : overview.data?.samples;
  const todoOrders = sum(overview.data?.orders, ORDER_FILTERS[0].statuses);
  const todoSamples = sum(overview.data?.samples, SAMPLE_FILTERS[0].statuses);

  const refreshAll = () => {
    void overview.reload();
    void list.reload();
  };

  const rows = kind === 'order' ? list.data?.orders ?? [] : list.data?.samples ?? [];

  return (
    <>
      <Screen padTop={false} refreshing={list.refreshing} onRefresh={() => { void overview.reload(); void list.refresh(); }}>
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            setFilterKey('todo');
          }}
          options={[
            { key: 'order', label: 'Orders', count: todoOrders || null, alert: Boolean(overview.data?.orders?.problem) },
            { key: 'sample', label: 'Samples', count: todoSamples || null, alert: Boolean(overview.data?.samples?.problem) },
          ]}
        />
        <ChipRow>
          {filters.map((f) => {
            const n = f.statuses.length ? sum(counts, f.statuses) : null;
            return <Chip key={f.key} text={n ? `${f.label} (${n})` : f.label} selected={filter.key === f.key} onPress={() => setFilterKey(f.key)} />;
          })}
          {kind === 'order' && overview.data?.testOrders ? (
            <Chip text={showTest ? '🧪 Test orders shown' : `🧪 Test (${overview.data.testOrders})`} selected={showTest} onPress={() => setShowTest((s) => !s)} />
          ) : null}
        </ChipRow>

        {overview.error && !overview.data ? <ErrorBox message={overview.error} onRetry={overview.refresh} /> : null}
        {list.loading && !list.data ? <Loading /> : null}
        {list.error && !list.data ? <ErrorBox message={list.error} onRetry={list.refresh} /> : null}
        {list.data && !rows.length ? <Empty text={filter.key === 'todo' ? 'Nothing to do. ✅' : 'Nothing here.'} /> : null}

        {kind === 'order'
          ? (rows as JlOrder[]).map((o) => (
              <Card key={o.id} onPress={() => setOpen(o.id)} tone={o.status === 'problem' ? 'danger' : undefined}>
                <Row>
                  <T variant="heading" style={{ flex: 1 }}>{`${o.orderNumber} · ${o.customerName}`}</T>
                  <T variant="small">{ago(o.createdAt)}</T>
                </Row>
                <T variant="small" numberOfLines={1}>
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                </T>
                <Row wrap>
                  <Pill text={o.statusLabel} tone={STATUS_TONE[o.status] ?? 'muted'} />
                  <T style={{ fontWeight: '700' }}>{money(o.totalCents, o.currency)}</T>
                  <Pill text={customerSource(o).label} tone={customerSource(o).tone} />
                  {o.isTest ? <Pill text="TEST" tone="muted" /> : null}
                  {o.status === 'paid' && !o.supplierEmailedAt ? <Pill text="Not sent to Charlotte" tone="danger" /> : null}
                  {o.status === 'sent_to_supplier' ? <T variant="small" color={p.muted}>Waiting for tracking</T> : null}
                </Row>
              </Card>
            ))
          : (rows as JlSample[]).map((s) => (
              <Card key={s.id} onPress={() => setOpen(s.id)} tone={s.status === 'problem' ? 'danger' : undefined}>
                <Row>
                  <T variant="heading" style={{ flex: 1 }}>{`${s.requestNumber} · ${s.name}`}</T>
                  <T variant="small">{ago(s.createdAt)}</T>
                </Row>
                <T variant="small" numberOfLines={1}>
                  {`${s.items.length} sample${s.items.length === 1 ? '' : 's'}: ${s.items.map((i) => i.name).join(', ')}`}
                </T>
                <Row wrap>
                  <Pill text={s.statusLabel} tone={STATUS_TONE[s.status] ?? 'muted'} />
                  {s.confirmedAt ? <Pill text="✅ Confirmed · emailed" tone="ok" /> : null}
                  <T variant="small">{`${s.address.city}, ${s.address.state}`}</T>
                </Row>
              </Card>
            ))}
      </Screen>

      {open ? <JlSheet kind={kind} id={open} meta={overview.data} visible onClose={() => setOpen(null)} onChanged={refreshAll} /> : null}
    </>
  );
}
