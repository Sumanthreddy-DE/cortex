# Cortex Backlog

Living list of open issues, deferred work, and known caveats. Updated each session.

**Severity rubric**
- **S1** — blocker / data loss / broken demo. Fix before next ship.
- **S2** — UX gap, missing polish, deferred decision.
- **S3** — tech debt, deprecations, low-impact polish, dead code.

**Conventions**
- New issue → append to correct severity section.
- Mention by short slug in commit body (e.g. "Closes: my-issue-slug").
- On close → move to **Done this session** with commit SHA.
- End of session → user sweeps **Done** → **Archived** (one-line compress).
- Last swept: **2026-09-28** (initialised).

**Not duplicated here:** next work is `docs/superpowers/plans/2026-07-18-phase-5-close-the-loop.md`
(triage mode, Discord digest, receipts, Telegram teardown). Feature ideas are
`docs/superpowers/plans/feature-backlog.md` (items 9-11 open).

---

## Open — S1 (blocker / broken demo)

_(none yet)_

---

## Open — S2 (UX gap, polish, deferred decisions)

- **calendar-runtime-unverified** — "Add to Calendar" (`src/main/calendar.ts`, EditModal) is
  wired and unit-tested but has never been checked end-to-end. It shells to `gws`, whose auth was
  never completed (disabled in the rulebook 2026-07-03). Either authenticate gws and click it once,
  or remove the button — phase 5 already moves the digest off gws. *(found 2026-09-28)*
- **chrome-ext-untested** — `chrome-extension/` (f596bcc) has never been runtime-tested. Load it
  unpacked, press Ctrl+Shift+S, confirm the item lands in Inbox. The phase-1b plan's domain
  auto-tag suggestion was never built (`popup.js:56` sends `tags: []`). *(found 2026-09-28)*
- **plans-folder-move** — 11 done/superseded plans still sit in `docs/superpowers/plans/`. Decide
  whether to move them to `docs/exec-plans/completed/` (harness not initialised here yet —
  `new-project-init.sh` would create `docs/exec-plans/`). *(found 2026-09-28)*

---

## Open — S3 (tech debt, deprecations, low-impact polish)

- **distiller-branch-wip** — `feature/youtube-distiller-prototype` (ae116c5..9c2c888) is unmerged,
  and its worktree at `~/.config/superpowers/worktrees/cortex/youtube-distiller` holds 271 lines
  of uncommitted WIP from 2026-04-29. Plan is `paused`. Commit or discard the WIP before it is
  forgotten; resume via feature-backlog item 10. *(found 2026-09-28)*
- **specs-dir-gitignored** — `.gitignore:37` ignores `docs/superpowers/specs/`; only two specs are
  force-tracked. `CATEGORY_VIEW_REDESIGN_PLAN.md` is untracked, so its status edits never reach git.
  Track it, archive it, or drop the ignore rule. *(found 2026-09-28)*

---

## Doing

_(items currently being worked — move from Open when started, back to Open if paused.)_

---

## Done this session (2026-09-28)

- Plan-status triage, verified from disk: cc9c681 (5 files), dc92dfc (14 files).
- Unused `cortex-design` skill bundle archived to `Archive/design-system-export/`: 031b97c.

---

## Archived (older sweeps, compressed)

_(empty — populates over time as one-line entries per sweep.)_
