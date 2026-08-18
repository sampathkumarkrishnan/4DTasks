# Dual-view over a single Google Tasks database

4D Matrix uses Google Tasks as the sole data store. Two views — **Execute** (Eisenhower matrix) and **Backlog** (horizon columns) — filter the same tasks differently rather than maintaining separate lists or databases.

**Time Horizon** is a permanent tag on every task. **Eisenhower Quadrant** is assigned only when a task enters the daily execution set (due date + quadrant). Tasks with no due date live in the backlog only. Due date serves as both planned execution date and deadline.

This avoids tool fragmentation (Notion + matrix + calendar) while accepting Google Tasks' lack of native views. Horizon is stored in task notes metadata; quadrant remains in the title prefix.

**Considered:** Separate Google Task lists per horizon (rejected — breaks single-database principle and complicates cross-horizon grooming). Always assigning a quadrant (rejected — clutters the matrix with long-term Strategic items).
