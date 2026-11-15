import { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { openWhatsApp } from '@/lib/whatsapp';
import { ago } from '@/lib/format';
import { radius, space, usePalette } from '@/lib/theme';
import type { AdsHealth, AdsOverview, CompetitorFinding, CompetitorRow, GoogleAdsCard, MetaAdsCard, SocialClient, StoppedAd } from '@/lib/types';

import { Back, BottomSheet, Note } from './sheet';
import { Button, Card, Pill, Row, T } from './ui';

// Pieces of the Marketing page: ads cards with a running/limited/stopped flag, a client's campaigns
// pop-up, followers per client, competitors with their latest moves.

export const fmtMoney = (n: number | undefined, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: (n ?? 0) >= 100 ? 0 : 2 }).format(n ?? 0);
const fmtNum = (n: number | undefined) => (n ?? 0).toLocaleString('en-CA');
const compact = (n: number | undefined) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);
const signed = (n: number | undefined | null) => (n ? `${n > 0 ? '+' : ''}${n.toLocaleString('en-CA')}` : '0');

/** ▲12% / ▼8% against the period before. */
function Change({ now, before, invert }: { now?: number; before?: number; invert?: boolean }) {
  const p = usePalette();
  if (!before || now === undefined) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (!pct) return null;
  const good = invert ? pct < 0 : pct > 0;
  return <Text style={{ color: good ? p.ok : p.danger, fontSize: 12, fontWeight: '700' }}>{`${pct > 0 ? '▲' : '▼'}${Math.abs(pct)}%`}</Text>;
}

const HEALTH: Record<AdsHealth['state'], { text: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  running: { text: '🟢 Running', tone: 'ok' },
  limited: { text: '🟠 Limited', tone: 'warn' },
  stopped: { text: '🔴 Stopped', tone: 'danger' },
  idle: { text: '⚪ Not running this week', tone: 'muted' },
  error: { text: '⚠️ Can’t check', tone: 'muted' },
};

export function HealthPill({ health }: { health: AdsHealth | null }) {
  if (!health) return <Pill text="⏳ Not checked yet" tone="muted" />;
  const h = HEALTH[health.state];
  return <Pill text={h.text} tone={h.tone} />;
}

function Metric({ label, value, change }: { label: string; value: string; change?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ flexBasis: '47%', flexGrow: 1, gap: 2 }}>
      <Text style={{ color: p.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <Row gap={6}>
        <Text style={{ color: p.text, fontSize: 17, fontWeight: '800' }}>{value}</Text>
        {change}
      </Row>
    </View>
  );
}

function PlatformBlock({ title, health, error, children }: { title: string; health: AdsHealth | null; error: string | null; children?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: p.border }}>
      <Row>
        <T variant="heading" style={{ flex: 1 }}>
          {title}
        </T>
        <HealthPill health={health} />
      </Row>
      {health && (health.state === 'stopped' || health.state === 'limited') ? (
        <T variant="small" color={health.state === 'stopped' ? p.danger : p.warn}>{`${health.reason}${health.state === 'stopped' ? ` · since ${ago(health.since)}` : ''}`}</T>
      ) : null}
      {error ? <T variant="small" color={p.danger}>{`⚠️ ${error}`}</T> : null}
      {children}
    </View>
  );
}

/** One client's ads card: Google and Meta side by side with the flag. */
export function AdsClientCard({ c, onOpen }: { c: AdsOverview['clients'][number]; onOpen: () => void }) {
  const g = c.google as GoogleAdsCard | null;
  const m = c.meta as MetaAdsCard | null;
  const stopped = g?.health?.state === 'stopped' || m?.health?.state === 'stopped';
  return (
    <Card onPress={onOpen} tone={stopped ? 'danger' : undefined}>
      <T variant="title">{c.clientName}</T>
      {g ? (
        <PlatformBlock title="🔵 Google Ads" health={g.health} error={g.error}>
          {g.spend !== undefined ? (
            <Row wrap gap={space.md}>
              <Metric label="Spend" value={fmtMoney(g.spend, g.currency)} change={<Change now={g.spend} before={g.prev?.spend} />} />
              <Metric label="Clicks" value={fmtNum(g.clicks)} change={<Change now={g.clicks} before={g.prev?.clicks} />} />
              <Metric label="Impressions" value={compact(g.impressions)} change={<Change now={g.impressions} before={g.prev?.impressions} />} />
              <Metric label={g.conversions ? 'Conversions' : 'CTR'} value={g.conversions ? `${Math.round(g.conversions * 10) / 10}` : `${(g.ctr ?? 0).toFixed(1)}%`} change={g.conversions ? <Change now={g.conversions} before={g.prev?.conversions} /> : undefined} />
            </Row>
          ) : null}
        </PlatformBlock>
      ) : null}
      {m ? (
        <PlatformBlock title="📘 Facebook & Instagram" health={m.health} error={m.error}>
          {m.spend !== undefined ? (
            <Row wrap gap={space.md}>
              <Metric label="Spend" value={fmtMoney(m.spend, m.currency)} change={<Change now={m.spend} before={m.prev?.spend} />} />
              <Metric label="Reach" value={compact(m.reach)} change={<Change now={m.reach} before={m.prev?.reach} />} />
              <Metric label="Link clicks" value={fmtNum(m.linkClicks)} change={<Change now={m.linkClicks} before={m.prev?.linkClicks} />} />
              <Metric label="CTR" value={`${(m.ctr ?? 0).toFixed(1)}%`} />
            </Row>
          ) : null}
        </PlatformBlock>
      ) : null}
    </Card>
  );
}

interface ClientAdsDetail {
  google: { currency?: string; campaigns?: { name: string; status: string; spend: number; clicks: number; conversions: number }[]; keywords?: { text: string; clicks: number }[]; health: AdsHealth | null; error: string | null } | null;
  meta: { currency?: string; ads?: { name: string; status: string; active: boolean; spend: number; reach: number; clicks: number; linkClicks: number }[]; health: AdsHealth | null; error: string | null } | null;
}

/** Campaigns (Google) and ads (Meta) of one client, with their status. */
/** A short results message for the client (WhatsApp), from the card's numbers. */
export function adsWhatsAppText(c: AdsOverview['clients'][number], days: number) {
  const lines = [`📊 *${c.clientName}: ads results, last ${days} days*`];
  const g = c.google as GoogleAdsCard | null;
  const m = c.meta as MetaAdsCard | null;
  if (g && g.spend !== undefined) {
    lines.push('', '🔵 Google Ads', `• ${fmtNum(g.impressions)} impressions · ${fmtNum(g.clicks)} clicks`, `• Spend: ${fmtMoney(g.spend, g.currency)}`);
    if (g.conversions) lines.push(`• ${Math.round(g.conversions * 10) / 10} conversions`);
  }
  if (m && m.spend !== undefined) {
    lines.push('', '📘 Facebook & Instagram', `• Reached ${fmtNum(m.reach)} people · ${fmtNum(m.linkClicks)} link clicks`, `• Spend: ${fmtMoney(m.spend, m.currency)}`);
  }
  lines.push('', 'North Via Marketing');
  return lines.join('\n');
}

export function AdsClientSheet({ clientId, clientName, days, onClose, shareText }: { clientId: string; clientName: string; days: number; onClose: () => void; shareText?: string }) {
  const p = usePalette();
  const [data, setData] = useState<ClientAdsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api<ClientAdsDetail>(`/marketing/ads/${clientId}?days=${days}`, { timeoutMs: 60_000 })
      .then((r) => live && setData(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [clientId, days]);
  return (
    <BottomSheet visible onClose={onClose}>
      <T variant="title">{`${clientName} · last ${days} days`}</T>
      {shareText ? <Button title="📲 Send results to the client on WhatsApp" small kind="soft" tone="ok" onPress={() => void openWhatsApp(shareText)} /> : null}
      {error ? <Note text={error} tone="danger" /> : null}
      {!data && !error ? <T variant="small">Loading campaigns…</T> : null}
      {data?.google ? (
        <Card>
          <Row>
            <T variant="heading" style={{ flex: 1 }}>
              🔵 Google campaigns
            </T>
            <HealthPill health={data.google.health} />
          </Row>
          {data.google.error ? <T variant="small" color={p.danger}>{data.google.error}</T> : null}
          {(data.google.campaigns || []).map((c) => (
            <Row key={c.name} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '600' }} numberOfLines={2}>
                  {c.name}
                </T>
                <T variant="small">{`${c.clicks} clicks${c.conversions ? ` · ${Math.round(c.conversions * 10) / 10} conv.` : ''}`}</T>
              </View>
              <T style={{ fontWeight: '700' }}>{fmtMoney(c.spend, data.google!.currency)}</T>
            </Row>
          ))}
          {data.google.keywords?.length ? (
            <>
              <T variant="label">Top keywords</T>
              <T variant="small">{data.google.keywords.map((k) => `${k.text} (${k.clicks})`).join(' · ')}</T>
            </>
          ) : null}
        </Card>
      ) : null}
      {data?.meta ? (
        <Card>
          <Row>
            <T variant="heading" style={{ flex: 1 }}>
              📘 Meta ads
            </T>
            <HealthPill health={data.meta.health} />
          </Row>
          {data.meta.error ? <T variant="small" color={p.danger}>{data.meta.error}</T> : null}
          {(data.meta.ads || []).map((a, i) => (
            <Row key={`${a.name}-${i}`} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '600' }} numberOfLines={2}>
                  {a.name}
                </T>
                <T variant="small" color={a.active ? p.ok : p.warn}>{`${a.status || '—'} · reach ${compact(a.reach)} · ${a.linkClicks} link clicks`}</T>
              </View>
              <T style={{ fontWeight: '700' }}>{fmtMoney(a.spend, data.meta!.currency)}</T>
            </Row>
          ))}
        </Card>
      ) : null}
      <Back onPress={onClose} label="Close" />
    </BottomSheet>
  );
}

/** Red banner: ads stopped right now (Home and Marketing). */
export function StoppedAdsBanner({ stopped, onPress }: { stopped: StoppedAd[]; onPress?: () => void }) {
  const p = usePalette();
  if (!stopped.length) return null;
  return (
    <Card tone="danger" onPress={onPress} style={{ backgroundColor: p.dangerSoft }}>
      <T variant="heading" color={p.danger}>{`⛔ Ads stopped (${stopped.length})`}</T>
      {stopped.map((s) => (
        <T key={`${s.clientId}-${s.platform}`} variant="small" color={p.text}>
          {`${s.clientName} · ${s.platform === 'google' ? 'Google' : 'Meta'}: ${s.reason}`}
        </T>
      ))}
    </Card>
  );
}

/** Followers per client with today's and this week's change. */
export function SocialClientCard({ s }: { s: SocialClient }) {
  const p = usePalette();
  const line = (icon: string, label: string, f: SocialClient['facebook']) =>
    f ? (
      <Row>
        <T style={{ flex: 1 }}>{`${icon} ${label}`}</T>
        <T style={{ fontWeight: '800' }}>{compact(f.followers)}</T>
        <Text style={{ color: (f.day ?? 0) < 0 ? p.danger : p.ok, fontWeight: '700', fontSize: 13, minWidth: 56, textAlign: 'right' }}>{`${signed(f.day)} today`}</Text>
        <Text style={{ color: (f.week ?? 0) < 0 ? p.danger : p.ok, fontWeight: '700', fontSize: 13, minWidth: 70, textAlign: 'right' }}>{`${signed(f.week)} week`}</Text>
      </Row>
    ) : null;
  const losing = (s.facebook?.week ?? 0) < 0 || (s.instagram?.week ?? 0) < 0;
  return (
    <Card tone={losing ? 'danger' : undefined}>
      <T variant="heading">{s.clientName}</T>
      {line('📘', 'Facebook', s.facebook)}
      {line('📸', s.pages.find((x) => x.instagram)?.instagram ? `@${s.pages.find((x) => x.instagram)!.instagram}` : 'Instagram', s.instagram)}
      {s.waitingComments ? <Pill text={`💬 ${s.waitingComments} comments waiting`} tone="warn" /> : null}
      {s.pages.some((x) => x.error) ? <T variant="small" color={p.danger}>{`⚠️ ${s.pages.find((x) => x.error)!.error}`}</T> : null}
    </Card>
  );
}

const KIND: Record<string, string> = { offer: '🏷 Offer', new_product: '🆕 New product', event: '📅 Event', giveaway: '🎁 Giveaway', post: '📸 Post', website_change: '🌐 Website', rating: '⭐ Rating', review: '💬 Review', followers: '👥 Followers' };

/** A competitor with Instagram and Google numbers, last checks, and buttons. */
export function CompetitorCard({ c, onChecked }: { c: CompetitorRow; onChecked: () => void }) {
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    try {
      const r = await api<{ findings: number }>('/marketing/competitors', { body: { action: 'check', id: c.id }, timeoutMs: 60_000 });
      Alert.alert('Checked', r.findings ? `${r.findings} new finding(s)` : 'Nothing new.');
      onChecked();
    } catch (e) {
      Alert.alert('Not checked', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const lastCheck = [c.status.ig?.checkedAt, c.status.web?.checkedAt, c.status.google?.checkedAt].filter(Boolean).sort().pop();
  return (
    <Card>
      <T variant="heading">{c.name}</T>
      <Row wrap gap={space.md}>
        {c.instagramGrowth ? (
          <Metric label="📸 Instagram" value={compact(c.instagramGrowth.followers)} change={c.instagramGrowth.gained7 !== null ? <Text style={{ color: (c.instagramGrowth.gained7 ?? 0) < 0 ? p.danger : p.ok, fontWeight: '700', fontSize: 12 }}>{`${signed(c.instagramGrowth.gained7)} / 7d`}</Text> : undefined} />
        ) : null}
        {c.googleGrowth?.rating ? (
          <Metric label="⭐ Google" value={`${c.googleGrowth.rating.toFixed(1)} (${fmtNum(c.googleGrowth.count)})`} change={c.googleGrowth.gained7 ? <Text style={{ color: p.ok, fontWeight: '700', fontSize: 12 }}>{`${signed(c.googleGrowth.gained7)} / 7d`}</Text> : undefined} />
        ) : null}
      </Row>
      {c.notes ? <T variant="small">{c.notes}</T> : null}
      <T variant="small">{lastCheck ? `Last checked ${ago(lastCheck)} ago` : 'Not checked yet'}</T>
      {[c.status.ig?.error, c.status.web?.error, c.status.google?.error].filter(Boolean).slice(0, 1).map((e) => (
        <T key={e} variant="small" color={p.danger}>{`⚠️ ${e}`}</T>
      ))}
      <Row>
        <Button title="🔄 Check now" small kind="soft" style={{ flex: 1 }} busy={busy} onPress={check} />
        <Button title="📘 Their ads" small kind="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(c.adsUrl)} />
      </Row>
      <Row>
        {c.instagram ? <Button title="📸 Instagram" small kind="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://instagram.com/${c.instagram}`)} /> : null}
        {c.website ? <Button title="🌐 Website" small kind="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(c.website!)} /> : null}
      </Row>
    </Card>
  );
}

export function FindingCard({ f }: { f: CompetitorFinding }) {
  const p = usePalette();
  return (
    <Card onPress={f.url ? () => Linking.openURL(f.url!) : undefined}>
      <Row>
        <Pill text={KIND[f.kind] || f.kind} tone={f.kind === 'offer' || f.kind === 'giveaway' ? 'warn' : 'brand'} />
        <T variant="small" style={{ flex: 1, textAlign: 'right' }}>{`${f.competitorName} · ${ago(f.at)}`}</T>
      </Row>
      <T style={{ fontWeight: '700' }}>{f.title}</T>
      {f.detail ? (
        <T variant="small" numberOfLines={4}>
          {f.detail}
        </T>
      ) : null}
      {f.idea ? (
        <View style={{ backgroundColor: p.brandSoft, borderRadius: radius.sm, padding: space.sm }}>
          <T variant="small" color={p.brand} style={{ fontWeight: '700' }}>{`💡 ${f.idea}`}</T>
        </View>
      ) : null}
      <Button
        title="📲 Share on WhatsApp"
        small
        kind="soft"
        tone="ok"
        onPress={() =>
          void openWhatsApp(
            [`👀 *${f.competitorName}*: ${f.title}`, f.detail ? `\n${f.detail.slice(0, 800)}` : '', f.idea ? `\n💡 Idea: ${f.idea}` : '', f.url ? `\n${f.url}` : ''].filter(Boolean).join('\n')
          )
        }
      />
    </Card>
  );
}

