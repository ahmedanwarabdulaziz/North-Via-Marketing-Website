import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Button, Card, Chip, ChipRow, ErrorBox, Input, Loading, Row, Screen, Section, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import {
  SHOW_LABELS,
  STATUS_LABELS,
  computeTotals,
  itemMargin,
  lineTotal,
  money,
  newItem,
  newTerm,
  type DocItem,
  type DocKind,
  type DocShow,
  type DocStatus,
  type SalesDoc,
} from '@/lib/quotes';
import { usePalette } from '@/lib/theme';

/** A number box that lets you type "12." and "" without the value jumping around. */
function NumInput({ value, onChange, placeholder, allowEmpty }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; allowEmpty?: boolean }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    if ((text === '' ? undefined : Number(text)) !== value && !(text === '' && value === 0 && !allowEmpty)) setText(value === undefined ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input
      value={text}
      placeholder={placeholder}
      keyboardType="decimal-pad"
      onChangeText={(t) => {
        const clean = t.replace(',', '.');
        if (!/^\d*\.?\d*$/.test(clean)) return;
        setText(clean);
        onChange(clean === '' ? (allowEmpty ? undefined : 0) : Number(clean));
      }}
      style={{ minHeight: 44, paddingVertical: 8 }}
    />
  );
}

function Labeled({ label, children, flex = 1 }: { label: string; children: React.ReactNode; flex?: number }) {
  return (
    <View style={{ flex, gap: 4 }}>
      <T variant="small">{label}</T>
      {children}
    </View>
  );
}

export default function QuoteEditor() {
  const params = useLocalSearchParams<{ id: string; kind?: string; from?: string }>();
  const id = String(params.id);
  const p = usePalette();
  const [doc, setDoc] = useState<SalesDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'save' | 'preview' | 'invoice'>('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let live = true;
    const qs = id === 'new' ? `?kind=${params.kind === 'invoice' ? 'invoice' : 'quote'}${params.from ? `&from=${params.from}` : ''}` : '';
    api<{ doc: SalesDoc }>(`/quotes/${id}${qs}`)
      .then((r) => live && setDoc(r.doc))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [id, params.kind, params.from]);

  if (error) return <ErrorBox message={error} />;
  if (!doc) return <Loading />;

  const set = <K extends keyof SalesDoc>(key: K, value: SalesDoc[K]) => {
    setDoc({ ...doc, [key]: value });
    setDirty(true);
  };
  const setItem = (itemId: string, patch: Partial<DocItem>) => set('items', doc.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  const totals = computeTotals(doc);
  const isQuote = doc.kind === 'quote';
  const isNew = !doc.id;

  const save = async (): Promise<SalesDoc | null> => {
    if (!doc.clientName.trim()) {
      Alert.alert('Client name', 'Write the client’s name first.');
      return null;
    }
    setBusy('save');
    try {
      const r = await api<{ doc: SalesDoc }>('/quotes', { body: doc });
      setDoc(r.doc);
      setDirty(false);
      if (isNew) router.replace(`/quote/${r.doc.id}` as Href);
      return r.doc;
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy('');
    }
  };

  // The preview is the website's page (PDF, WhatsApp, email, print), opened with a signed link.
  const preview = async () => {
    setBusy('preview');
    try {
      const saved = dirty || isNew ? await save() : doc;
      if (!saved) return;
      const r = await api<{ link: string | null }>(`/quotes/${saved.id}`);
      if (r.link) await WebBrowser.openBrowserAsync(r.link);
    } catch (e) {
      Alert.alert('Could not open', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  const toInvoice = async () => {
    setBusy('invoice');
    try {
      const saved = dirty ? await save() : doc;
      if (saved) router.push(`/quote/new?kind=invoice&from=${saved.id}` as Href);
    } finally {
      setBusy('');
    }
  };

  const remove = () =>
    Alert.alert('Delete this document?', 'It can’t be brought back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void api(`/quotes/${doc.id}`, { body: { action: 'delete' } })
            .then(() => router.replace('/quotes' as Href))
            .catch((e) => Alert.alert('Not deleted', e instanceof Error ? e.message : String(e))),
      },
    ]);

  return (
    <Screen padTop={false}>
      <Row>
        <Button title="Save" onPress={() => void save()} busy={busy === 'save'} kind={dirty || isNew ? 'primary' : 'soft'} style={{ flex: 1 }} />
        <Button title="Preview · PDF · Share" kind="outline" onPress={() => void preview()} busy={busy === 'preview'} style={{ flex: 1.4 }} />
      </Row>

      <Card>
        {isNew ? (
          <Segmented<DocKind>
            value={doc.kind}
            onChange={(k) => set('kind', k)}
            options={[
              { key: 'quote', label: 'Quote' },
              { key: 'invoice', label: 'Invoice' },
            ]}
          />
        ) : null}
        <Row>
          <Labeled label="Number">
            <Input value={doc.number} onChangeText={(v) => set('number', v)} autoCapitalize="characters" autoCorrect={false} />
          </Labeled>
          <Labeled label="Date (YYYY-MM-DD)">
            <Input value={doc.issueDate} onChangeText={(v) => set('issueDate', v)} autoCorrect={false} />
          </Labeled>
        </Row>
        {isQuote ? (
          <Labeled label="Offer valid for (days)">
            <NumInput value={doc.validDays} onChange={(v) => set('validDays', v ?? 0)} />
          </Labeled>
        ) : null}
        <ChipRow>
          {(Object.keys(STATUS_LABELS) as DocStatus[]).map((s) => (
            <Chip key={s} text={STATUS_LABELS[s]} selected={doc.status === s} onPress={() => set('status', s)} />
          ))}
        </ChipRow>
      </Card>

      <Section title="Client">
        <Input value={doc.clientName} onChangeText={(v) => set('clientName', v)} placeholder="Client / company name *" />
        <Input value={doc.clientContact || ''} onChangeText={(v) => set('clientContact', v)} placeholder="Attention (contact person)" />
        <Row>
          <View style={{ flex: 1 }}>
            <Input value={doc.clientPhone || ''} onChangeText={(v) => set('clientPhone', v)} placeholder="Phone" keyboardType="phone-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input value={doc.clientEmail || ''} onChangeText={(v) => set('clientEmail', v)} placeholder="Email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>
        </Row>
        <Input value={doc.clientAddress || ''} onChangeText={(v) => set('clientAddress', v)} placeholder="Address" />
        <Input value={doc.clientTaxId || ''} onChangeText={(v) => set('clientTaxId', v)} placeholder="Client tax number" />
        <Input value={doc.subject || ''} onChangeText={(v) => set('subject', v)} placeholder="Subject" />
      </Section>

      <Section
        title="Items"
        right={
          <Row>
            <T variant="small">Cost &amp; profit</T>
            <Switch value={doc.trackCost} onValueChange={(v) => set('trackCost', v)} />
          </Row>
        }>
        {doc.items.map((item, i) => (
          <Card key={item.id}>
            <Row>
              <T variant="small">{`#${i + 1}`}</T>
              <View style={{ flex: 1 }}>
                <Input value={item.name} onChangeText={(v) => setItem(item.id, { name: v })} placeholder="Item" />
              </View>
              <Button title="✕" small kind="soft" tone="danger" onPress={() => set('items', doc.items.length > 1 ? doc.items.filter((x) => x.id !== item.id) : [newItem()])} />
            </Row>
            <Row>
              <Labeled label="Unit" flex={1}>
                <Input value={item.unit || ''} onChangeText={(v) => setItem(item.id, { unit: v })} style={{ minHeight: 44, paddingVertical: 8 }} />
              </Labeled>
              <Labeled label="Qty" flex={1}>
                <NumInput value={item.qty} onChange={(v) => setItem(item.id, { qty: v ?? 0 })} />
              </Labeled>
              {doc.trackCost ? (
                <Labeled label="Cost" flex={1.2}>
                  <NumInput value={item.cost} allowEmpty onChange={(v) => setItem(item.id, { cost: v })} />
                </Labeled>
              ) : null}
              <Labeled label="Price" flex={1.2}>
                <NumInput value={item.price} onChange={(v) => setItem(item.id, { price: v ?? 0 })} />
              </Labeled>
            </Row>
            <Row>
              <T variant="small" style={{ flex: 1 }}>
                {doc.trackCost && item.cost !== undefined ? `Item profit ${money((item.price - item.cost) * item.qty)} (${itemMargin(item)}%)` : ''}
              </T>
              <T variant="heading">{money(lineTotal(item))}</T>
            </Row>
          </Card>
        ))}
        <Button title="＋ Add item" kind="soft" onPress={() => set('items', [...doc.items, newItem()])} />
      </Section>

      <Section title="Totals">
        <Card>
          <Row>
            <Labeled label={doc.discountIsPercent ? 'Discount %' : 'Discount'}>
              <NumInput value={doc.discount} onChange={(v) => set('discount', v ?? 0)} />
            </Labeled>
            <Labeled label="VAT %">
              <NumInput value={doc.vatPercent} onChange={(v) => set('vatPercent', v ?? 0)} />
            </Labeled>
          </Row>
          <Row>
            <Chip text="Discount in %" selected={doc.discountIsPercent} onPress={() => set('discountIsPercent', !doc.discountIsPercent)} />
            <View style={{ flex: 1 }}>
              <Input value={doc.currency} onChangeText={(v) => set('currency', v)} placeholder="Currency" />
            </View>
          </Row>
          <Row>
            <T style={{ flex: 1 }}>Sum</T>
            <T>{money(totals.subtotal)}</T>
          </Row>
          {totals.discount > 0 ? (
            <Row>
              <T style={{ flex: 1 }}>Discount</T>
              <T>{`- ${money(totals.discount)}`}</T>
            </Row>
          ) : null}
          {doc.vatPercent > 0 ? (
            <Row>
              <T style={{ flex: 1 }}>{`VAT ${doc.vatPercent}%`}</T>
              <T>{money(totals.vat)}</T>
            </Row>
          ) : null}
          <Row>
            <T variant="heading" style={{ flex: 1 }}>
              Total
            </T>
            <T variant="title">{money(totals.total)}</T>
          </Row>
        </Card>
        {doc.trackCost ? (
          <Card tone={totals.profit >= 0 ? 'ok' : 'danger'}>
            <T variant="label">Profit (private, never printed)</T>
            <Row>
              <T style={{ flex: 1 }}>Cost</T>
              <T>{money(totals.cost)}</T>
            </Row>
            <Row>
              <T style={{ flex: 1, fontWeight: '700' }}>Net profit</T>
              <T style={{ fontWeight: '700' }}>{money(totals.profit)}</T>
            </Row>
            <Row>
              <T style={{ flex: 1, fontWeight: '700' }}>Margin on price</T>
              <T style={{ fontWeight: '700' }}>{`${totals.margin}%`}</T>
            </Row>
            <Row>
              <T style={{ flex: 1 }}>Mark-up on cost</T>
              <T>{`${totals.markup}%`}</T>
            </Row>
          </Card>
        ) : null}
      </Section>

      <Section title="Terms & conditions" right={<Button title="＋ Term" small kind="soft" onPress={() => set('terms', [...doc.terms, newTerm()])} />}>
        {doc.terms.map((term) => (
          <Row key={term.id} style={{ alignItems: 'flex-start' }}>
            <Switch value={term.on} onValueChange={(v) => set('terms', doc.terms.map((t) => (t.id === term.id ? { ...t, on: v } : t)))} />
            <View style={{ flex: 1 }}>
              <Input
                value={term.text}
                multiline
                onChangeText={(v) => set('terms', doc.terms.map((t) => (t.id === term.id ? { ...t, text: v } : t)))}
                style={{ minHeight: 44, opacity: term.on ? 1 : 0.5 }}
              />
            </View>
            <Button title="✕" small kind="soft" tone="danger" onPress={() => set('terms', doc.terms.filter((t) => t.id !== term.id))} />
          </Row>
        ))}
        {!doc.terms.length ? <T variant="small">No terms. Tap “＋ Term”. Only the switched-on ones are printed.</T> : null}
      </Section>

      <Section title="Signature">
        <Input value={doc.signerName || ''} onChangeText={(v) => set('signerName', v)} placeholder="Signer’s name (printed like a handwritten signature)" />
      </Section>

      <Section title="What the printed copy shows">
        <Card>
          {(Object.keys(SHOW_LABELS) as (keyof DocShow)[])
            .filter((k) => (isQuote || k !== 'validity') && (doc.show.totals || !['amountInWords', 'discount', 'vat'].includes(k)))
            .map((k) => (
              <Row key={k}>
                <T style={{ flex: 1 }}>{SHOW_LABELS[k]}</T>
                <Switch value={doc.show[k]} onValueChange={(v) => set('show', { ...doc.show, [k]: v })} trackColor={{ true: p.brand }} />
              </Row>
            ))}
          <T variant="small">Cost and profit are never printed.</T>
        </Card>
      </Section>

      <Section title="Private notes">
        <Input value={doc.notes || ''} onChangeText={(v) => set('notes', v)} multiline placeholder="Never printed" />
      </Section>

      {!isNew && isQuote ? <Button title="Make an invoice from this quote" kind="soft" onPress={() => void toInvoice()} busy={busy === 'invoice'} /> : null}
      {!isNew ? <Button title="Delete" kind="outline" tone="danger" onPress={remove} /> : null}
    </Screen>
  );
}
