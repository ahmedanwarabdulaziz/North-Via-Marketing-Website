import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AdsClientCard,
  AdsClientSheet,
  adsWhatsAppText,
  CompetitorCard,
  FindingCard,
  SocialClientCard,
  StoppedAdsBanner,
} from '@/components/marketing';
import { CommentCard } from '@/components/comment-card';
import { AdsSuggestionCard, TellClientSheet } from '@/components/ads-suggestion-card';
import { Button, Chip, ChipRow, Empty, ErrorBox, Loading, Row, Screen, Section, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { AdsOverview, AdsSuggestionsData, AppComment, CompetitorFinding, CompetitorRow, SocialClient } from '@/lib/types';
import { useApi } from '@/lib/use-api';

// 📈 Marketing: Google & Meta ads with a running / limited / stopped flag per client (hourly watch),
// Facebook & Instagram followers, and competitors with their latest moves. Same data as the website.

type Tab = 'ads' | 'ideas' | 'social' | 'competitors';

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
  const [openClient, setOpenClient] = useState<{ id: string; name: string; text: string } | null>(null);
  const [compClient, setCompClient] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const ads = useApi<AdsOverview>(tab === 'ads' ? `/marketing/ads?days=${days}` : null);
  const social = useApi<{ clients: SocialClient[] }>(tab === 'social' ? '/marketing/social' : null);
  const comments = useApi<{ comments: AppComment[] }>(tab === 'social' ? '/marketing/comments' : null);
  const [ideasClient, setIdeasClient] = useState<string | null>(null);
  const [ideasView, setIdeasView] = useState<'pending' | 'applied'>('pending');
  const [scanning, setScanning] = useState(false);
  const [tellClient, setTellClient] = useState<{ id: string; name: string } | null>(null);
  const ideas = useApi<AdsSuggestionsData>(tab === 'ideas' ? `/marketing/suggestions?status=${ideasView}${ideasClient ? `&client=${encodeURIComponent(ideasClient)}` : ''}` : null);
  const comp = useApi<CompetitorsData>(tab === 'competitors' ? `/marketing/competitors${compClient ? `?client=${encodeURIComponent(compClient)}` : ''}` : null);
  const current = tab === 'ads' ? ads : tab === 'ideas' ? ideas : tab === 'social' ? social : comp;

  const checkIdeas = async () => {
    if (!ideasClient) return;
    setScanning(true);
    try {
      const r = await api<{ created: unknown[]; scanned: number; problems: string[] }>('/marketing/suggestions', {
        body: { action: 'generate', clientId: ideasClient },
        timeoutMs: 120_000,
      });
      const found = r.created.length;
      Alert.alert(
        'Account checked',
        r.problems.length ? r.problems.join('\n') : found ? `${found} new idea${found === 1 ? '' : 's'} found (looked at ${r.scanned} searches).` : `Nothing new to suggest (looked at ${r.scanned} searches).`,
      );
      void ideas.reload();
    } catch (e) {
      Alert.alert('Not checked', e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

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
      <Screen padTop={false} refreshing={current.refreshing} onRefresh={() => { current.refresh(); if (tab === 'social') void comments.reload(); }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'ads', label: 'Ads', count: ads.data?.stopped.length || null, alert: Boolean(ads.data?.stopped.length) },
            { key: 'ideas', label: '💡 Ideas', count: tab === 'ideas' && ideasView === 'pending' ? ideas.data?.suggestions.length || null : null },
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
              ads.data.clients.map((c) => <AdsClientCard key={c.clientId} c={c} onOpen={() => setOpenClient({ id: c.clientId, name: c.clientName, text: adsWhatsAppText(c, days) })} />)
            ) : (
              <Empty text="No clients with Google or Meta ads linked." />
            )}
          </>
        ) : null}

        {tab === 'ideas' && ideas.data ? (
          <>
            <T variant="small">Google Ads improvements found from real searches. Nothing changes in the account until you press ✅.</T>
            <ChipRow>
              <Chip text="All clients" selected={!ideasClient} onPress={() => setIdeasClient(null)} />
              {ideas.data.clients.map((c) => (
                <Chip key={c.id} text={c.name} selected={ideasClient === c.id} onPress={() => setIdeasClient(c.id)} />
              ))}
            </ChipRow>
            <Row>
              <Chip text="Waiting" selected={ideasView === 'pending'} onPress={() => setIdeasView('pending')} />
              <Chip text="Applied" selected={ideasView === 'applied'} onPress={() => setIdeasView('applied')} />
              <Button title="🔍 Check now" small kind="soft" busy={scanning} disabled={!ideasClient} style={{ marginLeft: 'auto' }} onPress={checkIdeas} />
            </Row>
            {!ideasClient ? <T variant="small">Pick a client, then 🔍 Check now to look at their account.</T> : null}
            {ideas.data.toTell.map((t) => (
              <Button key={t.id} title={`📲 Tell ${t.name} (${t.count} change${t.count === 1 ? '' : 's'} made)`} kind="outline" onPress={() => setTellClient({ id: t.id, name: t.name })} />
            ))}
            {ideas.data.suggestions.length ? (
              ideas.data.suggestions.map((s) => <AdsSuggestionCard key={s.id} suggestion={s} onChanged={() => void ideas.reload()} />)
            ) : (
              <Empty text={ideasView === 'pending' ? 'No ideas waiting. ✅ Pick a client and check now.' : 'Nothing applied yet.'} />
            )}
          </>
        ) : null}

        {tab === 'social' && comments.data ? (
          <Section title={`💬 Comments waiting (${comments.data.comments.length})`}>
            {comments.data.comments.length ? (
              comments.data.comments.map((c) => <CommentCard key={c.id} comment={c} onDone={() => void social.reload()} />)
            ) : (
              <Empty text="No comments waiting. ✅" />
            )}
          </Section>
        ) : null}

        {tab === 'social' && social.data ? (
          social.data.clients.length ? (
            <Section title="👥 Followers">
              {social.data.clients.map((s) => (
                <SocialClientCard key={s.clientId} s={s} />
              ))}
            </Section>
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

      {tellClient ? <TellClientSheet clientId={tellClient.id} clientName={tellClient.name} onClose={() => setTellClient(null)} onDone={() => void ideas.reload()} /> : null}
      {openClient ? <AdsClientSheet clientId={openClient.id} clientName={openClient.name} days={days} shareText={openClient.text} onClose={() => setOpenClient(null)} /> : null}
    </>
  );
}
