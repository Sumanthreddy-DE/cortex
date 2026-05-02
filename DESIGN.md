---
name: Cortex
description: Local-first desktop command center for links, ideas, and notes — feels like a hardcover field notebook.
colors:
  paper: "#f7f1e6"
  paper-raised: "#fcf8f0"
  paper-deep: "#ede5d3"
  ink: "#2a241d"
  ink-soft: "#6c5e4e"
  ink-dim: "#9b8d7d"
  rule: "#d8cdb9"
  ink-stamp: "#3d4691"
  ink-stamp-soft: "#5b65b4"
  coral: "#e8755a"
  teal: "#3a8c91"
  butter: "#e8c958"
  sage: "#a3b896"
  violet-slate: "#7c7393"
  idea-warm: "#e89066"
  flag-red: "#c64a3d"
  margin-line: "#e8d6b8"
typography:
  display:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.01em"
    fontVariation: "'opsz' 36, 'SOFT' 50"
  headline:
    fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.005em"
    fontVariation: "'opsz' 24"
  title:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  mono:
    fontFamily: "'JetBrains Mono', 'iA Writer Mono', 'Menlo', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink-stamp}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.md}"
    padding: "14px"
  card-idea:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.md}"
    padding: "14px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    typography: "{typography.body}"
  pill-tag:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
    typography: "{typography.label}"
  pill-priority-fornow:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  pill-priority-today:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  pill-priority-tomorrow:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  pill-priority-thisweek:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  pill-priority-someday:
    backgroundColor: "{colors.violet-slate}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  modal-panel:
    backgroundColor: "{colors.paper-raised}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

<!-- TARGET — this DESIGN.md describes the warm/playful Field-Notebook visual system that PRODUCT.md calls for. Current src/renderer/styles/globals.css is a slate-blue dark theme that drifts from this target. Future impeccable runs migrate toward this spec. -->

# Design System: Cortex

## 1. Overview

**Creative North Star: "The Field Notebook"**

Cortex is a hardcover Moleskine on the desk of a working developer: cream paper, hand-set serif chapter heads, fountain-pen ink, worn cloth corners, an elastic band that snaps the day shut. The notebook is private, persistent, slightly rumpled. It is unmistakably *yours*. Every page expects to be written on, dog-eared, crossed out, finished. The interface should feel like opening that book to today's spread, not like loading a SaaS dashboard.

Density is moderate. Whitespace functions like the margin of a notebook page: never empty, always a place where the eye rests between thoughts. Color appears the way ink stamps and tab dividers appear in a real notebook: rare, meaningful, lane-coded. The serif display face does the chapter-heading work; sans body does the writing work; mono does the ledger and timestamp work. The system rejects the chrome of corporate kanban, the gradient theatre of generic SaaS, and the sterile minimalism that mistakes restraint for taste. Cortex is a *made* object.

**Key Characteristics:**
- Warm cream paper foundation, not gray, not white.
- Two type voices: serif for chapter heads (column titles, section labels), sans for writing (titles, body, UI).
- Five named lane colors that map to the six priority columns — meaning over decoration.
- Flat at rest, lift only on intent (hover, drop-target, focus).
- Hand-set imperfection: optical-size serif, slight non-uniform spacing, subtle paper grain.

## 2. Colors: The Inkpot Palette

A warm cream stage with one stamp of indigo ink for action, and five lane colors that earn their meaning by mapping to time-priority columns. Color is never decorative — every named color carries a role.

### Primary
- **Ink Stamp** (`#3d4691`, `oklch(40% 0.13 260)`): The single voice of action. Used on primary CTAs, focus rings, the brand mark. Rare on screen, ideally <8% of pixels. The committed indigo of fountain-pen ink, slightly violet-leaning, tinted toward the warm spectrum just enough that it doesn't read as "tech blue".

### Secondary (lane colors — used only on priority pills, column accents, not as decoration)
- **Coral** (`#e8755a`, `oklch(68% 0.18 30)`): For Now lane. Warm urgent red-orange, the color of a fire-station bell. Implies *attention required, but not panic*.
- **Teal** (`#3a8c91`, `oklch(58% 0.12 200)`): Today lane. Cool, focused, sea-glass. Implies *active concentration*.
- **Butter** (`#e8c958`, `oklch(85% 0.13 90)`): Tomorrow lane. Warm afternoon-light yellow. Implies *anticipation, near future*.
- **Sage** (`#a3b896`, `oklch(70% 0.07 145)`): This Week lane. Quiet, vegetal. Implies *settled, planned, not urgent*.
- **Violet Slate** (`#7c7393`, `oklch(55% 0.08 280)`): Someday lane. Distant, dusk. Implies *remote, archival*.
- **Idea Warm** (`#e89066`, `oklch(70% 0.16 50)`): Reserved for idea cards (Pen icon). The warm peach of a margin sketch, distinguishes thoughts from links and tasks.

### Tertiary
- **Flag Red** (`#c64a3d`, `oklch(55% 0.16 25)`): Destructive states only — delete confirmations, error banners. Never decorative.

### Neutral
- **Paper** (`#f7f1e6`, `oklch(96% 0.012 80)`): Default canvas. The cream of uncoated stock, warm but not yellow.
- **Paper Raised** (`#fcf8f0`, `oklch(98% 0.008 80)`): Cards, modals, raised surfaces. One half-step lighter than the page.
- **Paper Deep** (`#ede5d3`, `oklch(92% 0.015 80)`): Pressed-in surfaces — input wells, tag pill backgrounds, selected states.
- **Rule** (`#d8cdb9`, `oklch(85% 0.015 70)`): Divider lines, hairline borders. The faint blue rule of a notebook page, recolored warm.
- **Ink** (`#2a241d`, `oklch(22% 0.015 60)`): Body text. Warm near-black, never pure black.
- **Ink Soft** (`#6c5e4e`, `oklch(45% 0.02 60)`): Muted text, secondary labels.
- **Ink Dim** (`#9b8d7d`, `oklch(65% 0.015 60)`): Disabled, placeholders, time-stamps.
- **Margin Line** (`#e8d6b8`, `oklch(88% 0.04 80)`): Optional decorative ruled-line for empty states and notebook-page accents. Used sparingly.

### Named Rules

**The Stamp Rule.** Ink Stamp (primary indigo) covers no more than ~8% of any screen. It is the single voice of action: the focused CTA, the focus ring, the brand mark. If primary ink is bleeding past 10% you have failed and the screen looks like a corporate dashboard. Secondary actions wear paper-raised and ink, not stamp.

**The Lane Rule.** The five lane colors (coral, teal, butter, sage, violet-slate) are reserved exclusively for priority-column identity: pills, column header accents, drop-target highlights. They are forbidden in body text, in icons that are not lane-icons, in decorative borders, and in marketing-style accent stripes. A user must be able to glance and read the lane from color alone, without text.

**The No Pure Black Rule.** `#000` is forbidden. So is `#fff`. All neutrals are tinted toward warm 60-80° hue at 0.005-0.015 chroma. The page should never look like an OLED test pattern.

## 3. Typography

**Display Font:** Fraunces (with Iowan Old Style, Georgia, serif fallback)
**Body Font:** Inter (with Segoe UI, system-ui fallback)
**Mono Font:** JetBrains Mono (with iA Writer Mono, Menlo fallback)

**Character:** Fraunces is a contemporary revival of 1990s Hollander serifs with strong optical-size response, slight humanist warmth, and a "SOFT" axis that lets letters round at display sizes. Inter is the workhorse: neutral, dense, screen-tuned. JetBrains Mono carries the ledger work — IDs, timestamps, file paths. The pairing reads as *editor's notebook + scribe's hand*: serif marks chapter, sans does the writing.

### Hierarchy

- **Display** (Fraunces, 500, 28px / 1.15, optical 36, SOFT 50): Settings page H1, Spaces page H1, large empty-state moments. Rare on screen. When it appears, it commits.
- **Headline** (Fraunces, 500, 20px / 1.2, optical 24): Modal titles, archive section headers. The "chapter break" feel.
- **Title** (Inter, 600, 14px / 1.4): Card titles, settings rows. The spine of the interface.
- **Body** (Inter, 400, 13px / 1.55): Notes, descriptions, item bodies. Cap line length at 65–75ch in Settings and Archive views.
- **Label** (Inter, 600, 11px / 1.3, tracking 0.06em, sentence case preferred over uppercase): Column titles, field labels, metadata. Note the tracking is gentler than the current 0.04em — leans warm not corporate.
- **Mono** (JetBrains Mono, 400, 12px / 1.4): IDs, timestamps, settings stat values, port numbers, file paths.

### Named Rules

**The Two-Voice Rule.** Serif for chapter, sans for writing. Never serif in body; never sans in column titles. The voice shift is the hierarchy.

**The Sentence-Case Rule.** Default is sentence case for everything except labels (which are tracked tight-uppercase or sentence — pick one per surface, never mix). Avoid SHOUTING-CASE on titles. Cortex is a notebook, not a manual.

**The 13ch Margin Rule.** Body text never exceeds 75ch. In Settings and Archive views this is a hard cap; layout breaks before type does.

## 4. Elevation

Cortex is flat by default. Surfaces sit on the page like ink on paper — no shadow at rest, no glow, no glassy blur. Depth appears only as a *response*: a card lifts when the cursor lands on it, a modal lifts when it opens, a column tints when an item is dragged over it. Shadows are warm-tinted, never gray, because gray shadows on cream paper read as *dirty smudge*, not *lift*.

### Shadow Vocabulary

- **Card lift** (`box-shadow: 0 4px 12px oklch(22% 0.015 60 / 0.10)`): Applied on `:hover` to cards and column-list items, paired with `transform: translateY(-2px)`. Warm ink-shadow, low diffuse.
- **Modal lift** (`box-shadow: 0 18px 48px oklch(22% 0.015 60 / 0.18)`): Applied to modal panel and quick-add panel. Stronger drop, still warm.
- **Focus ring** (`box-shadow: 0 0 0 3px oklch(40% 0.13 260 / 0.20)`): Stamp-tinted outer ring on focused inputs. The ring is the focus indicator — the input border darkens slightly but the ring is what announces focus.

### Named Rules

**The Page Rule.** Surfaces are flat at rest. Lift is a response, not an attribute. If a card has shadow without hover, the shadow is wrong.

**The Warm Shadow Rule.** All shadows use warm ink (`oklch(22% 0.015 60)`) with alpha, never neutral gray. Gray shadows on cream paper look like coffee stains, not depth.

**The No Glassmorphism Rule.** Backdrop-filter blur is forbidden as decoration. The current top-bar `backdrop-filter: blur(10px)` should be removed when migrating — paper does not blur. If a sticky header needs to disambiguate from scrolling content beneath, use a 1px rule line in `colors.rule`, not a blur.

## 5. Components

### Buttons
- **Shape:** Soft-cornered rectangle (`rounded.md`, 10px). Never fully rounded except on icon-only buttons that read as stamps.
- **Primary:** Ink Stamp background, paper text, label typography, padding 10×16px. One per screen — the *committed* action. On hover, background darkens to ink. Active state pushes 1px down (`transform: translateY(1px)`).
- **Secondary:** Paper-raised background, ink text, hairline rule border (`1px solid colors.rule`). Used for cancel, save-draft, "Add to Calendar". Hover: paper-deep background.
- **Ghost:** Paper background (no border), ink-soft text. Used for tertiary actions and segmented-toggle inactive states. Hover: paper-deep background.
- **Icon button:** 32×32, rounded.md, ghost-style. Lucide icons at 16-18px, ink-soft stroke. No fill, no chip background by default.

### Segmented Toggle (the priority/category/archive switcher in TopBar)
- **Shape:** Container is paper-deep with `rounded.md`, 4px internal padding. Buttons inside are `rounded.sm` (6px), ghost-style.
- **Active state:** Paper-raised background, ink text, subtle 1px ink-stamp underline 2px below the text baseline (notebook-tab feel). Not a tinted pill — that drifts toward dashboard.
- **Inactive state:** Transparent, ink-soft text. Hover: paper text color and 50% opacity ink-soft underline.
- **Voice on labels:** sentence case, 12px, weight 500. *Priority · Category · Archive · Spaces · Settings* — never SHOUTING.

### Cards (item card, idea card)
- **Corner Style:** `rounded.md` (10px).
- **Background:** Paper-raised. No translucent overlays.
- **Border:** 1px hairline in `colors.rule`. On idea cards, swap to `idea-warm` at 40% alpha for the border only, no fill change.
- **Internal Padding:** 14px (`spacing.md` + xs).
- **Hover:** Lifts 2px (`translateY(-2px)`), card-lift shadow appears, border darkens to `oklch(85% 0.02 70)`. The current radial-mouse-glow effect goes — too video-game-y for a notebook.
- **Title:** Inter 600 14px, ink color.
- **Note preview:** Inter 400 13px, ink-soft, 3-line clamp.
- **Tag row:** Pill-tag components, 6px gap, below title.
- **Idea card distinction:** Pen icon top-left in idea-warm, idea-warm hairline border. No tinted background — that drifts toward decoration.

### Lane Pills (priority chip on cards, column count)
- **Style:** Fully rounded (`rounded.pill`), label typography, 3×10px padding. Each pill carries the lane's hue as background, paper or ink as text depending on contrast.
- **States:** No selected/unselected — these are *display*, not *control*. For the column count badge, use paper-deep bg + ink-soft text (neutral, doesn't compete with pills).

### Tag Pills (category tags on cards)
- **Style:** Paper-deep bg, ink-soft text, no border, label typography, 3×10px padding.
- **Variants:** Parent tag = full opacity. Child tag = full opacity but inherits parent color when category is also a lane. Hover: paper text, paper-raised bg.

### Inputs / Fields
- **Style:** Paper background, 1px rule border, `rounded.sm` (6px), padding 10×12px, body typography.
- **Focus:** Border darkens to `ink-stamp`, 3px stamp-tinted ring (`oklch(40% 0.13 260 / 0.20)`) appears outside the border. Mild downward push of 1px on focus to feel tactile.
- **Placeholder:** ink-dim color, italic optional but only on the quick-add main input ("what's on your mind?" — italicized to feel like a margin prompt).
- **Disabled:** Paper-deep background, ink-dim text, no border darken on focus.

### Modal Panel
- **Shape:** `rounded.lg` (14px), max-width 640px, paper-raised background.
- **Shadow:** Modal-lift shadow.
- **Backdrop:** `oklch(22% 0.015 60 / 0.55)` — warm ink scrim, not gray. No blur.
- **Header:** Headline typography, ink color, hairline rule below.
- **Footer:** Hairline rule above, primary CTA right-aligned, ghost cancel left.

### Empty States
- **Background:** Paper, dashed `1px dashed colors.margin-line` border (notebook ruled-line feel), `rounded.md`, padding 24px 16px.
- **Voice:** One line of body copy with mild personality. *"Inbox empty. Press Ctrl+Shift+N from anywhere."* not *"No items yet. Click the button to add one."*

### Quick-Add Floating Panel (signature surface)
- **Shape:** `rounded.lg` (14px), paper-raised background, modal-lift shadow.
- **Header:** Type-badge pill in ink-stamp color (paper text), label typography. *"Link"*, *"Idea"*, *"Task"* — capitalized but not tracked.
- **Main input:** No border, transparent background, body typography stepped up to 15px. Acts like writing directly on paper.
- **Footer:** Lane pills (one per column) inline, selected one wears its lane color, others wear paper-deep + ink-soft.
- **Animation on open:** Fade + 4px translateY-up, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart), 180ms.

### TopBar
- **Background:** Paper. No backdrop-filter blur. Hairline rule line at the bottom (`1px solid colors.rule`).
- **Brand:** 12×12 rounded-sm ink-stamp square + serif "Cortex" wordmark in headline 16px, ink color.
- **Search:** Ghost icon button when collapsed, expands to input with focus ring on activation.

## 6. Do's and Don'ts

### Do:
- **Do** treat paper (`#f7f1e6`) as the ground state of every screen. If a surface is white or gray, it's wrong.
- **Do** restrict Ink Stamp to one committed action per screen. The primary CTA is rare and meaningful.
- **Do** map lane colors (coral / teal / butter / sage / violet-slate) one-to-one to priority columns. Color is information.
- **Do** pair Fraunces serif on chapter heads with Inter sans on writing, never the reverse.
- **Do** keep surfaces flat at rest. Lift only on hover, drop-target, or focus — and lift with warm ink-shadow, not gray.
- **Do** write microcopy with mild voice: *"Inbox empty. Capture something."* over *"No items yet."*
- **Do** preserve hand-set imperfection: optical-size serif at large sizes, sentence case, slight letterform variation across weights.
- **Do** carry every PRODUCT.md anti-reference into the corresponding visual rule below.

### Don't:
- **Don't** ship the current dark slate-blue palette (`#020617` / `#0f172a` / `#2563eb`). It is the drift. It contradicts *playful, warm, hand-made* and reads as *enterprise-precise*. Migrate toward this DESIGN.md target.
- **Don't** use `#000` or `#fff`. All neutrals are warm-tinted (60-80° hue, 0.005-0.015 chroma).
- **Don't** apply `backdrop-filter: blur()` as decoration. Paper does not blur. Remove the existing top-bar blur during migration.
- **Don't** ship the radial mouse-follow glow on cards. Save for a future signature surface where it earns its place; on a notebook, it is video-game chrome.
- **Don't** build hero-metric stat cards across a landing zone (the "Big Number / Small Label / Gradient Accent" template). PRODUCT.md names this as Generic-SaaS-Dashboard anti-reference. The current Completed view's stat-card cluster drifts in this direction — replace with sentence-form summary text.
- **Don't** copy Trello/Jira corporate kanban: heavy drop-shadowed cards, blue title bars, stacked user avatars, due-date pills shouting in red. PRODUCT.md names this as anti-reference.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored stripe accent on cards, list items, or banners. The Idea-Card distinction uses a full hairline border in idea-warm, not a side stripe.
- **Don't** apply `background-clip: text` gradients. Single solid colors only. Hierarchy comes from weight and size, not color theatre.
- **Don't** use uppercase tracked labels everywhere. PRODUCT.md voice is *personal, curious, alive* — SHOUTING-CASE METADATA is the opposite. Reserve tight-uppercase for max two surfaces (field labels in modal, settings section heads).
- **Don't** add em dashes ("—") in microcopy. Use commas, colons, semicolons, or parentheses. Also not `--`.
- **Don't** wrap every block in a card. Cards are for items and modals. Settings rows, search results, archive rows can be hairline-bordered list rows or borderless with a rule between, not nested cards.
- **Don't** introduce gray shadows. All shadow alpha is composed against warm ink (`oklch(22% 0.015 60)`).
- **Don't** stretch the lane palette into decoration. Coral is For Now's color, not a "warm accent" you reach for to liven up an empty state.
