import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AdsClientCard,
  AdsClientSheet,
  CompetitorCard,
  FindingCard,
  SocialClientCard,
  StoppedAdsBanner,
} from '@/components/marketing';
import { Button, Chip, ChipRow, Empty, ErrorBox, Loading, Row, Screen, Section, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { AdsOverview, CompetitorFinding, CompetitorRow, SocialClient } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// 📈 Marketing: Google & Meta ads with a running / limited / stopped flag per client (hourly watch),
// Facebook & Instagram followers, and competitors with their latest moves. Same data as the website.

type Tab = 'ads' | 'social' | 'competitors';

interface CompetitorsData {
  clients: { id: string; name: string; count: number }[];
  clientId: string | null;
  own: { followers: number; gained7: number | null } | null;
  competitors: CompetitorRow[];
  findings: CompetitorFinding[];
}

export default function Marketing() {
  const [tab, setTab] = useState<Tab>('ads');
  const [days, setDays] = useState<7 | 30>(7);
  const [openClient, setOpenClient] = useState<{ id: string; name: string } | null>(null);
  const [compClient, setCompClient] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const ads = useApi<AdsOverview>(tab === 'ads' ? `/marketing/ads?days=${days}` : null);
  const social = useApi<{ clients: SocialClient[] }>(tab === 'social' ? '/marketing/social' : null);
  const comp = useApi<CompetitorsData>(tab === 'competitors' ? `/marketing/competitors${compClient ? `?client=${encodeURIComponent(compClient)}` : ''}` : null);
  const current = tab === 'ads' ? ads : tab === 'social' ? social : comp;

  const checkAds = async () => {
    setChecking(true);
    try {
      const r = await api<{ changes?: number; stopped: unknown[] }>('/marketing/ads', { body: { action: 'check' }, timeoutMs: 60_000 });
      Alert.alert('Ads checked', r.stopped.length ? `${r.stopped.length} stopped right now.` : 'All ads are running or limited.');
      void ads.reload();
    } catch (e) {
      Alert.alert('Not checked', e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <Screen padTop={false} refreshing={current.refreshing} onRefresh={current.refresh}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'ads', label: 'Ads', count: ads.data?.stopped.length || null, alert: Boolean(ads.data?.stopped.length) },
            { key: 'social', label: 'Social' },
            { key: 'competitors', label: 'Competitors' },
          ]}
        />

        {current.loading && !current.data ? <Loading /> : null}
        {current.error && !current.data ? <ErrorBox message={current.error} onRetry={current.refresh} /> : null}

        {tab === 'ads' && ads.data ? (
          <>
            <StoppedAdsBanner stopped={ads.data.stopped} />
            <Row>
              <Chip text="Last 7 days" selected={days === 7} onPress={() => setDays(7)} />
              <Chip text="Last 30 days" selected={days === 30} onPress={() => setDays(30)} />
              <Button title="🔄" small kind="soft" busy={checking} onPress={checkAds} style={{ marginLeft: 'auto' }} />
            </Row>
            <T variant="small">{ads.data.checkedAt ? `Ad status checked ${ago(ads.data.checkedAt)} ago (every hour). ▲▼ compare with the ${days} days before.` : 'Ad status is checked every hour.'}</T>
            {ads.data.clients.length ? (
              ads.data.clients.map((c) => <AdsClientCard key={c.clientId} c={c} onOpen={() => setOpenClient({ id: c.clientId, name: c.clientName })} />)
            ) : (
              <Empty text="No clients with Google or Meta ads linked." />
            )}
          </>
        ) : null}

        {tab === 'social' && social.data ? (
          social.data.clients.length ? (
            social.data.clients.map((s) => <SocialClientCard key={s.clientId} s={s} />)
          ) : (
            <Empty text="No Facebook or Instagram pages linked yet." />
          )
        ) : null}

        {tab === 'competitors' && comp.data ? (
          comp.data.clientId ? (
            <>
              <ChipRow>
                {comp.data.clients.map((c) => (
                  <Chip key={c.id} text={`${c.name} (${c.count})`} selected={comp.data!.clientId === c.id} onPress={() => setCompClient(c.id)} />
                ))}
              </ChipRow>
              {comp.data.own ? (
                <T variant="small">{`Your client’s Instagram: ${comp.data.own.followers.toLocaleString('en-CA')} followers${comp.data.own.gained7 !== null ? ` (${comp.data.own.gained7 >= 0 ? '+' : ''}${comp.data.own.gained7} this week)` : ''}`}</T>
              ) : null}
              {comp.data.competitors.map((c) => (
                <CompetitorCard key={c.id} c={c} onChecked={() => void comp.reload()} />
              ))}
              <Section title={`What they’re doing (${comp.data.findings.length})`}>
                {comp.data.findings.length ? comp.data.findings.map((f) => <FindingCard key={f.id} f={f} />) : <Empty text="Nothing new spotted yet." />}
              </Section>
            </>
          ) : (
            <Empty text="No competitors added yet. Add them on the website (Admin → Competitors)." />
          )
        ) : null}
      </Screen>

      {openClient ? <AdsClientSheet clientId={openClient.id} clientName={openClient.name} days={days} onClose={() => setOpenClient(null)} /> : null}
    </>
  );
}
