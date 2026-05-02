# Cortex Design Phase 1: Token Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is fully self-contained — every token value, font import, and CSS rule is spelled out below. You do NOT need to read DESIGN.md or DESIGN.json to complete this plan.

**Goal:** Replace the dark slate-blue color palette and Inter-only typography in `src/renderer/styles/globals.css` with the warm Field-Notebook tokens defined in `DESIGN.md`. Keep all existing component class names and layout intact. Maintain backward-compatibility by aliasing legacy CSS variable names (`--bg`, `--text`, `--primary`, etc.) to new tokens (`--paper`, `--ink`, `--ink-stamp`, etc.) so existing components keep rendering without simultaneous edits.

**Out of scope:** Component layout changes, new component CSS, removing inline `rgba()` literals scattered through `globals.css` (those map to slate colors and will look "drifted" after this phase — that's expected). Phase 2 sweeps them.

**Architecture:** Single file edit (`src/renderer/styles/globals.css`) plus one font-import line in `src/renderer/index.html` and `src/renderer/quick-add.html`. The result: app renders in cream + warm ink immediately, every existing component inherits new colors via the aliased variables. Some hover/drop-target states will still flash the old slate-blue tints — leave those for Phase 2.

**Tech stack:** No new dependencies. Google Fonts via `<link>` tag. CSS custom properties only.

**Acceptance criteria:**
- App boots in `npm run dev` with no console errors.
- Background renders as warm cream (`#f7f1e6`), not slate.
- Body text renders as warm ink (`#2a241d`), not slate-50.
- Three font families load: Fraunces (serif), Inter (sans), JetBrains Mono.
- All existing class names (`.card-shell`, `.topbar`, `.button-primary`, etc.) still resolve to *some* color via aliased vars.
- TypeScript still passes (`npm run typecheck`).
- Existing unit tests pass (`npm run test:unit`).

---

## File Structure

- Modify: `src/renderer/styles/globals.css` (replace `:root` block, body styles)
- Modify: `src/renderer/index.html` (add Google Fonts link)
- Modify: `src/renderer/quick-add.html` (add Google Fonts link)

---

## Task 1: Add Google Fonts import

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/quick-add.html`

- [ ] **Step 1: Add font preconnect + stylesheet link to `src/renderer/index.html`**

Inside the `<head>` block, before any existing `<link>` or `<script>` tags, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
```

- [ ] **Step 2: Add the same three `<link>` tags to `src/renderer/quick-add.html`**

Place them in the same position relative to the `<head>` of that file.

- [ ] **Step 3: Verify dev server boots and fonts load**

Run `npm run dev`. Open the Electron window. Open DevTools, Network tab. Filter for "fonts.googleapis.com". Confirm at least one CSS file (Fraunces) and the woff2 font files for Inter and JetBrains Mono load with status 200. Close dev server.

---

## Task 2: Replace `:root` token block in globals.css

**Files:**
- Modify: `src/renderer/styles/globals.css`

- [ ] **Step 1: Read the current `:root` block at the top of `src/renderer/styles/globals.css`**

The current block starts at line 1 with `:root {` and ends at the closing `}` (around line 18). Note the existing variable names — they are referenced throughout the file via `var(--bg)`, `var(--surface)`, etc.

- [ ] **Step 2: Replace the entire `:root` block with the new token set**

Replace lines 1-18 (the current `:root { ... }` block) with the following:

```css
:root {
  color-scheme: light;

  --paper: #f7f1e6;
  --paper-raised: #fcf8f0;
  --paper-deep: #ede5d3;
  --ink: #2a241d;
  --ink-soft: #6c5e4e;
  --ink-dim: #9b8d7d;
  --rule: #d8cdb9;
  --margin-line: #e8d6b8;
  --ink-stamp: #3d4691;
  --ink-stamp-soft: #5b65b4;

  --lane-coral: #e8755a;
  --lane-teal: #3a8c91;
  --lane-butter: #e8c958;
  --lane-sage: #a3b896;
  --lane-violet: #7c7393;

  --idea-warm: #e89066;
  --flag-red: #c64a3d;

  --bg: var(--paper);
  --surface: var(--paper-raised);
  --surface-2: var(--paper-deep);
  --border: var(--rule);
  --border-dim: var(--rule);
  --text: var(--ink);
  --text-muted: var(--ink-soft);
  --text-dim: var(--ink-dim);
  --primary: var(--ink-stamp);
  --accent: var(--idea-warm);
  --danger: var(--flag-red);

  --shadow-card: 0 4px 12px rgba(42, 36, 29, 0.10);
  --shadow-modal: 0 18px 48px rgba(42, 36, 29, 0.18);
  --shadow-strong: var(--shadow-modal);
  --focus-ring: 0 0 0 3px rgba(61, 70, 145, 0.20);

  --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-instant: 80ms;
  --duration-quick: 180ms;
  --duration-considered: 280ms;

  --font-display: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  --font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'iA Writer Mono', Menlo, monospace;

  font-family: var(--font-body);
  background: var(--paper);
  color: var(--ink);
}
```

- [ ] **Step 3: Verify the rest of `globals.css` was NOT modified**

Diff against git: `git diff src/renderer/styles/globals.css`. Only the `:root` block (lines 1-18, expanded to roughly 60 lines) should differ. Lines 20+ (`* { box-sizing: ... }`, `html, body, #root { ... }`, etc.) must be unchanged.

---

## Task 3: Update body and html font references

**Files:**
- Modify: `src/renderer/styles/globals.css`

- [ ] **Step 1: Find the `body` selector around line 32-36**

It currently reads:

```css
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 2: Replace its `font-family` value to use the new variable**

Change `font-family: 'Inter', sans-serif;` to `font-family: var(--font-body);`. Keep `background: var(--bg);` and `color: var(--text);` exactly as they are — those alias correctly to the new tokens.

The block becomes:

```css
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}
```

---

## Task 4: Verify everything builds and renders

**Files:**
- None modified in this task; verification only.

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Must exit 0. If TypeScript errors appear, they are unrelated to this plan — stop and report them.

- [ ] **Step 2: Run unit tests**

```bash
npm run test:unit
```

Must exit 0. If any test fails referencing colors, fonts, or CSS, stop and report.

- [ ] **Step 3: Boot the dev server visually**

```bash
npm run dev
```

Wait for the Electron window to open. Confirm by visual inspection:
- Background is warm cream, not dark.
- Body text is warm dark brown, not light gray.
- Card surfaces are slightly lighter cream, not slate.
- TopBar still works (segmented toggle, search, +, gear).
- Adding an item still works (`Ctrl+Shift+N` opens quick-add).

Some surfaces will look "off" — focus rings flash blue, hover states still tint slate, drop-target highlights remain slate-blue. **This is expected.** Phase 2 fixes those. Do NOT chase them in this phase.

- [ ] **Step 4: Boot the browser preview**

```bash
npm run web:dev
```

Open `http://127.0.0.1:5173`. Confirm same visual changes apply. Close.

- [ ] **Step 5: Confirm git diff is scoped**

```bash
git diff --stat src/renderer/styles/globals.css src/renderer/index.html src/renderer/quick-add.html
```

Only those three files should appear. If any other file shows changes, revert them before reporting completion.

---

## Done

When all tasks above are checked, Phase 1 is complete. The app now renders in the warm Field-Notebook palette using the new token system, while every existing component class continues to resolve through the aliased legacy variables. Phase 2 will redesign the priority view, segmented toggle, and category toggle on top of these tokens — leave that work to the next plan.

## Rollback

If anything goes wrong: `git checkout src/renderer/styles/globals.css src/renderer/index.html src/renderer/quick-add.html`. Plan is fully reversible via git, no data or schema changes involved.
