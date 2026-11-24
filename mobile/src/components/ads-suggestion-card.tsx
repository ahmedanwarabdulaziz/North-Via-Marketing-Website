import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { usePalette } from '@/lib/theme';
import type { AdsClientUpdate, AdsSuggestion } from '@/lib/types';
import { openWhatsApp } from '@/lib/whatsapp';

import { Back, BottomSheet, Note } from './sheet';
import { Button, Card, Chip, Input, Pill, Row, T } from './ui';

// A Google Ads idea as a card: ✅ Accept (applies it to the real Google Ads account), ✏️ Edit
// (change the wording / match type first), ✖ Reject. Nothing changes in Google Ads until ✅.

const MATCH_LABEL = { EXACT: 'Exact', PHRASE: 'Phrase', BROAD: 'Broad' } as const;

type Kind = AdsSuggestion['type'];

const TITLE: Record<Kind, string> = {
  add_keyword: '➕ Add this keyword',
  add_negative: '🚫 Block this search',
  pause_keyword: '⏸ Pause this keyword',
  change_bid: '💰 Change bid',
  change_budget: '💵 Change daily budget',
  new_ad_copy: '✍️ New ad text',
  advisory: '🔧 Heads-up',
};

const describe = (s: AdsSuggestion) => TITLE[s.type] || '💡 Idea';

const money = (n: number) => `$${n.toFixed(2)}`;
const keywordKind = (t: Kind) => t === 'add_keyword' || t === 'add_negative';
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

function evidenceLine(s: AdsSuggestion) {
  const e = s.evidence;
  if (!e) return '';
  const parts: string[] = [];
  if (e.clicks != null) parts.push(`${e.clicks} clicks`);
  if (e.cost != null) parts.push(`$${e.cost.toFixed(2)}`);
  if (e.conversions != null) parts.push(`${e.conversions} conversions`);
  return parts.join(' · ');
}

/** The big line on the card: the keyword, or what changes (before → after). */
function headline(s: AdsSuggestion) {
  const d = s.detail && 'from' in s.detail ? s.detail : null;
  if (s.type === 'change_bid' && d) return `“${s.text}”: ${money(d.from)} → ${money(d.to)}`;
  if (s.type === 'change_budget' && d) return `${s.text}: ${money(d.from)} → ${money(d.to)} a day`;
  if (s.type === 'new_ad_copy' || s.type === 'advisory') return s.text;
  return `“${s.text}”`;
}

/**
 * A plain statement of what pressing ✅ will do, shown on the card and in the window before it is applied.
 * `now` is what Ahmed has typed (edits change the sentence at once).
 */
function willDo(
  s: AdsSuggestion,
  now: { text: string; match: AdsSuggestion['matchType']; level: 'campaign' | 'ad_group'; value: number; heads: string[]; descs: string[] },
): { summary: string; details: string[] } {
  const d = s.detail && 'from' in s.detail ? s.detail : null;
  const campaign = s.campaign ? `campaign “${s.campaign}”` : 'the campaign';
  const group = s.adGroup ? `ad group “${s.adGroup}”` : 'the ad group';
  const matchWords = now.match === 'EXACT' ? 'only this exact search' : now.match === 'PHRASE' ? 'searches that contain these words in this order' : 'any related search (broad)';
  switch (s.type) {
    case 'add_keyword':
      return {
        summary: `Adds the keyword “${now.text.trim()}” to ${group} (${campaign}) in Google Ads.`,
        details: [`Your ads can show for ${matchWords}, and you pay when someone clicks.`, 'Nothing is removed or changed.', 'Undo removes the keyword again.'],
      };
    case 'add_negative':
      return {
        summary: `Stops your ads showing for searches containing “${now.text.trim()}” in ${now.level === 'ad_group' && s.adGroup ? group : campaign}.`,
        details: [`Blocks ${matchWords}. You stop paying for those clicks.`, 'Your keywords and ads are not changed.', 'Undo lifts the block.'],
      };
    case 'pause_keyword':
      return {
        summary: `Pauses the keyword “${s.text}” in ${group} (${campaign}).`,
        details: ['Your ads stop showing for it, so it stops costing money.', 'Nothing is deleted: its history stays.', 'Undo turns it back on.'],
      };
    case 'change_bid':
      return d
        ? {
            summary: `Changes the most you pay per click for “${s.text}” from ${money(d.from)} to ${money(now.value)}.`,
            details: [now.value > d.from ? 'Each click can cost more, but the ad can win more of these searches.' : 'Each click costs less, but the ad can win fewer of these searches.', `Applies to ${group}.`, `Undo puts it back to ${money(d.from)}.`],
          }
        : { summary: `Changes the bid for “${s.text}”.`, details: [] };
    case 'change_budget': {
      if (!d) return { summary: `Changes the daily budget of ${campaign}.`, details: [] };
      const month = (now.value - d.from) * 30;
      return {
        summary: `Changes the daily budget of ${campaign} from ${money(d.from)} to ${money(now.value)}.`,
        details: [`Google can spend up to ${money(now.value)} a day. That is about ${month >= 0 ? '+' : '−'}${money(Math.abs(month))} a month if it is spent fully.`, `Undo puts it back to ${money(d.from)} a day.`],
      };
    }
    case 'new_ad_copy':
      return {
        summary: `Adds ${now.heads.length} headline${now.heads.length === 1 ? '' : 's'} and ${now.descs.length} description${now.descs.length === 1 ? '' : 's'} to the ad in ${group}.`,
        details: ['The existing ad text stays; this is added to it.', 'Google reviews the ad again, so it may be limited for a short while.', 'Undo restores the old ad text.'],
      };
    default:
      return { summary: 'Nothing will change in Google Ads.', details: ['This is advice only. “Got it” just removes this note.'] };
  }
}

/** The highlighted box on a card: what ✅ will do, and what happens if you reject it. */
function WillDoBox({ s, text, compact }: { s: AdsSuggestion; text: ReturnType<typeof willDo>; compact?: boolean }) {
  const p = usePalette();
  const advisory = s.type === 'advisory';
  return (
    <View style={{ backgroundColor: advisory ? p.card : p.brandSoft, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: advisory ? p.border : p.brand, paddingVertical: 8, paddingHorizontal: 10, gap: 3 }}>
      <T variant="label" color={advisory ? p.muted : p.brand}>
        {advisory ? 'ℹ️ What happens' : '✅ If you accept'}
      </T>
      <T style={{ fontWeight: '700' }}>{text.summary}</T>
      {compact ? null : text.details.map((line) => <T key={line} variant="small">{`• ${line}`}</T>)}
      {compact || advisory ? null : <T variant="small">{'• If you reject: nothing changes and it isn’t suggested again.'}</T>}
    </View>
  );
}

function doneNote(action: 'accept' | 'reject' | 'undo', s: AdsSuggestion) {
  if (action === 'reject') return s.type === 'advisory' ? 'Got it' : 'Rejected';
  if (action === 'undo') return s.type === 'add_keyword' || s.type === 'add_negative' ? '↩️ Removed from Google Ads' : '↩️ Put back the way it was';
  return '✅ Done in Google Ads';
}

const undoLabel = (s: AdsSuggestion) =>
  s.type === 'add_keyword' || s.type === 'add_negative'
    ? '↩️ Undo (remove from Google Ads)'
    : s.type === 'pause_keyword'
      ? '↩️ Undo (turn the keyword back on)'
      : s.type === 'new_ad_copy'
        ? '↩️ Undo (restore the old ad text)'
        : '↩️ Undo (restore the old value)';

export function AdsSuggestionCard({ suggestion: initial, onChanged }: { suggestion: AdsSuggestion; onChanged: () => void }) {
  const p = usePalette();
  const [s, setS] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState(initial.text);
  const [match, setMatch] = useState<AdsSuggestion['matchType']>(initial.matchType);
  const [level, setLevel] = useState<'campaign' | 'ad_group'>('campaign');
  const [note, setNote] = useState<string | null>(null);

  const change = initial.detail && 'from' in initial.detail ? initial.detail : null;
  const copy = initial.detail && 'headlines' in initial.detail ? initial.detail : null;
  const [value, setValue] = useState(change ? String(change.to) : '');
  const [headlinesText, setHeadlinesText] = useState((copy?.headlines || []).join('\n'));
  const [descriptionsText, setDescriptionsText] = useState((copy?.descriptions || []).join('\n'));

  const advisory = s.type === 'advisory';
  const pending = s.status === 'pending' || s.status === 'failed';
  const kw = keywordKind(s.type);
  const newValue = Number(value.replace(',', '.'));
  const valueOk = Number.isFinite(newValue) && newValue > 0 && (!change || newValue <= change.from * 3);
  const heads = lines(headlinesText);
  const descs = lines(descriptionsText);
  const copyProblem = !copy
    ? null
    : heads.some((h) => h.length > 30)
      ? 'A headline is over 30 characters.'
      : heads.some((h) => h.includes('!'))
        ? 'Google doesn’t allow exclamation marks in headlines.'
        : descs.some((d) => d.length > 90)
          ? 'A description is over 90 characters.'
          : copy.haveHeadlines + heads.length > 15
            ? 'An ad can have at most 15 headlines.'
            : copy.haveDescriptions + descs.length > 4
              ? 'An ad can have at most 4 descriptions.'
              : !heads.length && !descs.length
                ? 'Add at least one headline or description.'
                : null;
  const invalid = (change ? !valueOk : false) || Boolean(copyProblem);
  const edited = kw
    ? text.trim().toLowerCase() !== s.text || match !== s.matchType
    : change
      ? Number.isFinite(newValue) && Math.abs(newValue - change.to) > 0.004
      : copy
        ? headlinesText.trim() !== copy.headlines.join('\n') || descriptionsText.trim() !== copy.descriptions.join('\n')
        : false;

  const will = willDo(s, { text, match, level, value: Number.isFinite(newValue) ? newValue : (change?.to ?? 0), heads, descs });

  const act = async (action: 'accept' | 'reject' | 'undo') => {
    setBusy(action);
    setNote(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'accept') {
        if (kw) Object.assign(body, { text, matchType: match, level });
        else if (change) body.value = newValue;
        else if (copy) Object.assign(body, { headlines: heads, descriptions: descs });
      }
      const r = await api<{ suggestion: AdsSuggestion }>(`/marketing/suggestions/${s.id}`, { body, timeoutMs: 60_000 });
      setS(r.suggestion);
      setNote(doneNote(action, s));
      setTimeout(() => {
        setOpen(false);
        onChanged();
      }, 900);
    } catch (e) {
      Alert.alert(action === 'accept' ? 'Google Ads refused it' : 'Something went wrong', e instanceof Error ? e.message : String(e));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const confirmTitle =
    s.type === 'add_negative'
      ? 'Block this search in Google Ads?'
      : s.type === 'add_keyword'
        ? 'Add this keyword in Google Ads?'
        : s.type === 'pause_keyword'
          ? 'Pause this keyword in Google Ads?'
          : s.type === 'change_bid'
            ? 'Change this bid in Google Ads?'
            : s.type === 'change_budget'
              ? 'Change this daily budget in Google Ads?'
              : 'Add this text to the ad in Google Ads?';

  const confirmBody = () => [s.clientName, will.summary, '', ...will.details.map((l) => `• ${l}`)].join('\n');

  const accept = () => {
    if (invalid) {
      Alert.alert('Check the values', copyProblem || 'Enter a bid or budget above 0 (at most 3× the current one).');
      return;
    }
    Alert.alert(confirmTitle, `${confirmBody()}\n\nThis changes the live account.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, apply', onPress: () => void act('accept') },
    ]);
  };

  return (
    <>
      <Card onPress={() => setOpen(true)} tone={s.status === 'failed' ? 'danger' : undefined}>
        <Row>
          <T variant="label" style={{ flex: 1 }}>
            {describe(s)}
          </T>
          <T variant="small">{ago(s.createdAt)}</T>
        </Row>
        <T variant="heading">{headline(s)}</T>
        {copy ? (
          <T variant="small" numberOfLines={4}>
            {[...copy.headlines.map((h) => `• ${h}`), ...copy.descriptions.map((d) => `¶ ${d}`)].join('\n')}
          </T>
        ) : null}
        {s.reason ? <T>{s.reason}</T> : null}
        {pending ? <WillDoBox s={s} text={will} compact /> : null}
        <Row wrap>
          <Pill text={s.clientName} />
          {kw ? <Pill text={MATCH_LABEL[s.matchType]} tone="muted" /> : null}
          {evidenceLine(s) ? <Pill text={evidenceLine(s)} tone="muted" /> : null}
          {s.edited ? <Pill text="✏️ edited" tone="warn" /> : null}
          {s.status === 'applied' ? <Pill text={s.told ? '✅ Applied · client told' : '✅ Applied'} tone="ok" /> : null}
          {s.status === 'failed' ? <Pill text="Failed" tone="danger" /> : null}
        </Row>
        {s.error ? (
          <T variant="small" color={p.danger}>
            {s.error}
          </T>
        ) : null}
        {pending && advisory ? (
          <Button title="Got it" small kind="soft" onPress={() => void act('reject')} busy={busy === 'reject'} />
        ) : pending ? (
          <Row>
            <Button title="✅ Accept" small onPress={accept} busy={busy === 'accept'} style={{ flex: 1 }} />
            {s.type === 'pause_keyword' ? null : <Button title="✏️ Edit" small kind="soft" onPress={() => setOpen(true)} style={{ flex: 1 }} />}
            <Button title="✖" small kind="soft" tone="danger" onPress={() => void act('reject')} busy={busy === 'reject'} />
          </Row>
        ) : null}
      </Card>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ gap: 6 }}>
          <T variant="label">{describe(s)}</T>
          <T variant="title">{s.clientName}</T>
          {s.campaign ? <T variant="small">{`Campaign: ${s.campaign}${s.adGroup && s.type !== 'change_budget' ? ` · ${s.adGroup}` : ''}`}</T> : null}
        </View>
        {s.reason ? (
          <Card>
            <T>{s.reason}</T>
            {evidenceLine(s) ? <T variant="small">{`Last 90 days: ${evidenceLine(s)}`}</T> : null}
          </Card>
        ) : null}
        {pending ? <WillDoBox s={s} text={will} /> : null}
        {note ? <Note text={note} /> : null}

        {pending && advisory ? <Button title="Got it" onPress={() => void act('reject')} busy={busy === 'reject'} /> : null}

        {pending && !advisory ? (
          <>
            {kw ? (
              <>
                <T variant="label">{s.type === 'add_negative' ? 'Block searches containing' : 'Keyword'}</T>
                <Input value={text} onChangeText={setText} autoCapitalize="none" />
                <T variant="label">Match type</T>
                <Row wrap>
                  {(['EXACT', 'PHRASE', 'BROAD'] as const).map((m) => (
                    <Chip key={m} text={MATCH_LABEL[m]} selected={match === m} onPress={() => setMatch(m)} />
                  ))}
                </Row>
                <T variant="small">
                  {match === 'EXACT' ? 'Only this exact search.' : match === 'PHRASE' ? 'Searches that include these words in order.' : 'Any related search (widest, use carefully).'}
                </T>
                {s.type === 'add_negative' && s.adGroup ? (
                  <>
                    <T variant="label">Where</T>
                    <Row wrap>
                      <Chip text="Whole campaign" selected={level === 'campaign'} onPress={() => setLevel('campaign')} />
                      <Chip text="This ad group only" selected={level === 'ad_group'} onPress={() => setLevel('ad_group')} />
                    </Row>
                  </>
                ) : null}
              </>
            ) : null}

            {s.type === 'pause_keyword' ? <T variant="small">The keyword stops showing until you turn it back on (Undo does that). Nothing is deleted.</T> : null}

            {change ? (
              <>
                <T variant="label">{s.type === 'change_bid' ? 'New bid per click' : 'New daily budget'}</T>
                <T variant="small">{`Now ${money(change.from)}. Suggested ${money(change.to)}.`}</T>
                <Input value={value} onChangeText={setValue} keyboardType="decimal-pad" />
                {s.type === 'change_budget' && valueOk ? (
                  <T variant="small">{`About ${newValue >= change.from ? '+' : '−'}${money(Math.abs((newValue - change.from) * 30))} a month if the budget is spent fully.`}</T>
                ) : null}
                {!valueOk ? <T variant="small" color={p.danger}>Must be above 0 and at most 3× the current value.</T> : null}
              </>
            ) : null}

            {copy ? (
              <>
                <T variant="small">{`The ad has ${copy.haveHeadlines} headline${copy.haveHeadlines === 1 ? '' : 's'} (max 15) and ${copy.haveDescriptions} description${copy.haveDescriptions === 1 ? '' : 's'} (max 4). One per line. Google reviews the ad again after the change.`}</T>
                <T variant="label">{`Headlines to add (${heads.length}) · max 30 characters, no “!”`}</T>
                <Input value={headlinesText} onChangeText={setHeadlinesText} multiline autoCapitalize="sentences" style={{ minHeight: 120 }} />
                {heads.some((h) => h.length > 30) ? <T variant="small" color={p.danger}>{`Too long: ${heads.filter((h) => h.length > 30).map((h) => `“${h}”`).join(', ')}`}</T> : null}
                <T variant="label">{`Descriptions to add (${descs.length}) · max 90 characters`}</T>
                <Input value={descriptionsText} onChangeText={setDescriptionsText} multiline autoCapitalize="sentences" style={{ minHeight: 96 }} />
                {descs.some((d) => d.length > 90) ? <T variant="small" color={p.danger}>One description is over 90 characters.</T> : null}
                {copyProblem ? <T variant="small" color={p.danger}>{copyProblem}</T> : null}
              </>
            ) : null}

            <Button title={edited ? '✅ Accept with my edits' : '✅ Accept'} onPress={accept} busy={busy === 'accept'} disabled={invalid} />
            <Button title="✖ Reject (don't suggest again)" kind="soft" tone="danger" onPress={() => void act('reject')} busy={busy === 'reject'} />
          </>
        ) : null}

        {s.status === 'applied' ? <Button title={undoLabel(s)} kind="soft" tone="danger" onPress={() => void act('undo')} busy={busy === 'undo'} /> : null}
        <Back onPress={() => setOpen(false)} label="Close" />
      </BottomSheet>
    </>
  );
}

/** "Tell the client": the message is written and shown; WhatsApp opens with it (Ahmed presses Send) or he emails it after a look. */
export function TellClientSheet({ clientId, clientName, onClose, onDone }: { clientId: string; clientName: string; onClose: () => void; onDone: () => void }) {
  const [update, setUpdate] = useState<AdsClientUpdate | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api<{ update: AdsClientUpdate | null }>('/marketing/suggestions/update', { body: { action: 'draft', clientId }, timeoutMs: 30_000 })
      .then((r) => {
        if (!live) return;
        setUpdate(r.update);
        setText(r.update?.text || '');
      })
      .catch((e) => {
        if (!live) return;
        Alert.alert('Couldn’t write the update', e instanceof Error ? e.message : String(e));
        onClose();
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const whatsapp = async () => {
    if (!update) return;
    await openWhatsApp(text, update.phone);
    // He presses Send himself; once WhatsApp has opened we count the client as told.
    await api('/marketing/suggestions/update', { body: { action: 'sent', ids: update.ids } }).catch(() => {});
    onDone();
    onClose();
  };

  const email = () => {
    if (!update?.email) return;
    Alert.alert('Email this to the client?', `To: ${update.email}\n\n${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Send email',
        onPress: async () => {
          setBusy('email');
          try {
            await api('/marketing/suggestions/update', { body: { action: 'email', ids: update.ids, to: update.email, subject: update.subject, text }, timeoutMs: 30_000 });
            setNote('✅ Email sent');
            onDone();
            setTimeout(onClose, 900);
          } catch (e) {
            Alert.alert('Not sent', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <T variant="title">{`Tell ${clientName}`}</T>
      {update === undefined ? <T variant="small">Writing the update…</T> : null}
      {update === null ? <T>Nothing new to tell this client.</T> : null}
      {update ? (
        <>
          <T variant="small">{`${update.count} change${update.count === 1 ? '' : 's'} made. Edit the message if you like. Nothing is sent until you press Send.`}</T>
          <Input value={text} onChangeText={setText} multiline style={{ minHeight: 170 }} />
          {note ? <Note text={note} /> : null}
          <Button title="📲 Open in WhatsApp" onPress={() => void whatsapp()} />
          <Button title={update.email ? `✉️ Email ${update.email}` : '✉️ No email on file'} kind="soft" disabled={!update.email} busy={busy === 'email'} onPress={email} />
        </>
      ) : null}
      <Back onPress={onClose} label="Close" />
    </BottomSheet>
  );
}
