# Anwarz mobile app (Android)

One app as the control center for the agency: tasks, email approvals, clients, alerts.
Native app built with Expo (React Native) in `mobile/` (Phase 2), APK built by Expo's cloud (EAS Build),
small fixes sent over the air (EAS Update). Supabase stays the database, this website's code stays the
brain, Firebase only carries push notifications. Telegram (Anwarz bot) and ntfy stay as backup.

## Phases
1. **Website side** ✅ (2026-11-15): app sign-in, `app_devices` table, Firebase push next to ntfy, data endpoints below.
2. **Core app**: Home, Tasks, Inbox, Clients, Anwarz chat tabs; More (Reviews, Competitors, Ads, Library, Memory, Invoices, Settings). Ahmed needs a free Expo account.
3. **Notifications**: register the Android app in Firebase (`google-services.json`); FIREBASE_* env must be that project's service account. Done / Snooze / Approve buttons, tap opens the item.
4. **WhatsApp client tracking**: read WhatsApp notifications on the phone (Android notification listener), link a chat to a client, save + alert.
5. **Polish**: offline view of the last data, final signed APK.

## API (`/api/app/*`)
All routes except login need `Authorization: Bearer <token>`. Errors are `{ error }` with a status code.
Code: `lib/app-auth.ts` (sign-in, `appRoute` wrapper), `lib/app-api.ts` (JSON shapes), `lib/app-tasks.ts`, `lib/push.ts`.

| Route | What |
|---|---|
| `POST /login` `{ password, deviceName?, platform?, appVersion? }` | → `{ token, deviceId, expiresAt }` (180 days). Admin password, rate limited. |
| `POST /logout` | Revokes this phone's token and push token. |
| `GET /device` · `POST /device { pushToken, appVersion? }` · `POST /device { test: true }` | Sign-in info · save FCM token · send a test push. |
| `GET /home` | Task counts + overdue/today, emails waiting (urgent, drafts, latest 5), websites down / SSL soon. |
| `GET /tasks?view=open\|done` | Open tasks grouped (overdue, today, tomorrow, week, noDate) or done in the last 7 days. |
| `POST /tasks { text }` · `{ audio: { data, mimeType }, text? }` · `{ fields }` | AI reads it; saved when complete, else `{ saved: false, needs, questions, fields }` to ask and send back as `{ fields }`. |
| `GET /tasks/:id` | Task + history. |
| `POST /tasks/:id { action }` | `done`, `reopen`, `cancel`, `snooze {for:'1h'\|'3h'\|'tm'}`, `move {day:'today'\|'tomorrow'}`, `edit {fields}`. |
| `GET /emails?view=waiting\|handled\|all&inbox=&before=` | Important emails (40 per page) + inboxes. |
| `GET /emails/:id` | Full email, `canReply`, earlier emails with the same person. |
| `POST /emails/:id { action }` | `draft {text}` or `{audio}` (AI writes the reply), `edit {draft}`, `send`, `cancel`, `done`, `ignore`. Nothing is sent without `send`. |
| `GET /clients` · `GET /clients/:id` | Clients with open tasks / sites down · one client with tasks, websites, emails from linked inboxes. |

Push: every `ringPhone()` (lib/ntfy.ts) also goes to signed-in phones; `data` on a ring (e.g. `{ type: 'task', id }`) tells the app what to open.
