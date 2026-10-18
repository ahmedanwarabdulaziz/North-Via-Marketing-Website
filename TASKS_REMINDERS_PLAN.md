# Tasks, Reminders & Knowledge Library Plan (Telegram + AI)

Status: **Phase 1 and 2 built** (2026-10-18): text and voice notes, reminders with Done/Snooze (`/api/tasks/due`, hourly from n8n: `n8n/tasks-due-hourly.json`; reminders go out with the run at the start of their hour), 9 AM Cairo morning digest. Decided: auto-save with Undo, Cairo time.

Send the bot a text, a voice note, a screenshot or a link. The AI works out what it is, fills in the details, asks only for what's missing, and saves it to Supabase. The bot then reminds you at the right time.

What already exists and gets reused:
- **Telegram bot** (`app/api/telegram/webhook/route.ts`), private to the allowed chats, with a main menu (`lib/telegram-menu.ts`) built to take new sections.
- **Gemini** (`@google/generative-ai`, already used for review replies). It understands **voice notes (Arabic and English), images and text in one call**, so no separate speech-to-text service is needed.
- **Supabase**, with the client list (`clients`) and an older `admin_tasks` table (basic, with the due date stored as text).
- **n8n**, already running the hourly checks.

---

## The flow

```
You send: text / voice / screenshot / link
        │
        ▼
1. Telegram webhook (Vercel)
   ├─ voice  → download .ogg  ─┐
   ├─ photo  → download image ─┼─► Gemini: "what is this?"
   ├─ link   → fetch page text ─┘
   └─ text   ─────────────────────►
        │
        ▼
2. AI returns JSON:
   kind:        task | reminder | knowledge | question
   title, summary
   date, time (Cairo time)
   category:    work → which client (matched to the clients table) | personal
   priority
   repeat:      none | daily | weekly on Sun,Tue | monthly on the 1st … until date / N times
   remind_before: e.g. 30 min
   confidence per field + list of missing fields
        │
        ▼
3. Every field confident? ──yes──► SAVE, send a card:
        │                         "✅ Saved: Call Ahmed (Client X) – Tue 3 PM, every week
        │                          [✏️ Edit] [↩️ Undo] [⏰ Change time]"
        no
        ▼
4. Save as a DRAFT and ask ONE question at a time, with buttons:
   "Which client?"   [Client A] [Client B] [Personal] [Other…]
   "When?"           [Today] [Tomorrow] [Pick a day] or type "Thursday 5pm"
   "Repeat?"         [No] [Daily] [Weekly] [Monthly] [Custom]
   You tap or reply → the draft is updated → once complete it's saved (step 3)
```

**Reminders (the VPS's job):**
```
Every minute: n8n (or a small cron on Contabo) → /api/tasks/due
   → for each task whose reminder time has come:
     "⏰ Call Ahmed (Client X) — now"
     [✅ Done] [💤 15 min] [💤 1 hour] [📅 Tomorrow] [✏️ Edit]
   → Done on a repeating task → the next one is scheduled automatically
Every morning 8 AM Cairo: "Today: 5 tasks (3 work, 2 personal) + 2 overdue"
Sunday evening: week ahead, grouped by client
```

**Knowledge library:**
```
Screenshot → AI reads the text in it, summarizes, tags it, links it to a client if relevant
Link       → page title + summary + tags (YouTube: video title/description)
"save: …"  → saved as a note
Search: type "find instagram reels ideas" or open 📚 Knowledge in the menu
   → finds by meaning, not just exact words (Supabase pgvector)
```

---

## Recommendations (my changes to the idea)

1. **Keep the bot on Vercel. Use the VPS for timing.** The webhook and AI calls already run well on Vercel, and moving them would break the bot that works today. What Vercel can't do cheaply is check every minute, so a 1-minute trigger on Contabo (n8n, already there) calls `/api/tasks/due`. If the VPS goes down, the next run catches up on missed reminders.
2. **One Gemini call per message.** Voice, image and text all go into the same "understand this" call, which returns strict JSON. It's cheap, fast, and handles mixed Arabic and English voice notes.
3. **Auto-save, with Undo, when the AI is sure.** Even a confident guess gets an Undo/Edit card, so a wrong guess costs one tap. When it isn't sure, it asks one question at a time with buttons, never a long form.
4. **Store repeats as a rule, not as copies.** Save the repeat rule (e.g. "weekly on Tuesday until 2027-03-01") and create only the next one. Nothing to clean up, and editing the rule changes all future ones.
5. **Match clients from the database.** The AI gets the client list (names and short forms), so "call the bakery guy" maps to the right client. Client buttons in questions come from the same list.
6. **Free text goes to the AI, not the menu.** Right now any unknown message opens the menu. Change it so `x`/`menu` opens the menu, review/comment edit replies keep working first, and everything else goes to the AI.
7. **Use new tables instead of the old `admin_tasks`.** The old one stores the due date as text, has no time zone and no repeat rule. Move its rows over once, then retire it.
8. **Screenshots in Supabase Storage**, not on the VPS. They get backed up with the database and are easy to show in the admin panel.

---

## Database (new migration `0008_tasks_knowledge.sql`)

- `tasks`: id, title, notes, kind (task/reminder), category (work/personal), client_id → clients, priority, status (open/done/snoozed/cancelled), due_at (timestamptz), all_day, remind_at, remind_before_min, repeat_rule (text), repeat_until, repeat_count, parent_task_id, source (text/voice/photo/link), source_message_id, raw_input, ai_confidence (jsonb), created_at, done_at
- `task_drafts`: id, chat_id, partial fields (jsonb), missing fields, question being asked, expires_at (unfinished drafts expire after 24h and get mentioned in the morning digest)
- `knowledge_items`: id, type (screenshot/link/note/voice), title, summary, extracted_text, url, file_path (Storage), tags[], client_id, embedding vector(768), created_at
- `task_events`: reminder sent / snoozed / done log (stops a reminder being sent twice, and gives weekly stats)

---

## Phases

| Phase | What | Time |
|---|---|---|
| 1 | Tables + text messages → AI → auto-save or questions → Undo/Edit card. New ✅ **Tasks** section in the menu (Today / Upcoming / Overdue / by client) | 2–3 days |
| 2 | Voice notes + the reminder engine (1-minute trigger on the VPS, Done/Snooze buttons) + morning digest | 2 days |
| 3 | Repeating tasks (rules, next one after Done, "until"/"N times") + weekly summary | 1–2 days |
| 4 | Knowledge library: screenshots, links, notes, search by meaning | 2–3 days |
| 5 | Admin panel page `/admin/tasks` (calendar + list, edit, per-client view) and a Tasks tab on each client page | 2 days |

## Decisions needed
- Confirm **auto-save + Undo** when the AI is confident (vs. always asking "Save?").
- Time zone: **Cairo** for all tasks? (Travel could be handled later with a "/tz" command.)
- Default reminder: **at the time** for tasks, **30 min before** for meetings and calls?
- Morning digest time (suggested 8 AM) and whether to send the Sunday weekly summary.
- Confirm that n8n runs on the Contabo VPS (the 1-minute trigger goes there).
