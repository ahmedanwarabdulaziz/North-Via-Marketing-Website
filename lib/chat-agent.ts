import { listClientProfiles } from './admin-ops';
import { recordAiCall } from './ai-usage';
import {
  actionSummary,
  buildContext,
  emailLine,
  emailsByIds,
  searchEmails,
  systemPromptFor,
  toActions,
  type AssistantAction,
  type ChatEmail,
  type ChatMessage,
  type PlannerApp,
  type PlannerCampaign,
  type PlannerClient,
  type PlannerComment,
} from './assistant';
import { getEmailItem, listEmailAccounts } from './email/inbox';
import { jlApi, jlRecords, type JlRecord } from './jl-comfort';
import { searchKnowledge } from './knowledge';
import { OPENROUTER_MODEL, openRouterOn } from './openrouter';
import { formatWhen, listOpenTasks, type Task } from './tasks';

// The Anwarz app chat as ONE assistant with tools (Claude Haiku 5.5 through OpenRouter).
//
// Lookup tools run at once and return data, so the assistant can find the email, order, task or
// campaign Ahmed means before acting. Change tools never change anything: each one is checked by
// toActions (the same checks as the classic planner) and becomes a card he confirms in the app; if
// the check fails, the reason goes back to the assistant so it can fix the call or ask him.
//
// Adding a skill = adding one entry to TOOLS (a lookup or a change). The classic two-call chat in
// lib/assistant.ts stays as the fallback when this fails.

const MAX_STEPS = 6;
const TIME_BUDGET_MS = 45_000;

/** What the app chat lends the tools (kept in lib/app-chat.ts). */
export interface AgentDeps {
  businessNow: (topic: string) => Promise<string>;
  campaigns: () => Promise<PlannerCampaign[]>;
  comments: () => Promise<PlannerComment[]>;
}

/** One turn's data, loaded once and only when a tool needs it. */
class TurnData {
  private cache = new Map<string, Promise<unknown>>();
  /** Every email and task the assistant has seen this turn, so its [E:…]/[T:…] tags become buttons. */
  seenEmails = new Map<string, ChatEmail>();
  seenTasks = new Map<string, Task>();
  constructor(readonly deps: AgentDeps) {}
  private once<T>(key: string, load: () => Promise<T>) {
    if (!this.cache.has(key)) this.cache.set(key, load());
    return this.cache.get(key) as Promise<T>;
  }
  clients = () => this.once('clients', async () => (await listClientProfiles()).filter((c) => c.id && c.brandName) as PlannerClient[]);
  tasks = () => this.once('tasks', () => listOpenTasks());
  jl = () => this.once('jl', () => jlRecords());
  campaigns = () => this.once('campaigns', () => this.deps.campaigns());
  comments = () => this.once('comments', () => this.deps.comments());
  inboxes = () => this.once('inboxes', async () => (await listEmailAccounts()).filter((x) => x.enabled).map((x) => x.email.toLowerCase()));
}

type Json = Record<string, unknown>;

interface Tool {
  name: string;
  description: string;
  parameters: Json;
  /** lookup: returns data to the assistant. change: becomes a card Ahmed confirms. */
  kind: 'lookup' | 'change';
  run: (input: Json, data: TurnData) => Promise<unknown>;
}

const str = (description: string) => ({ type: 'string', description });
const nullableStr = (description: string) => ({ type: ['string', 'null'], description });
const obj = (properties: Json, required: string[] = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });

// ---------- Lookup tools ----------

const LOOKUPS: Tool[] = [
  {
    name: 'search_emails',
    kind: 'lookup',
    description:
      'Search every saved email in all of Ahmed’s inboxes (any age, including skipped ones) by sender name, address or subject words. Use it to find the email he means before replying to it or marking it. Returns the best matches first, each with its id.',
    parameters: obj({ query: str('Names, email addresses or subject words, e.g. "Isabelle sofa" or "karim@patriva.com"') }),
    run: async (input, data) => {
      const found = await searchEmails(String(input.query || ''), 10);
      found.forEach((e) => data.seenEmails.set(e.id, e));
      return found.length ? found.map(emailLine) : 'No saved email matches. Try other words (the sender’s name or a subject word).';
    },
  },
  {
    name: 'get_email',
    kind: 'lookup',
    description: 'Read one email in full (sender, inbox, date, status and text) by its id.',
    parameters: obj({ email_id: str('The id from search_emails or EMAILS') }),
    run: async (input, data) => {
      const item = await getEmailItem(String(input.email_id || ''));
      if (!item) return 'No email with that id.';
      const [line] = await emailsByIds([item.id]);
      if (line) data.seenEmails.set(item.id, line);
      return { header: line ? emailLine(line) : item.subject, text: (item.body || item.snippet || '').replace(/\s+\n/g, '\n').slice(0, 4000), draft: item.draft || null };
    },
  },
  {
    name: 'list_tasks',
    kind: 'lookup',
    description: 'Ahmed’s open tasks with their ids and when they are due. Optional words narrow the list.',
    parameters: obj({ query: nullableStr('Words to filter by (title, notes), or null for all') }),
    run: async (input, data) => {
      const words = String(input.query || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      const tasks = (await data.tasks()).filter((t) => !words.length || words.some((w) => `${t.title} ${t.notes || ''}`.toLowerCase().includes(w)));
      tasks.forEach((t) => data.seenTasks.set(t.id, t));
      return tasks.slice(0, 40).map((t) => `${t.id} | ${t.title} | ${formatWhen(t)}${t.priority === 'high' ? ' | HIGH' : ''}`);
    },
  },
  {
    name: 'list_clients',
    kind: 'lookup',
    description: 'The agency’s clients with their ids and details (owner, email, phone, website, social links).',
    parameters: obj({}),
    run: async (_input, data) =>
      (await data.clients()).map((c) => [c.id, c.brandName, c.ownerName, c.email, c.mobileNumber, c.websiteUrl, c.facebookLink, c.instagramLink].map((v) => v || '-').join(' | ')),
  },
  {
    name: 'jl_find',
    kind: 'lookup',
    description:
      'JL Comfort (his online fabric store) orders (JL-…) and sample requests (S-…), newest first, with ids and statuses. Filter by number, customer name or status. Use it before any JL Comfort change.',
    parameters: obj({
      query: nullableStr('An order/request number (JL-1022, S-1040), a customer name, or null'),
      kind: { type: ['string', 'null'], enum: ['order', 'sample', null], description: 'Only orders or only sample requests, or null for both' },
      status: nullableStr('Only this status, e.g. sent_to_supplier, or null'),
    }),
    run: async (input, data) => {
      const { records, carriers } = await data.jl();
      const q = String(input.query || '').toLowerCase().replace(/\s+/g, '');
      const list = records.filter(
        (r) =>
          (!input.kind || r.kind === input.kind) &&
          (!input.status || r.status === input.status) &&
          (!q || r.number.toLowerCase().replace('-', '') === q.replace('-', '') || r.customer.toLowerCase().replace(/\s+/g, '').includes(q))
      );
      return {
        records: list.slice(0, 30).map((r) => `${r.id} | ${r.number} | ${r.kind} | ${r.customer} | ${r.status}${r.hasTracking ? ' (has tracking)' : ''} | ${r.createdAt.slice(0, 10)}`),
        carriers: carriers.map((c) => `${c.id} (${c.name})`),
        note: list.length ? undefined : 'Nothing matches among the latest 60 orders and 60 sample requests.',
      };
    },
  },
  {
    name: 'jl_details',
    kind: 'lookup',
    description: 'One JL Comfort order or sample request in full: items, address, tracking, supplier numbers, and its history (emails sent, status changes).',
    parameters: obj({ jl_id: str('The id from jl_find') }),
    run: async (input, data) => {
      const r = (await data.jl()).records.find((x) => x.id === input.jl_id);
      if (!r) return 'No order or sample request with that id. Use jl_find first.';
      const json = await jlApi<Json>(`${r.kind}s/${r.id}`, undefined, 15_000);
      return JSON.stringify(json).slice(0, 6000);
    },
  },
  {
    name: 'list_campaigns',
    kind: 'lookup',
    description: 'Every client’s Google Ads and Meta ad campaigns with a key and whether each is active or paused. Use before pausing or resuming ads.',
    parameters: obj({}),
    run: async (_input, data) => (await data.campaigns()).map((c) => `${c.key} | ${c.clientName} | ${c.platform === 'google' ? 'Google Ads' : 'Meta'} | ${c.name} | ${c.status}`),
  },
  {
    name: 'list_comments',
    kind: 'lookup',
    description: 'Facebook / Instagram comments waiting for a reply on clients’ pages (risky first), each with its id and the AI draft reply if any.',
    parameters: obj({}),
    run: async (_input, data) =>
      (await data.comments()).map((c) => `${c.id} | ${c.clientName || ''} | ${c.platform} | ${c.author}: ${c.message.replace(/\s+/g, ' ').slice(0, 200)} | draft: ${(c.draft || '-').slice(0, 160)}`),
  },
  {
    name: 'search_library',
    kind: 'lookup',
    description: 'Search Ahmed’s knowledge library (saved ideas, links, screenshots, notes).',
    parameters: obj({ query: str('What to look for') }),
    run: async (input) =>
      (await searchKnowledge(String(input.query || ''), 8)).map((k) => `[K:${k.id}] ${k.type} | ${k.title} | ${k.summary || ''} ${k.url || ''}`.slice(0, 400)),
  },
  {
    name: 'business_now',
    kind: 'lookup',
    description:
      'A live snapshot of one area: reviews waiting, stopped ads and ad results, websites down, social followers and comments, JL Comfort counts, competitors, or what he finished lately. Pass the topic in his words.',
    parameters: obj({ topic: str('e.g. "ads this month", "reviews", "competitors", "what did I finish this week"') }),
    run: async (input, data) => (await data.deps.businessNow(String(input.topic || ''))).slice(0, 8000),
  },
];

// ---------- Change tools ----------
// Each one is the classic planner's action with the same fields; toActions checks it.

const CHANGE_SPECS: { name: string; description: string; parameters: Json }[] = [
  { name: 'task', description: 'Save a task or reminder (done at once, with Undo). Write it as he would say it to his task bot, with client, day and time if known.', parameters: obj({ text: str('The task') }) },
  { name: 'complete_task', description: 'Mark an open task done (he confirms).', parameters: obj({ task_id: str('Id from list_tasks or OPEN TASKS') }) },
  { name: 'library_note', description: 'Save an idea, note, link or reference to his knowledge library (done at once, with Undo).', parameters: obj({ text: str('What to save, in his words, with the link if any') }) },
  {
    name: 'remember',
    description: 'Remember a lasting fact about him, his companies, clients or how he likes things done. Not for things with a date (those are tasks).',
    parameters: obj({ text: str('One short fact, in his language'), asked: { type: 'boolean', description: 'true only when he explicitly asked you to remember it' } }),
  },
  { name: 'forget', description: 'Forget a remembered fact (he confirms).', parameters: obj({ memory_id: str('Id from MEMORY') }) },
  { name: 'update_profile', description: 'Add or correct something in Ahmed’s own master profile (role, venture, degree, achievement). Not for client facts.', parameters: obj({ change: str('The change, in his words') }) },
  { name: 'email_important', description: 'Bring a skipped email back to his inbox as important (he confirms).', parameters: obj({ email_id: str('Id from search_emails or EMAILS') }) },
  { name: 'email_done', description: 'Mark an email handled / no reply needed (he confirms).', parameters: obj({ email_id: str('Id from search_emails or EMAILS') }) },
  {
    name: 'email_reply',
    description: 'Reply to an email. The app writes the draft; he reads it and taps Send. Never for no-reply senders. Do not write the reply yourself.',
    parameters: obj({ email_id: str('Id from search_emails or EMAILS'), notes: str('What the reply should say, in his words and language; "" when he just says reply') }),
  },
  {
    name: 'email_new',
    description: 'A NEW email (not a reply) from one of his inboxes. The app writes it; he reads it and taps Send. Needs the recipient’s full address.',
    parameters: obj({
      from_inbox: str('One address from INBOXES'),
      to: str('Recipient email address'),
      subject: nullableStr('Subject, or null to let the app write one'),
      notes: str('Everything the email should say, in his words: amounts, dates, requests'),
    }),
  },
  { name: 'approve_five_star', description: 'Post every ready 5★ Google review reply, for one client or all (he confirms).', parameters: obj({ client_id: nullableStr('Client id, or null for all clients') }) },
  { name: 'comment_reply', description: 'Reply publicly to a Facebook / Instagram comment (he confirms).', parameters: obj({ comment_id: str('Id from list_comments'), text: nullableStr('The reply, or null to post the AI draft') }) },
  { name: 'comment_hide', description: 'Hide a rude, spam or harmful comment, only when he asks (he confirms).', parameters: obj({ comment_id: str('Id from list_comments') }) },
  { name: 'comment_skip', description: 'No reply needed for a comment.', parameters: obj({ comment_id: str('Id from list_comments') }) },
  {
    name: 'ads_status',
    description: 'Pause or resume one client’s ad campaigns (he confirms). Use list_campaigns first.',
    parameters: obj({ campaigns: { type: 'array', items: { type: 'string' }, description: 'Keys from list_campaigns, all of ONE client' }, pause: { type: 'boolean', description: 'true to pause, false to resume' } }),
  },
  {
    name: 'add_client',
    description: 'Add a new client (he confirms). Needs at least a brand name.',
    parameters: obj(
      {
        brandName: str('Brand name'),
        ownerName: nullableStr('Owner'),
        email: nullableStr('Email'),
        mobileNumber: nullableStr('Phone'),
        websiteUrl: nullableStr('Website'),
        facebookLink: nullableStr('Facebook'),
        instagramLink: nullableStr('Instagram'),
        tiktokLink: nullableStr('TikTok'),
        googleLink: nullableStr('Google Business link'),
        check_website: { type: 'boolean', description: 'Also check its website every hour (true unless he says not to)' },
      },
      ['brandName', 'check_website']
    ),
  },
  {
    name: 'update_client',
    description: 'Change a client’s details (he confirms). Only the fields that change.',
    parameters: obj({
      client_id: str('Id from list_clients'),
      changes: {
        type: 'object',
        description: 'Fields to change: brandName, ownerName, email, mobileNumber, websiteUrl, facebookLink, instagramLink, tiktokLink, googleLink',
        additionalProperties: { type: 'string' },
      },
    }),
  },
  { name: 'add_website', description: 'Check an extra page or site every hour for an existing client (he confirms).', parameters: obj({ client_id: str('Id from list_clients'), client_name: str('Client name'), url: str('https://…'), label: nullableStr('Short label or null') }) },
  {
    name: 'jl_status',
    description:
      'Change a JL Comfort order’s or sample request’s status, no email (he confirms). Order statuses: paid, sent_to_supplier, shipped, delivered, closed, cancelled, problem. Sample statuses: pending, sent_to_supplier, supplier_confirmed, shipped, delivered, cancelled, problem. For shipped WITH tracking use jl_ship.',
    parameters: obj({ jl_id: str('Id from jl_find'), status: str('The new status'), note: nullableStr('A note for the history, or null') }),
  },
  {
    name: 'jl_ship',
    description: 'It shipped: marks it Shipped and emails the customer the tracking (he confirms). Needs the tracking number.',
    parameters: obj({ jl_id: str('Id from jl_find'), carrier: nullableStr('Carrier id from jl_find’s carriers, or null'), tracking_number: str('As he gave it'), tracking_url: nullableStr('https:// link, only for a carrier not in the list') }),
  },
  { name: 'jl_confirmed', description: 'The supplier (Charlotte) confirmed a SAMPLE request: sets "Confirmed by the supplier" and emails the customer (he confirms).', parameters: obj({ jl_id: str('Id of a sample request from jl_find') }) },
  {
    name: 'jl_resend',
    description: 'Send one of an order’s / sample request’s emails again (he confirms): the customer confirmation, the customer shipped/tracking email, or the request to the supplier.',
    parameters: obj({ jl_id: str('Id from jl_find'), email: { type: 'string', enum: ['confirmation', 'shipped', 'supplier'], description: 'Which email' } }),
  },
];

/** The lists toActions needs to check a change, loaded only for the kind of change it is. */
async function appFor(name: string, input: Json, data: TurnData): Promise<PlannerApp> {
  const ids = typeof input.email_id === 'string' ? [input.email_id] : [];
  const [emails, jl, campaigns, comments, inboxes] = await Promise.all([
    ids.length ? emailsByIds(ids) : Promise.resolve([] as ChatEmail[]),
    name.startsWith('jl_') ? data.jl() : Promise.resolve({ records: [] as JlRecord[], carriers: [] }),
    name === 'ads_status' ? data.campaigns() : Promise.resolve([] as PlannerCampaign[]),
    name.startsWith('comment_') ? data.comments() : Promise.resolve([] as PlannerComment[]),
    name === 'email_new' ? data.inboxes() : Promise.resolve([] as string[]),
  ]);
  return { emails, comments, inboxes, campaigns, jl: jl.records, carriers: jl.carriers };
}

const TOOLS: Tool[] = [
  ...LOOKUPS,
  ...CHANGE_SPECS.map(
    (spec): Tool => ({
      ...spec,
      kind: 'change',
      run: async () => {
        throw new Error('change tools run through prepareChange');
      },
    })
  ),
];

// ---------- The loop (OpenRouter, OpenAI-style tool calls) ----------

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
type LoopMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

async function complete(messages: LoopMessage[], deadline: number) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.northviamarketing.com',
      'X-Title': 'Anwarz (North Via)',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      tools: TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 2048,
      reasoning: { enabled: false },
    }),
    signal: AbortSignal.timeout(Math.max(5_000, deadline - Date.now())),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }>;
    usage?: { total_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    const error = new Error(`OpenRouter ${res.status}: ${data.error?.message || 'error'}`);
    await recordAiCall({ provider: 'openrouter', model: OPENROUTER_MODEL, feature: 'assistant', ok: false, error });
    throw error;
  }
  await recordAiCall({ provider: 'openrouter', model: OPENROUTER_MODEL, feature: 'assistant', ok: true, tokens: data.usage?.total_tokens });
  return data.choices?.[0]?.message || { content: '' };
}

const AGENT_RULES = `

How you work in this app (tools):
- You have LOOKUP tools (search_emails, get_email, list_tasks, list_clients, jl_find, jl_details, list_campaigns, list_comments, search_library, business_now) and CHANGE tools (one per kind of change).
- When he asks for a change, first find the exact item with a lookup tool (unless its id is already in the CONTEXT), then call the change tool with that id. Never guess an id.
- A change tool never changes anything by itself: it puts a card under your answer, and it happens only when he taps ✅ Confirm (tasks, library notes and facts he asked you to remember are saved at once, with Undo). The tool result tells you if the card was prepared, or why not; when it wasn't, fix the call or ask him for what's missing.
- Several changes in one message are fine (one tool call each).
- When the lookups don't find what he means, say what you searched and ask (e.g. the sender's name, the order number). Don't say you can't do something a tool can do.
- After the tools, answer in one short message: what you found and which cards are below. Never say a change is done unless a tool result says "done".`;

export interface AgentReply {
  text: string;
  actions: AssistantAction[];
  dropped: string[];
  emails: { id: string; subject: string }[];
  tasks: Task[];
  steps: string[]; // tool calls, for the log
}

/** One chat turn with tools. Throws when OpenRouter is off or fails, so the caller can fall back. */
export async function runChatAgent(
  question: string,
  history: ChatMessage[],
  deps: AgentDeps,
  runsAtOnce: (a: AssistantAction) => boolean,
  extraContext?: () => Promise<string>
): Promise<AgentReply> {
  if (!(await openRouterOn())) throw new Error('OpenRouter is off.');
  const deadline = Date.now() + TIME_BUDGET_MS;
  const data = new TurnData(deps);
  const [context, extra] = await Promise.all([buildContext(question, history, true), extraContext ? extraContext().catch(() => '') : Promise.resolve('')]);
  if (extra) context.text += `

${extra}`;
  context.emails.forEach((e) => data.seenEmails.set(e.id, e));
  context.tasks.forEach((t) => data.seenTasks.set(t.id, t));
  const inboxes = await data.inboxes().catch(() => [] as string[]);

  const messages: LoopMessage[] = [
    // The classic prompt's "PLANNED CHANGES" section describes the two-call chat; the tool rules replace it.
    { role: 'system', content: `${systemPromptFor('app').split('Changes — be honest:')[0].trim()}${AGENT_RULES}\n\nCONTEXT:\n${context.text}\n\nINBOXES he can send from: ${inboxes.join(', ') || '(none)'}` },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content.slice(0, 1500) }) as LoopMessage),
    { role: 'user', content: question },
  ];

  const actions: AssistantAction[] = [];
  const dropped: string[] = [];
  const steps: string[] = [];

  /** Checks a change with the classic planner's rules; returns what the assistant is told. */
  const prepareChange = async (name: string, input: Json) => {
    const [clients, tasks] = await Promise.all([data.clients(), data.tasks()]);
    const facts = context.memory.facts;
    const why: string[] = [];
    const made = toActions({ actions: [{ ...input, type: name }] }, clients, tasks, facts, await appFor(name, input, data), why);
    if (!made.length) {
      dropped.push(...why);
      return `NOT prepared: ${why.join(' ') || 'the details didn’t check out.'}`;
    }
    actions.push(...made);
    return made.map((a) => (runsAtOnce(a) ? `done (saved at once, with an Undo button): ${actionSummary(a)}` : `card prepared, waiting for his ✅ Confirm: ${actionSummary(a)}`)).join('\n');
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    const lastStep = step === MAX_STEPS - 1 || deadline - Date.now() < 8_000;
    if (lastStep) messages.push({ role: 'user', content: '(No more tools now: answer him with what you have.)' });
    const reply = await complete(messages, deadline);
    const calls = lastStep ? [] : reply.tool_calls || [];
    messages.push({ role: 'assistant', content: reply.content || null, ...(calls.length ? { tool_calls: calls } : {}) });
    if (!calls.length) {
      const raw = (reply.content || '').trim();
      return finish(raw, actions, dropped, steps, data);
    }
    // Lookups run side by side; changes one after another (they share the actions list).
    const results = await Promise.all(
      calls.map(async (call) => {
        const tool = TOOLS.find((t) => t.name === call.function.name);
        let input: Json = {};
        try {
          input = JSON.parse(call.function.arguments || '{}') as Json;
        } catch {
          return { call, content: 'Error: the arguments were not valid JSON. Call the tool again.' };
        }
        steps.push(`${call.function.name} ${JSON.stringify(input).slice(0, 200)}`);
        if (!tool) return { call, content: `Error: there is no tool "${call.function.name}".` };
        if (tool.kind === 'change') return { call, input, change: true as const };
        try {
          const out = await tool.run(input, data);
          return { call, content: typeof out === 'string' ? out : JSON.stringify(out) };
        } catch (error) {
          return { call, content: `Error: ${error instanceof Error ? error.message.slice(0, 300) : String(error)}` };
        }
      })
    );
    for (const r of results) {
      let content = 'content' in r ? r.content : '';
      if ('change' in r) {
        try {
          content = await prepareChange(r.call.function.name, r.input ?? {});
        } catch (error) {
          content = `Error: ${error instanceof Error ? error.message.slice(0, 300) : String(error)}`;
        }
      }
      messages.push({ role: 'tool', tool_call_id: r.call.id, content: (content || '(empty)').slice(0, 12_000) });
    }
  }
  return finish('', actions, dropped, steps, data);
}

function finish(raw: string, actions: AssistantAction[], dropped: string[], steps: string[], data: TurnData): AgentReply {
  const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{6,40})\\]`, 'g'))].map((x) => x[1]))];
  const text = raw
    .replace(/\s*\[(K|T|E):[A-Za-z0-9_-]{6,40}\]/g, '')
    .replace(/\s*\[(DONE by the bot|FAILED|PROPOSED[^\]]*)\]/gi, '')
    .trim();
  return {
    text: text || (actions.length ? 'Here’s what I prepared:' : 'I couldn’t finish that. Try asking again in other words.'),
    actions,
    dropped,
    emails: ids('E').map((id) => data.seenEmails.get(id)).filter((e): e is ChatEmail => Boolean(e)).map((e) => ({ id: e.id, subject: e.subject || '(no subject)' })),
    tasks: ids('T').map((id) => data.seenTasks.get(id)).filter((t): t is Task => Boolean(t)),
    steps,
  };
}
