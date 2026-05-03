# Antigravity Build Brief: Admin Tasks Command Center

Use this brief as the implementation spec for the new **Tasks Command Center** inside the admin dashboard.

This page is meant to stay open all day on a secondary screen and act as the agency's operating console for execution, follow-up, recurring work, and idea capture.

Reference discussion doc:
- `ADMIN_TASKS_PAGE_PLAN.md`

---

## Final Product Direction

Build a new admin page at:
- **`/admin/tasks`**

This page must become the primary daily operations view, not a simple CRUD table.

It should support:
- internal agency tasks
- client-linked tasks
- due dates
- priorities
- recurring tasks
- quick status updates
- lightweight running notes
- a separate **Future Ideas** area
- desktop-first usability for an always-open second screen

This build should include all recommended features from the planning discussion.

---

## Product Decisions Locked In

These are not open questions anymore. Build with these decisions:

1. Support both:
- client-linked tasks
- internal tasks with no client attached

2. Include a dedicated `waiting` status for blocked tasks.

3. Recurring tasks must support:
- daily
- weekly
- monthly
- every X days

4. Recurring tasks should create a **fresh new task record for each cycle**.

5. Include a separate **Future Ideas** panel or tab inside `/admin/tasks`.

6. Optimize the UI for:
- dense desktop layout
- fast updates
- inline edits where practical
- minimum friction during the workday

7. The page should be placed in the admin sidebar directly under **Dashboard**.

---

## Core User Experience Goal

When the page is open on a second monitor, I should be able to:
- see what is urgent immediately
- add a task in seconds
- assign it to a customer if needed
- set a due date
- mark work as waiting, active, or done
- keep repeating obligations alive automatically
- write short progress or response notes
- store future ideas separately without polluting the active work list

The experience should feel like a command center, not like filling out forms all day.

---

## Required UI Structure

Build the page as a 3-column desktop layout.

### Column 1: Quick Add + Filters
Required elements:
- quick add task form
- title field
- optional client selector
- due date input
- priority selector
- recurring rule selector
- create button
- filter controls

Required filters:
- all
- today
- overdue
- waiting
- recurring
- unassigned
- completed recently

### Column 2: Active Task List
Required elements:
- dense scrollable task list
- clear task title
- client badge if assigned
- due date
- priority badge
- recurring badge
- status indicator
- one-click status update actions

Default sort order:
1. overdue
2. due today / due soon
3. urgent priority
4. recently updated

### Column 3: Task Details + Future Ideas
Required elements:
- selected task details
- editable notes area
- small activity/history area if implemented in MVP
- due date and recurrence summary
- quick action buttons
- separate Future Ideas section

This right column should remain visible while the list stays available in the center.

---

## Required Task Data Model

Add a new `AgencyTask` type in `types/database.ts`.

Required fields:
- `id?`
- `title`
- `description?`
- `clientId?`
- `clientNameSnapshot?`
- `status`
- `priority`
- `category?`
- `dueDate?`
- `scheduledDate?`
- `notes?`
- `isRecurring`
- `recurrenceType?`
- `recurrenceInterval?`
- `recurrenceAnchorDate?`
- `nextOccurrenceAt?`
- `lastOccurrenceCompletedAt?`
- `recurrenceParentId?`
- `autoRegenerateOnComplete`
- `lastActivityAt?`
- `createdAt`
- `updatedAt`
- `completedAt?`

Required status values:
- `todo`
- `in_progress`
- `waiting`
- `done`
- `archived`

Required priority values:
- `low`
- `medium`
- `high`
- `urgent`

Recommended category values:
- `reviews`
- `ads`
- `website`
- `seo`
- `follow_up`
- `reporting`
- `billing`
- `internal`

---

## Required Future Ideas Model

Add a separate idea object rather than mixing ideas into live tasks.

Add `TaskIdea` in `types/database.ts`.

Required fields:
- `id?`
- `title`
- `description?`
- `clientId?`
- `clientNameSnapshot?`
- `ideaType`
- `status`
- `createdAt`
- `updatedAt`

Required idea types:
- `future_feature`
- `upsell`
- `process_improvement`
- `campaign_idea`
- `content_idea`

Required statuses:
- `backlog`
- `considering`
- `approved`
- `converted_to_task`
- `archived`

---

## Recurring Task Rules

Recurring tasks are a first-class feature and must work operationally.

### Required recurrence options
- daily
- weekly
- monthly
- every X days

### Required recurrence behavior
When a recurring task is completed:
- mark the current task as done
- preserve its completion history
- generate the next task instance automatically
- carry over the recurrence rule and relevant metadata

### Example behavior
If the task is:
- `Reply to Google reviews`

And the recurrence rule is:
- every 6 days

If completed on:
- May 3, 2026

Then the next task should be auto-created for:
- May 9, 2026

Do not simply "reset" the old task row. We want real history.

---

## Client Integration Requirements

Tasks must integrate with the existing CRM client structure.

Required behavior:
- load clients from the existing `clients` collection
- allow optional client assignment during creation
- store both `clientId` and `clientNameSnapshot`

Tasks must still be creatable without a client.

This page should support future filtering such as:
- open tasks for one client
- overdue tasks by client
- client-specific workload review

---

## Notes and Progress Tracking

The system must support lightweight ongoing updates inside a task.

### MVP minimum
- editable `notes` field on each task

### Preferred if time allows in same build
- small task activity log

Recommended activity entry types:
- `note`
- `response`
- `status_change`
- `system`

This matters because the page will be used continuously for real follow-up work and response tracking.

---

## Future Ideas Requirements

Include a dedicated **Future Ideas** area inside `/admin/tasks`.

This can be:
- a panel in the right column
- or a tab inside the same page

Purpose:
- keep ideas separate from urgent tasks
- capture ideas before they are forgotten
- allow future conversion into execution work

Required capability:
- create idea
- assign optional client
- store short description

Preferred capability:
- convert idea into a real task

Examples of ideas this section should support:
- landing page refresh suggestion
- review-request SMS automation
- reporting template upgrade
- seasonal campaign concept

---

## Sidebar Requirement

Update `components/admin/AdminSidebar.tsx`.

Add:
- `Tasks`

Place it directly under:
- `Dashboard`

Recommended order:
1. Dashboard
2. Tasks
3. Client Portfolio
4. Google Ads
5. Leads & Form
6. Email Logs
7. Google Reviews
8. Settings

---

## UX Rules That Must Be Respected

1. Avoid modal-heavy flows for frequent actions.
2. Prefer inline editing where reasonable.
3. Keep task creation fast.
4. Keep task list visible while details are edited.
5. Make status updates quick and obvious.
6. Make overdue tasks highly visible.
7. Show recurring tasks clearly with a repeat indicator.
8. Optimize for desktop-first persistent use.
9. Preserve mobile compatibility, but desktop workflow is the priority.

---

## Strongly Recommended Enhancements

If scope allows, include these in the first build:

### Today Focus strip
Show:
- overdue
- due today
- waiting
- recurring due now

### Snooze actions
Quick actions:
- tomorrow
- +3 days
- next week

### Recent wins
Show recently completed tasks for momentum and review.

### Task templates
Useful future-ready templates:
- monthly report prep
- review response pass
- website edits
- ad copy refresh
- landing page QA

---

## Suggested File Targets

Likely implementation files:
- `app/admin/tasks/page.tsx`
- `components/admin/AdminSidebar.tsx`
- `types/database.ts`

Possible supporting files depending on implementation approach:
- `app/actions/tasks.ts`
- `app/actions/task-ideas.ts`
- `components/admin/tasks/*`

The final file breakdown is flexible as long as the behavior and structure above are delivered cleanly.

---

## MVP Acceptance Criteria

The build is successful when all of the following are true:

1. `/admin/tasks` exists and is linked in the admin sidebar.
2. I can create a task with title, optional client, due date, priority, and recurrence.
3. I can create a task with no client attached.
4. I can mark a task as `todo`, `in_progress`, `waiting`, or `done`.
5. Overdue tasks are visually obvious.
6. Recurring tasks support custom "every X days".
7. Completing a recurring task creates the next occurrence automatically.
8. The task list is usable as a dense second-screen workspace.
9. The page includes a dedicated Future Ideas area.
10. I can add notes or progress text to a task.

---

## Build Priority Order

Implement in this order:

1. data models
2. sidebar link
3. `/admin/tasks` page shell
4. task creation
5. filters and task list
6. task detail / notes
7. recurring logic
8. future ideas section
9. visual refinement for second-screen use

---

## Final Guidance

This page should feel operational, calm, and fast.

Avoid turning it into:
- a generic database table
- a modal jungle
- a pretty but slow dashboard

Instead, make it feel like a real agency control panel that can stay open all day and absorb small updates quickly without interrupting the workflow.
