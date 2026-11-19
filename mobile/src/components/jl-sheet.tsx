import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { api } from '@/lib/api';
import { openWhatsApp } from '@/lib/whatsapp';
import { dateTime } from '@/lib/format';
import { radius, space, usePalette } from '@/lib/theme';
import type { JlEvent, JlOrder, JlOverview, JlSample } from '@/lib/types';

import { Back, BottomSheet, Choice, Grid, Note, Tile } from './sheet';
import { Card, Input, Pill, Row, T } from './ui';

// One JL Comfort order or sample request: details, history, and the same buttons as the JL Comfort
// admin panel. Every email (Charlotte, customer, jl@) is sent by JL Comfort itself.

export type JlKind = 'order' | 'sample';
type Panel = 'main' | 'ship' | 'refs' | 'status';

export const money = (cents: number, currency = 'cad') =>
  `${(cents / 100).toLocaleString('en-CA', { style: 'currency', currency: currency.toUpperCase() })}`;

export const STATUS_TONE: Record<string, 'brand' | 'danger' | 'warn' | 'ok' | 'muted'> = {
  paid: 'warn',
  pending: 'warn',
  sent_to_supplier: 'brand',
  supplier_confirmed: 'brand',
  shipped: 'brand',
  delivered: 'ok',
  closed: 'ok',
  cancelled: 'muted',
  problem: 'danger',
};

const ORDER_STATUSES = ['paid', 'sent_to_supplier', 'shipped', 'delivered', 'closed', 'problem', 'cancelled'];
const SAMPLE_STATUSES = ['pending', 'sent_to_supplier', 'supplier_confirmed', 'shipped', 'delivered', 'problem', 'cancelled'];

export function JlSheet({
  kind,
  id,
  meta,
  visible,
  onClose,
  onChanged,
}: {
  kind: JlKind;
  id: string;
  meta: JlOverview | null;
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const p = usePalette();
  const [record, setRecord] = useState<JlOrder | JlSample | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('main');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'danger' } | null>(null);
  const [changed, setChanged] = useState(false);
  // Form fields
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const path = `/jl/${kind === 'order' ? 'orders' : 'samples'}/${id}`;

  useEffect(() => {
    if (!visible) return;
    let live = true;
    api<{ order?: JlOrder; sample?: JlSample }>(path)
      .then((r) => {
        if (!live) return;
        const rec = (r.order ?? r.sample)!;
        setRecord(rec);
        setOrderRef(rec.supplierOrderNumber || '');
        setInvoiceRef(rec.supplierInvoiceNumber || '');
      })
      .catch((e) => live && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [visible, path]);

  const close = () => {
    setPanel('main');
    setNote(null);
    if (changed) {
      setChanged(false);
      onChanged();
    }
    onClose();
  };

  const act = async (key: string, body: Record<string, unknown>, done: string) => {
    setBusy(key);
    setNote(null);
    try {
      const r = await api<{ ok: boolean; order?: JlOrder; sample?: JlSample }>(path, { body, timeoutMs: 60_000 });
      setRecord((r.order ?? r.sample) || record);
      setChanged(true);
      setPanel('main');
      setNote(r.ok ? { text: done, tone: 'ok' } : { text: 'Saved, but an email failed to send. See the history below.', tone: 'danger' });
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : String(e), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const confirmSend = (key: string, title: string, message: string, body: Record<string, unknown>, done: string) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => void act(key, body, done) },
    ]);

  if (!record) {
    return (
      <BottomSheet visible={visible} onClose={close}>
        {loadError ? <Note text={loadError} tone="danger" /> : <T variant="small">Loading…</T>}
        <Back onPress={close} label="Close" />
      </BottomSheet>
    );
  }

  const order = kind === 'order' ? (record as JlOrder) : null;
  const sample = kind === 'sample' ? (record as JlSample) : null;
  const number = order ? order.orderNumber : sample!.requestNumber;
  const name = order ? order.customerName : sample!.name;
  const email = order ? order.customerEmail : sample!.email;
  const phone = order ? order.customerPhone : sample!.phone;
  const address = order
    ? [order.shipLine1, order.shipLine2, `${order.shipCity}, ${order.shipRegion} ${order.shipPostalCode}`, order.shipCountry]
    : [sample!.address.line1, sample!.address.line2, `${sample!.address.city}, ${sample!.address.state} ${sample!.address.zip}`, sample!.address.country];
  const shipped = ['shipped', 'delivered', 'closed'].includes(record.status);
  const closed = ['delivered', 'closed', 'cancelled'].includes(record.status);
  const events: JlEvent[] = record.events ?? [];
  const digits = (phone || '').replace(/[^\d+]/g, '');
  const carriers = meta?.carriers ?? [];
  const statusNames = (kind === 'order' ? meta?.orderStatuses : meta?.sampleStatuses) ?? {};

  return (
    <BottomSheet visible={visible} onClose={close}>
      <View style={{ gap: 6 }}>
        <Row>
          <T variant="title" style={{ flex: 1 }}>
            {number}
          </T>
          <Pill text={record.statusLabel} tone={STATUS_TONE[record.status] ?? 'muted'} />
        </Row>
        <T>{name}</T>
        <T variant="small">{`${dateTime(record.createdAt)}${order?.isTest ? ' · TEST order' : ''}`}</T>
        {order ? (
          <Row wrap>
            <Pill text={customerSource(order).label} tone={customerSource(order).tone} />
          </Row>
        ) : null}
        {order ? <T variant="small">{customerSource(order).detail}</T> : null}
        {sample?.confirmedAt ? <Pill text={`✅ Confirmed · customer emailed ${dateTime(sample.confirmedAt)}`} tone="ok" /> : null}
      </View>

      {note ? <Note text={note.text} tone={note.tone} /> : null}

      {panel === 'main' ? (
        <>
          {/* What was ordered */}
          <Card>
            {order ? (
              <>
                {order.items.map((i) => (
                  <Row key={i.id} style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <T style={{ fontWeight: '600' }}>{`${i.quantity} × ${i.name}`}</T>
                      {i.description ? <T variant="small">{i.description}</T> : null}
                      <T variant="small">{`${i.sku ? `${i.sku} · ` : ''}${i.fulfilledBy === 'supplier' ? 'Charlotte' : 'Workshop'}`}</T>
                    </View>
                    <T>{money(i.amountCents, order.currency)}</T>
                  </Row>
                ))}
                <View style={{ height: 1, backgroundColor: p.border }} />
                <T variant="small">{`Subtotal ${money(order.subtotalCents, order.currency)} · Shipping ${money(order.shippingCents, order.currency)} · Tax ${money(order.taxCents, order.currency)}${order.discountCents ? ` · ${order.discountLabel || 'Discount'} −${money(order.discountCents, order.currency)}` : ''}`}</T>
                <T variant="heading">{`Total ${money(order.totalCents, order.currency)}`}</T>
              </>
            ) : (
              <Row wrap style={{ gap: space.sm }}>
                {sample!.items.map((i) => (
                  <View key={i.fabricId + i.sku} style={{ width: 92, gap: 4 }}>
                    {i.imageUrl ? <Image source={{ uri: i.imageUrl }} style={{ width: 92, height: 92, borderRadius: radius.sm, backgroundColor: p.border }} contentFit="cover" /> : null}
                    <T variant="small" numberOfLines={2}>
                      {i.name}
                    </T>
                  </View>
                ))}
              </Row>
            )}
          </Card>

          {/* Customer */}
          <Card>
            <T variant="label">Customer</T>
            <T selectable>{[email, phone].filter(Boolean).join(' · ')}</T>
            <T variant="small" selectable>
              {address.filter(Boolean).join('\n')}
            </T>
            <Row>
              {digits ? <Tile icon="📞" label="Call" onPress={() => Linking.openURL(`tel:${digits}`)} /> : null}
              <Tile icon="💬" label={digits ? 'WhatsApp update' : 'WhatsApp (pick chat)'} tone="ok" onPress={() => void openWhatsApp(jlCustomerText(record, kind, carriers), phone)} />
              <Tile icon="✉️" label="Email" onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(`JL Comfort ${number}`)}`)} />
            </Row>
          </Card>

          {/* Charlotte + shipping */}
          <Card>
            <T variant="label">Charlotte & shipping</T>
            <T variant="small">{`Sent to Charlotte: ${record.supplierEmailedAt ? dateTime(record.supplierEmailedAt) : 'not yet'}`}</T>
            <T variant="small">{`Charlotte order #: ${record.supplierOrderNumber || '–'} · Invoice #: ${record.supplierInvoiceNumber || '–'}`}</T>
            {record.trackingNumber ? (
              <Row>
                <T variant="small" style={{ flex: 1 }}>{`🚚 ${carriers.find((c) => c.id === record.carrier)?.name || record.carrier || ''} ${record.trackingNumber}`}</T>
                {record.trackingUrl ? <Back onPress={() => Linking.openURL(record.trackingUrl!)} label="Track ›" /> : null}
              </Row>
            ) : null}
          </Card>

          {/* Actions */}
          {!closed ? (
            <Row>
              <Tile
                icon="📦"
                label={record.supplierEmailedAt ? 'Resend to Charlotte' : 'Send to Charlotte'}
                busy={busy === 'supplier'}
                onPress={() =>
                  confirmSend(
                    'supplier',
                    record.supplierEmailedAt ? 'Resend to Charlotte?' : 'Send to Charlotte?',
                    kind === 'order' ? 'The purchase order is emailed to Charlotte again.' : 'The sample request is emailed to Charlotte again.',
                    { action: kind === 'order' ? 'resend_supplier_po' : 'resend_supplier' },
                    '📦 Sent to Charlotte'
                  )
                }
              />
              <Tile icon="🔢" label="Charlotte numbers" onPress={() => setPanel('refs')} />
            </Row>
          ) : null}
          {sample && !closed ? (
            <Tile
              icon="✅"
              label={sample.confirmedAt ? `Confirmed · emailed ${dateTime(sample.confirmedAt)} (send again?)` : 'Charlotte confirmed (email the customer)'}
              tone="ok"
              wide
              busy={busy === 'confirmed'}
              onPress={() =>
                sample.confirmedAt
                  ? confirmSend(
                      'confirmed',
                      'Already sent',
                      `${name} already got the “your samples are confirmed” email on ${dateTime(sample.confirmedAt)}. Send it again?`,
                      { action: 'supplier_confirmed' },
                      '✅ Sent again'
                    )
                  : confirmSend('confirmed', 'Charlotte confirmed?', `${name} gets the “your samples are confirmed” email.`, { action: 'supplier_confirmed' }, '✅ Customer emailed: samples confirmed')
              }
            />
          ) : null}
          {!['cancelled'].includes(record.status) ? (
            <Tile icon="🚚" label={shipped ? 'Change tracking' : 'Mark shipped (emails the customer)'} tone="brand" wide onPress={() => setPanel('ship')} />
          ) : null}
          <Row>
            <Tile
              icon="✉️"
              label="Resend confirmation"
              busy={busy === 'confirmation'}
              onPress={() => confirmSend('confirmation', 'Resend the confirmation?', `To ${email}`, { action: 'resend_confirmation' }, '✉️ Confirmation sent')}
            />
            {shipped ? (
              <Tile
                icon="📬"
                label="Resend shipped email"
                busy={busy === 'shippedmail'}
                onPress={() => confirmSend('shippedmail', 'Resend the shipped email?', `To ${email}`, { action: 'resend_shipped' }, '📬 Shipped email sent')}
              />
            ) : null}
            <Tile icon="🏷" label="Status" onPress={() => setPanel('status')} />
          </Row>

          {events.length ? (
            <Card>
              <T variant="label">History</T>
              {events.slice(0, 15).map((e) => (
                <T key={e.id} variant="small">{`${dateTime(e.createdAt)} · ${e.message}`}</T>
              ))}
            </Card>
          ) : null}
          <Back onPress={close} label="Close" />
        </>
      ) : null}

      {panel === 'ship' ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">🚚 Shipping details</T>
          <T variant="small">Carrier</T>
          <Grid>
            {carriers.map((c) => (
              <Choice key={c.id} label={carrier === c.id ? `✓ ${c.name}` : c.name} onPress={() => setCarrier(c.id)} />
            ))}
          </Grid>
          <Input value={tracking} onChangeText={setTracking} placeholder="Tracking number" autoCapitalize="characters" autoCorrect={false} />
          <Input value={trackingUrl} onChangeText={setTrackingUrl} placeholder="Tracking link (only for another carrier)" autoCapitalize="none" keyboardType="url" />
          <Input value={invoiceRef} onChangeText={setInvoiceRef} placeholder="Charlotte invoice # (optional)" autoCapitalize="none" />
          <Tile
            icon="🚚"
            label="Save and email the customer"
            tone="brand"
            wide
            busy={busy === 'ship'}
            disabled={!tracking.trim() || (!carrier && !trackingUrl.trim())}
            onPress={() =>
              act('ship', { action: 'ship', carrier, trackingNumber: tracking.trim(), trackingUrl: trackingUrl.trim() || undefined, supplierInvoiceNumber: invoiceRef.trim() }, `🚚 Marked shipped; ${name} was emailed the tracking`)
            }
          />
          <Back onPress={() => setPanel('main')} />
        </View>
      ) : null}

      {panel === 'refs' ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">🔢 Charlotte numbers</T>
          <T variant="small">From Charlotte’s emails: the order receipt (“Order Reference#”) and the shipped email (“Invoice #”).</T>
          <Input value={orderRef} onChangeText={setOrderRef} placeholder="Order Reference #" autoCapitalize="none" />
          <Input value={invoiceRef} onChangeText={setInvoiceRef} placeholder="Invoice #" autoCapitalize="none" />
          <Tile icon="💾" label="Save" tone="brand" wide busy={busy === 'refs'} onPress={() => act('refs', { action: 'set_supplier_refs', supplierOrderNumber: orderRef, supplierInvoiceNumber: invoiceRef }, '🔢 Saved')} />
          <Back onPress={() => setPanel('main')} />
        </View>
      ) : null}

      {panel === 'status' ? (
        <View style={{ gap: space.sm }}>
          <T variant="heading">🏷 Change status</T>
          <T variant="small">Only changes the status (no email). Add a note for the history if useful.</T>
          <Input value={statusNote} onChangeText={setStatusNote} placeholder="Note (optional), e.g. customer picked up" />
          <Grid>
            {(kind === 'order' ? ORDER_STATUSES : SAMPLE_STATUSES)
              .filter((s) => s !== record.status)
              .map((s) => (
                <Choice
                  key={s}
                  label={statusNames[s] || s}
                  busy={busy === `st-${s}`}
                  onPress={() => act(`st-${s}`, { action: 'set_status', status: s, note: statusNote.trim() || undefined }, `🏷 Now: ${statusNames[s] || s}`)}
                />
              ))}
          </Grid>
          <Back onPress={() => setPanel('main')} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

/** Where an order's customer came from: samples first, emailed first, both, or neither. */
export function customerSource(order: JlOrder): { label: string; tone: 'ok' | 'brand' | 'muted'; detail: string } {
  const samples = order.samplesBefore ?? [];
  const emailed = order.emailedBefore;
  const sampleText = samples.length
    ? `Requested samples first: ${samples.map((s) => `${s.requestNumber} (same ${s.matchedBy})`).join(', ')}`
    : '';
  const how: Record<string, string> = { email: 'same email', name: 'same name, another address', mentioned: 'their email in the message' };
  const emailText = emailed
    ? `Emailed first: ${emailed.count} email${emailed.count === 1 ? '' : 's'} since ${dateTime(emailed.firstAt)} (${emailed.inboxes.join(', ')}; ${(emailed.matchedBy || ['email']).map((m) => how[m] || m).join(', ')})${emailed.subjects?.length ? `: “${emailed.subjects.join('”, “')}”` : ''}`
    : '';
  if (samples.length && emailed) return { label: '🧵✉️ Samples + emailed first', tone: 'ok', detail: `${sampleText}\n${emailText}` };
  if (samples.length) return { label: '🧵 Samples first', tone: 'ok', detail: sampleText };
  if (emailed) return { label: '✉️ Emailed first', tone: 'brand', detail: emailText };
  return { label: '🆕 Direct', tone: 'muted', detail: 'No sample request or email from this customer before the order.' };
}

/** A ready WhatsApp update for the customer: what's happening with their order or samples. */
export function jlCustomerText(record: JlOrder | JlSample, kind: JlKind, carriers: { id: string; name: string }[]) {
  const full = kind === 'order' ? (record as JlOrder).customerName : (record as JlSample).name;
  const first = (full || '').trim().split(/\s+/)[0] || 'there';
  const number = kind === 'order' ? (record as JlOrder).orderNumber : (record as JlSample).requestNumber;
  const what = kind === 'order' ? `your JL Comfort order ${number}` : `your JL Comfort fabric samples (${number})`;
  const carrier = carriers.find((c) => c.id === record.carrier)?.name || record.carrier || '';
  const lines = [`Hi ${first}, this is JL Comfort about ${what}.`];
  switch (record.status) {
    case 'paid':
    case 'pending':
      lines.push(kind === 'order' ? 'We’ve received your order and are preparing it.' : 'We’ve received your request and are preparing your samples.');
      break;
    case 'sent_to_supplier':
    case 'supplier_confirmed':
      lines.push(kind === 'order' ? 'Your fabric has been ordered from our supplier, and we’ll send you tracking as soon as it ships.' : 'Your samples are being prepared, and we’ll send you tracking as soon as they ship.');
      break;
    case 'shipped':
      lines.push(`Good news: it has shipped${carrier ? ` with ${carrier}` : ''}.`);
      if (record.trackingNumber) lines.push(`Tracking number: ${record.trackingNumber}`);
      if (record.trackingUrl) lines.push(`Track it here: ${record.trackingUrl}`);
      break;
    case 'delivered':
    case 'closed':
      lines.push('Our records show it has been delivered. We hope you love it! Let us know if you need anything.');
      break;
    default:
      lines.push('');
  }
  lines.push('', 'Thank you,', 'JL Comfort');
  return lines.join('\n');
}
