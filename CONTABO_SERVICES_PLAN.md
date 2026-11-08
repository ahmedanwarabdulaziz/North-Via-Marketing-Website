# Contabo Services Plan: Uptime Kuma, Umami, Postiz

Status: **planned, not started** (added 2026-10-17)

Use the Contabo VPS as the "worker" server for three self-hosted services. The website itself stays on Vercel.

What already exists, and how it overlaps:
- `lib/website-monitor.ts` already checks client sites hourly (via n8n) and sends Telegram alerts for downtime and SSL expiry.
- `lib/meta.ts` already connects Facebook/Instagram, but only to read posts and reply to comments. It does **not** have publishing permissions.

---

## What's on the server now (checked 2026-11-08)
- `vmi3666122` at 169.58.237.133, Ubuntu 24.04, 4 CPU, 7.8 GB RAM (about 6.7 GB free), 96 GB disk (8% used), **no swap**.
- Login: `anwaradmin` with the `nvm_deploy` key. The user is in `sudo` (password needed) but **not** in the `docker` group.
- Docker Compose stack in `/opt/anwarz` (network `anwarz`): **Caddy** (HTTPS on 80/443), **n8n** (`n8n.northviamarketing.com`), **Uptime Kuma** (`status.northviamarketing.com`). So Kuma is already installed.
- No Coolify. Easiest path: keep this Caddy + Compose setup and add new services to the same `docker-compose.yml`, not install Coolify on top.

## Phase 0: Set up the server (½–1 day)
- Install **Coolify** on Contabo. It installs the apps with one click and handles HTTPS, updates and restarts.
- DNS subdomains:
  - `status.northviamarketing.com` for Uptime Kuma
  - `analytics.northviamarketing.com` for Umami
  - `social.northviamarketing.com` for Postiz
- Firewall, SSH-key-only login, nightly backups of every app's database.
- Size: about 8 GB of RAM runs all three.
- Before starting: list what already runs on the server (n8n?) so nothing breaks.

## Phase 1: Uptime Kuma (1 day)
- Check every client site every **1 minute** (the current monitor checks once an hour).
- **Public status page per client**, e.g. `status.northviamarketing.com/<client>`.
- Alerts go to the **same Telegram bot and chat** as now.
- Overlap: once Kuma is trusted, turn off the hourly check in `lib/website-monitor.ts` to avoid duplicate alerts.
- Later: pull uptime numbers from Kuma's API into the monthly client report.

## Phase 1.5: Hermes personal assistant on Telegram (1–2 days)
Status: **in progress** (added 2026-11-08)
- Done: `docker-compose.yml` backed up to `/opt/anwarz/backups/`; `litellm` and `hermes` services added; LiteLLM running and tested.
- LiteLLM uses the **same Gemini and Groq keys as the website** (`/opt/anwarz/litellm/.env`), so they share the free daily quota. Chain: `gemini-2.5-flash` → Groq `gpt-oss-120b` → `gemini-flash-lite-latest` → Groq `llama-3.3-70b`, 45 s timeout each. (`gemini-flash-latest` hung in testing.)
- Hermes running since 2026-11-08 as Telegram bot **@Hermesanwar_bot**, allowed user `2144155349` only, polling mode, no open ports. Uses about 230 MB RAM.
- Backups: `/opt/anwarz/backup.sh` tars the whole stack (n8n, Kuma, Hermes memory, Caddy, LiteLLM, compose) into `/opt/anwarz/backups/stack-*.tar.gz` and keeps 14 days. Tested 2026-11-08 (2.9 MB). Cron entry added 2026-11-08 (01:30 server time, Europe/Berlin). Backups are on the **same disk**: copying them off the server is still to do.
- Bot token: kept as is (Ahmed's decision, 2026-11-08). Only user `2144155349` can use the bot.
- Profile: `memories/USER.md` (short) + `workspace/profile/Ahmed_Anwar_Master_Reference.txt` (full). Hermes updates both when Ahmed shares new facts.
- **Tasks, library and chat moved from Anwarz to Hermes (2026-11-08, Option B: move fully).**
  - Imported from Supabase: 13 open and 6 done tasks → `workspace/tasks/tasks.md`; 29 library items + 4 screenshots → `workspace/library/<category>.md`; client list snapshot → `workspace/clients.md`; 4 old chats → `workspace/notes/anwarz-chat-history.md`. The Supabase rows were left in place, untouched.
  - Skill `skills/productivity/ahmed-tasks-library/SKILL.md` defines the file formats and rules.
  - Cron (Cairo time): "Morning tasks" daily 09:00, "Week ahead (Sunday)" Sundays 20:00. New tasks with a time get one-shot reminder jobs.
  - Voice notes: Groq Whisper (`whisper-large-v3-turbo`, language `ar`).
  - Website side: `lib/hermes-handoff.ts`; Tasks/Library/Chat removed from the Anwarz menu and commands (old buttons and commands point to Hermes); `/api/tasks/due` returns `skipped` (`MOVED_TO_HERMES` flag). Old code kept for rollback.
- To do: off-server copy of backups, then Google Sheets access.

Goal: a Telegram assistant that **remembers everything** (clients, decisions, notes) and runs on **free AI models**.

How it fits together:
`Telegram → Hermes Agent (Contabo) → LiteLLM → free models`

- **Hermes Agent** (Nous Research, open source) keeps the memory, the Telegram chat, tools and scheduled tasks. The memory lives on the VPS, so switching models doesn't lose anything.
- **LiteLLM** (proxy) holds the API keys and falls back to the next free provider when one hits its daily limit.
- **Free model chain** (check current limits when setting up):
  1. Google Gemini (main; best for Arabic and long documents)
  2. Groq
  3. Cerebras
  4. OpenRouter `:free` models (a Nous Hermes model if one is free)
  5. Mistral free tier
  6. Ollama on the VPS with a small model, as the last resort (slow on CPU)

Setup:
- Deploy Hermes and LiteLLM as Docker containers under Coolify. **Not as root on the host.**
- A **new Telegram bot** for Hermes (don't reuse the alerts bot), locked to Ahmed's Telegram user ID only.
- Add Hermes's memory/data folder to the nightly backups.
- RAM: about +1 GB (Hermes + LiteLLM). Ollama adds about 4–8 GB if used. Check what's left after Phase 0.

Tools to give it, in order:
1. Memory and knowledge: "remember X", file uploads, "what do I know about client X?"
2. Google Sheets: through a **Google service account** that can only reach the sheets shared with it. It must show the row and ask before writing.
3. Read-only access to Uptime Kuma, Umami and (later) Postiz APIs.
4. Write actions (restarts, posting) only once it has proven reliable.

Rules:
- Free providers may log prompts. **Don't send passwords, tokens or sensitive client data** through it.
- Free models are weaker at tool use than paid ones. Keep a confirm step on anything that writes.
- Claude Code stays the tool for development on this repo. Hermes is for daily operations.

## Phase 2: Umami analytics (1–2 days)
- Chosen over Plausible: self-hosted Plausible needs ClickHouse (heavy). Umami only needs Postgres.
- Add one script tag per client site. No cookie banner needed.
- Integration: pull Umami stats via its API into the client Analytics tab, the PDF report and the Telegram analytics section, next to GA4 and Clarity.
- Use Umami for clients without GA4. Clients with both get a cross-check.

## Phase 3: Postiz social scheduling (1–2 weeks, mostly waiting on approvals)
- Chosen over Mixpost: Postiz is free and open source, with multiple clients, a calendar and AI captions. Mixpost's free version is limited.
- Approvals needed (**start these early**):
  - **Meta App Review** for `pages_manage_posts` and `instagram_content_publish`. The current Meta app doesn't have these. Review can take days to weeks.
  - **LinkedIn** developer app with the Community Management API approved, for posting to company pages.
- Integration later: Postiz API → Telegram ("posts scheduled this week", client approves a post).

---

## Order
Phase 0 → Phase 1 → Phase 1.5 (Hermes) → **submit the Meta App Review** → Phase 2 while the review is pending → Phase 3.

## Needed before starting
- What's already on the Contabo server, and SSH access with a key (no passwords in chat).
- Access to the DNS for `northviamarketing.com`.
