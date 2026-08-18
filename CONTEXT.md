# Domain Glossary — 4D Matrix

## Task

A unit of work stored in Google Tasks. The single source of truth for all views.

## Time Horizon

A **permanent** classification of how far out a task sits in your planning horizon.

| Value | Meaning |
|-------|---------|
| **Strategic** | Weeks to months — architecture, tech debt mapping, next-gen design |
| **Tactical** | Days to weeks — feature work, PR reviews, design docs |
| **Ad-Hoc** | Hours to today — support tickets, unblocks, Slack threads |
| **Exploration** | Continuous — upskilling, reading, R&D |

### Grooming Breakdown

Splitting a Strategic task is **always optional**. Small enough Strategic items can be promoted directly to the matrix (due date + quadrant) without decomposition.

When splitting is needed, use the **Split** action on a Strategic card: spawns new Tactical tasks with `Split from: …` in notes. The original stays until manually completed or deleted. No parent–child hierarchy.

## Project Context

The initiative or area a task belongs to. Implemented as a **Google Task List** — one list per project. No separate project tag.

The Master Backlog groups tasks by Time Horizon, then by Task List within each horizon.

### Backlog Layout

Four **horizon columns** (Strategic / Tactical / Ad-Hoc / Exploration). Each column has its own + button. Tasks within a column are grouped by Task List. Kanban-style board.

### Promoting to Matrix

A backlog task enters the Daily Execution Set by receiving a due date and a quadrant:

| Method | Use case |
|--------|----------|
| **Schedule** (quick action on card) | Friday grooming — pick a date + quadrant in two clicks |
| **Edit dialog** | Full edit — change horizon, notes, project, date, quadrant |

Backlog tasks have no quadrant until promoted.

## Eisenhower Quadrant

A **temporary execution placement** assigned when a task enters the daily execution set. One of: Do, Delegate, Delay, Delete.

A task in the Master Backlog may have **no quadrant** until it is pulled into today's plan.

## Master Backlog

The long-term view of all tasks, grouped by Time Horizon (and Project Context). Tasks here are not necessarily on today's matrix.

## Daily Execution Set

The subset of backlog tasks actively planned for execution on a given day. A task enters this set when it is assigned:

1. A **Due Date** — the day you intend to work it (also its deadline)
2. An **Eisenhower Quadrant** — where it sits in the matrix for that day

Tasks with no due date appear only in the Master Backlog, never in the matrix.

### Rollover

Incomplete tasks keep their quadrant. Overdue tasks remain on the matrix with an overdue badge until **manually** re-dated via Schedule or edit. No automatic date bump.

### Weekly Grooming

Every Friday, review the Master Backlog (grouped by Time Horizon). Break Strategic items into Tactical tasks, assign due dates for the coming week, and set quadrants for items entering the execution set.

## Due Date

Serves dual purpose: the **deadline** (if any) and the **planned execution date**. A task appears in the Daily Execution Set on its due date. Tasks with no due date live only in the Master Backlog.

## Views

Two views over the same task data:

| View | Purpose | Default |
|------|---------|---------|
| **Execute** (Eisenhower Matrix) | Daily tactical execution | Yes — weekday default |
| **Backlog** (Master Backlog) | Long-term horizon planning | Secondary — tab/toggle |

The app opens to the matrix. The backlog is one click away for capture, grooming, and horizon review.

### Matrix Filter

The Execute view shows tasks that have a due date **on or before today** and an assigned quadrant. Overdue tasks remain visible until re-dated or completed.

### Quadrant Guardrails

Daily composition rules (soft-enforced):

| Quadrant | Rule |
|----------|------|
| **Do (Q1)** | Warn when more than 2 active items |
| **Delay (Q2)** | Warn when no Strategic or no Exploration task is present |
| **Delegate (Q3)** | No limit |
| **Delete (Q4)** | No limit |

Violations show nudges only — never block task creation or moves.

## Task Capture

A **uniform task dialog** is used everywhere (matrix and backlog). It always includes a Time Horizon picker.

Defaults are set intelligently from context; the user can override any field:

| Capture location | Default horizon |
|------------------|-----------------|
| Matrix (+ on any quadrant) | Ad-Hoc |
| Backlog → Strategic section | Strategic |
| Backlog → Tactical section | Tactical |
| Backlog → Ad-Hoc section | Ad-Hoc |
| Backlog → Exploration section | Exploration |

Adding from the matrix also sets today's due date and the target quadrant. Adding from the backlog sets horizon (and project/list) only — no due date or quadrant until groomed.

## Migration (v1 launch)

Existing tasks receive **Time Horizon = Ad-Hoc**. Quadrants and due dates are preserved. The matrix filter (due on/before today) applies immediately. Horizons are corrected manually during grooming.

## Calendar

Out of scope for v1. Time defense (Office Hours, deep-work blocks, upskilling slots) is managed manually in Google Calendar. The app is task-only: Master Backlog + Eisenhower Matrix.
