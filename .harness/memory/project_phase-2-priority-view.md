---
name: Phase 2 plan written, not executed
description: Cortex priority view redesign plan ready for handoff. Phase 1 tokens already in code.
type: project
originSessionId: bfb90ca8-a6f5-4ae7-a13a-b78508d2b697
---
Plan: `docs/superpowers/plans/2026-05-01-cortex-design-phase2-priority-view.md`. Status: written, NOT yet executed (no code changes for phase 2 made).

Phase 1 (token migration to paper/ink) IS done in code — `src/renderer/styles/globals.css` `:root` has paper/ink tokens, `index.html` + `quick-add.html` load Fraunces+Inter+JetBrains Mono. Not yet committed (working tree change).

Reference target: `mockups/v3-buckets-bar.png` (HTML at same name).

Locked decisions (do not relitigate):
- 5 priority lanes only: Inbox · Today · Tomorrow · This week · Someday. For Now dropped from UI (already excluded from `BOARD_PRIORITIES`); kept in DB schema as legacy.
- Today is hero — Fraunces 28px heading, 360px column width; others Inter 13px / 240px.
- Daily/Groceries/Tools collapse into a compact `buckets-bar` of three drop-target pills above the lanes. Click pill = expand inline.
- Cards: paper-raised bg, hairline `--rule` border, no left side-stripe (impeccable absolute-ban), no mouse-tracking radial glow. Hover = translateY(-2px) + warm shadow.
- Idea cards keep orange `IDEA` mono kicker; link cards have NO kicker (lane heading carries the lane).
- Top tabs notebook style — sentence-case, ink-stamp 2px underline on active, no icons. No sidebar (rejected; only 5 nav items, no tree).
- Brand lockup simplified — `<span class="brand-mark">` + `<span class="brand-name">Cortex</span>` (Fraunces 16px). Drop `brand-copy` wrapper.

**Why:** user shaped this across one long session looking at two playwright-rendered mockups (v2-lean vs v3-buckets-bar) and picked v3.

**How to apply:** when resuming, either execute the plan file directly or hand it to another agent. Do not re-shape — user is done deciding for priority view.
