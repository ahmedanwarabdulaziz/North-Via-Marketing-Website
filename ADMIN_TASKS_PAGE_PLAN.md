# Phase 11: Admin Tasks Command Center

This should become your always-open agency operating page on a second screen.
The goal is not just to store tasks, but to give you a lightweight command center where you can:
- add tasks fast
- assign each task to a specific customer
- track due dates and priorities
- keep recurring obligations alive
- log quick progress notes and responses
- park future ideas without mixing them into urgent work

The page should feel operational, fast, and easy to update throughout the day.

## Product Goal

Build a new admin page at **`/admin/tasks`** that works like a living agency task board.

It should support:
- one-off tasks
- customer-linked tasks
- due dates
- recurring tasks
- quick status updates
- a separate **Future Ideas** area
- an interface that stays useful when left open all day on a secondary monitor

---

## Proposed Architecture

### 1. New Database Structures
**[MODIFY] `types/database.ts`**

We should add a dedicated task model instead of stuffing this into client notes.

### `AgencyTask`
- `id?`
- `title`
- `description?`
- `clientId?`
- `clientNameSnapshot?`
- `status`
  - `todo`
  - `in_progress`
  - `waiting`
  - `done`
  - `archived`
- `priority`
  - `low`
  - `medium`
  - `high`
  - `urgent`
- `category?`
  - examples: `reviews`, `ads`, `website`, `seo`, `follow_up`, `reporting`, `billing`
- `dueDate?`
- `scheduledDate?`
- `lastActivityAt?`
- `notes?`
- `createdAt`
- `updatedAt`
- `completedAt?`
- `createdBy?`

### Recurring fields on `AgencyTask`
- `isRecurring`
- `recurrenceType`
  - `daily`
  - `weekly`
  - `monthly`
  - `every_x_days`
- `recurrenceInterval?`
  - example: `6` for "reply to reviews every 6 days"
- `recurrenceAnchorDate?`
- `nextOccurrenceAt?`
- `lastOccurrenceCompletedAt?`
- `autoRegenerateOnComplete`

This keeps recurring work inside the same task system, while still allowing custom rules like:
- "Reply to Google reviews every 6 days"
- "Send weekly summary every Friday"
- "Check ad account pacing every Monday"

### Optional companion collection: `task_ideas`

Instead of mixing future ideas into live tasks, we can add a second lightweight object for ideas.

### `TaskIdea`
- `id?`
- `title`
- `description?`
- `clientId?`
- `clientNameSnapshot?`
- `ideaType`
  - `future_feature`
  - `upsell`
  - `process_improvement`
  - `campaign_idea`
  - `content_idea`
- `status`
  - `backlog`
  - `considering`
  - `approved`
  - `converted_to_task`
  - `archived`
- `createdAt`
- `updatedAt`

This gives you a clean split between:
- work that must happen now
- ideas worth saving for later

---

### 2. New Admin Page
**[NEW] `app/admin/tasks/page.tsx`**

We should add a new sidebar item called **Tasks** and build a dedicated page designed for all-day use.

Recommended page sections:

### Top bar
- page title: `Tasks Command Center`
- quick stats:
  - overdue
  - due today
  - waiting
  - recurring due
- quick add button

### Main layout

A 3-column desktop layout would fit your second-screen workflow very well:

### Left column: Quick Add + Filters
- quick task form
- customer dropdown
- due date picker
- repeat selector
- priority selector
- saved filters:
  - all
  - today
  - overdue
  - waiting
  - recurring
  - unassigned
  - completed recently

### Center column: Active Task List
- dense scrollable list
- status chips
- client badge
- due date
- repeat badge
- one-click status update
- sort by:
  - due date
  - priority
  - recently updated

### Right column: Detail Panel / Notes / Future Ideas
- selected task details
- progress notes
- response notes
- quick comment log
- future ideas box

This would let you keep the page open and update it continuously without opening modals all day.

---

### 3. UX Behavior for a Second Screen

Because this page will stay open for long periods, it should be optimized for low-friction updates.

Important UX rules:
- avoid heavy modal-only flows
- prefer inline editing
- keep the main task list visible while editing details
- make status updates one click
- make new task creation possible in under 10 seconds
- keep the layout readable at a medium desktop width
- support mobile fallback, but optimize first for desktop persistence

Useful interaction ideas:
- quick-add input always visible at top-left
- keyboard-friendly task creation
- default new task status = `todo`
- default sort = `due soonest`, then `urgent`, then `recently updated`
- highlight overdue tasks clearly
- show recurring tasks with a loop badge
- allow "mark done and generate next occurrence" in one action

---

### 4. Recurring Task Logic
**[NEW/MODIFY] server actions and Firestore logic**

Recurring tasks should behave like operational reminders, not just labels.

Best behavior:
- the original task acts like a recurrence template
- when a recurring task is completed, the system calculates the next due date
- it either:
  - updates the same task into the next cycle, or
  - creates a fresh next occurrence task automatically

I recommend the second option:

### Recommended recurring strategy
- keep one task record per actual cycle
- link each generated task back to its recurrence source
- preserve history cleanly
- allow reporting on what was actually completed and when

Example:
- Task: `Reply to Google reviews`
- Repeat rule: `every_x_days`
- Interval: `6`
- When completed on May 3, 2026
- Next task auto-created for May 9, 2026

This approach is much better for accountability than endlessly reusing one row.

---

### 5. Customer Assignment Flow

Tasks should connect directly to your existing client CRM.

Recommended integration:
- load clients from the existing `clients` collection
- choose a client from a searchable dropdown
- store both:
  - `clientId`
  - `clientNameSnapshot`

The snapshot protects the historical task record even if the client name changes later.

This also unlocks future filtering like:
- show all open tasks for one client
- show overdue tasks by client
- show client workload before a meeting or reporting call

---

### 6. Progress and Response Tracking

Since you mentioned "updade my tasks with responding and so on", each task should support lightweight running notes.

Two possible approaches:

### Simple version
- one `notes` field on each task
- edited inline

### Better version
- task activity log
- each entry has:
  - `message`
  - `createdAt`
  - `type`
    - `note`
    - `response`
    - `status_change`
    - `system`

I recommend the better version if we want this page to become your real operating console over time.

---

### 7. Future Ideas Section

You asked for a separate area for future ideas, which is a very smart distinction.

Recommended behavior:
- do not mix future ideas into live execution tasks
- place them in a dedicated right-side panel or separate tab
- allow converting an idea into a task with one click

Good examples for this area:
- "Offer client a local landing page refresh"
- "Test a review request SMS flow"
- "Create a before/after reporting template"
- "Pitch seasonal campaign bundle"

This keeps your active list focused while still capturing valuable ideas before they disappear.

---

### 8. Suggested Sidebar Placement
**[MODIFY] `components/admin/AdminSidebar.tsx`**

I recommend placing **Tasks** directly under **Dashboard**.

Suggested order:
1. Dashboard
2. Tasks
3. Client Portfolio
4. Google Ads
5. Leads & Form
6. Email Logs
7. Google Reviews
8. Settings

This makes sense because Tasks would become the daily operating hub.

---

## Smart Ideas To Make This Page Stronger

Here are the ideas I think would make this genuinely powerful for your workflow:

### 1. "Today Focus" strip
A dedicated strip at the top with only:
- overdue
- due today
- waiting on reply
- recurring due now

This gives you instant triage when you sit down.

### 2. Waiting status
Add a `waiting` state so you can separate:
- tasks you need to do
- tasks blocked by client reply or external action

This is one of the most useful statuses in real operations.

### 3. Snooze / reschedule
Instead of deleting or rewriting tasks, allow:
- snooze to tomorrow
- snooze 3 days
- move to next week

### 4. Client quick view
When clicking a task, show a small client summary card:
- business name
- contact name
- linked ad accounts
- recent notes

### 5. Convert review operations into recurring tasks
Because you already have Google Reviews in the admin, we can later add recurring templates like:
- reply to reviews every 6 days
- check unanswered reviews weekly

### 6. Task templates
Create reusable templates for common agency work:
- monthly report prep
- review response pass
- website content edits
- ad copy refresh
- landing page QA

### 7. "Recent wins" area
Show tasks completed in the last 7 days.
This creates momentum and helps you review progress quickly.

---

## Recommended First Release Scope

To keep the first implementation focused, I recommend this MVP:

### Phase 1 MVP
- new `/admin/tasks` page
- sidebar link
- create task
- assign client
- set due date
- set status
- set priority
- filter by overdue, today, waiting, recurring
- simple recurring rules
- future ideas section

### Phase 2
- activity log per task
- task templates
- client quick view
- recurring auto-generation history
- convert idea to task

### Phase 3
- dashboard widgets
- reminders
- email or in-app notifications
- automation hooks from reviews, leads, or reports

---

## Open Questions

1. Do you want tasks to support assignment to a team member later, even if for now it is just you?
2. Should recurring tasks create a fresh new task each cycle, or do you want one reusable task row that resets itself?
3. Do you want the **Future Ideas** section on the same page, or as a second tab inside `/admin/tasks`?
4. Should the first version support only client-linked tasks, or also fully internal agency tasks with no client attached?

---

## My Recommendation

If we build this, I would strongly recommend:
- client-linked and internal tasks both supported
- a visible `waiting` status
- recurring tasks with custom `every_x_days`
- a separate Future Ideas panel
- dense desktop-first layout with inline editing

That combination would make this page genuinely useful as an always-open daily operations screen, instead of just another admin table.
