# Cortex Design System

A comprehensive design system for **Cortex**, a local-first desktop command center for links, ideas, and notes organized by time priority and category.

## Product Context

**Cortex** is a Windows desktop Electron app that captures links, ideas, and notes with a global keyboard shortcut (`Ctrl+Shift+N`), Chrome extension (`Ctrl+Shift+S`), and Telegram bot integration. Items are organized across six priority columns (Inbox → For Now → Today → Tomorrow → This Week → Someday) and can be tagged for category-based browsing.

The app runs in the system tray, uses local SQLite storage (no cloud required), and provides reminders, midnight promotion of items, and morning digest notifications.

### Key Features
- **Priority Kanban** — Six time-based columns for triage
- **Category View** — Tag-based grouping with drag-and-drop
- **Global Quick-Add** — Always-available capture window
- **Chrome Extension** — One-click link saving
- **Telegram Bot** — Mobile capture
- **Reminders** — Per-item notifications
- **Archive & Completed Views** — Full history tracking

## Sources

This design system was created from the following sources:

**Codebase:** `cortex/` (local mounted folder via File System Access API)
- Full Electron + React + SQLite application
- Location: User's local filesystem, mounted as read-only
- Key files: `DESIGN.md`, `DESIGN.json`, `PRODUCT.md`, mockups in `mockups/`
- Component implementations in `src/renderer/components/`
- Current styles in `src/renderer/styles/globals.css`

**Existing Design Documentation:**
- `DESIGN.md` — Complete visual system specification ("The Field Notebook")
- `DESIGN.json` — Structured design tokens and component definitions
- `PRODUCT.md` — Product purpose, users, brand personality

**Mockups & Prototypes:**
- Several HTML mockups showing design evolution in `mockups/`
- Category view iterations, priority board variations

## Design Philosophy: "The Field Notebook"

Cortex feels like a hardcover Moleskine on a developer's desk: cream paper, hand-set serif chapter heads, fountain-pen ink, worn cloth corners. The interface should feel like opening a personal notebook to today's spread, not loading a SaaS dashboard.

**Key Characteristics:**
- Warm cream paper foundation (#f7f1e6), never gray or white
- Two type voices: serif (Fraunces) for chapter heads, sans (Inter) for writing
- Five named lane colors mapped to priority columns
- Flat at rest, lift only on hover/focus/drop-target
- Hand-set imperfection: optical-size serif, sentence case, subtle warmth

**Brand Personality:** Playful, warm, hand-made. *Personal · curious · alive*. Mild author voice in microcopy. Rounded edges over sharp corners.

**Anti-references:**
- Generic SaaS dashboard (big stat cards, gradient meshes, cliché hero metrics)
- Trello/Jira corporate kanban (heavy shadows, blue title bars, bureaucratic chrome)
- Bland restraint without personality

## Content Fundamentals

**Voice & Tone:**
- **Personal, not corporate** — Microcopy has a mild author voice. Empty states can be cheeky: *"Inbox empty. Press Ctrl+Shift+N from anywhere."* not *"No items yet. Click the button to add one."*
- **Sentence case preferred** — Avoid SHOUTING-CASE except for very specific labels (max 2 surfaces). Cortex is a notebook, not a manual.
- **Casual, opinionated, alive** — The tool has personality. Headers can be casual, empty states can wink.
- **"You" voice** — Direct address when giving instructions or feedback.
- **No em dashes** — Use commas, colons, semicolons, or parentheses in microcopy.
- **Emoji** — Not used in the current design system unless explicitly part of brand materials.

**Key Messaging:**
- Emphasis on speed: "2 seconds from thought to Inbox"
- Local-first benefits: "Zero cloud required", "Items just exist in SQLite"
- Always-available: "Always running in system tray"
- Triage-focused: "Capture in one beat, categorize later"

## Visual Foundations

**Creative North Star: "The Field Notebook"**

Cortex feels like a hardcover Moleskine on a developer's desk: cream paper, hand-set serif chapter heads, fountain-pen ink, worn cloth corners, an elastic band that snaps the day shut.

### Color Philosophy

**Warm cream stage, not gray:** The entire interface sits on `--paper` (#f7f1e6), a warm cream that reads as uncoated stock. Never pure white, never neutral gray. All neutrals are warm-tinted (60-80° hue at 0.005-0.015 chroma).

**The Stamp Rule:** Ink Stamp (primary indigo, `#3d4691`) covers no more than ~8% of any screen. It is the single voice of action: the focused CTA, the focus ring, the brand mark. Secondary actions use paper-raised and ink, not stamp.

**The Lane Rule:** Five lane colors (coral, teal, butter, sage, violet-slate) are reserved exclusively for priority-column identity. They map 1:1 to the time columns and are forbidden in decorative use, body text, or non-lane icons.

**Lane Color Meanings:**
- **Coral** (#e8755a) — For Now (urgent attention, fire-station bell)
- **Teal** (#3a8c91) — Today (focused concentration, sea-glass)
- **Butter** (#e8c958) — Tomorrow (anticipation, afternoon light)
- **Sage** (#a3b896) — This Week (settled, vegetal, planned)
- **Violet Slate** (#7c7393) — Someday (distant, dusk, archival)

**Idea Warm** (#e89066) — Reserved for idea-type cards. The warm peach of a margin sketch.

### Typography

**Two-Voice Rule:** Serif (Fraunces) for chapter heads, sans (Inter) for writing. Never serif in body; never sans in column titles. The voice shift is the hierarchy.

**Fraunces** is used for:
- Settings/Spaces page H1
- Modal titles, archive section headers
- Column titles (with optical-size variation)
- Empty state messages (italic)

**Inter** is used for:
- Card titles, settings rows
- Body text, notes, descriptions
- Labels, metadata
- UI controls

**JetBrains Mono** is used for:
- IDs, timestamps
- Port numbers, file paths
- Settings stat values

### Elevation & Shadows

**Flat at rest, lift on intent.** Surfaces have no shadow unless hovered, focused, or being dragged over. This is critical: a card with shadow at rest breaks the notebook metaphor.

**Warm shadows only.** All shadows use warm ink (`rgba(42, 36, 29, ...)`) with alpha, never neutral gray. Gray shadows on cream paper read as coffee stains, not depth.

**Shadow Vocabulary:**
- `--shadow-card` — 0 4px 12px, 10% opacity, used on hover with translateY(-2px)
- `--shadow-modal` — 0 18px 48px, 18% opacity, for modal panels and quick-add
- `--focus-ring` — 0 0 0 3px, stamp-tinted at 20% opacity

**No glassmorphism.** Backdrop-filter blur is forbidden as decoration. Paper does not blur.

### Layout & Spacing

**Moderate density.** Whitespace functions like the margin of a notebook page: always a place where the eye rests between thoughts.

**Rounded corners:** Soft corners (10px, 14px) over sharp edges. Fully rounded only for pills and icon-only buttons that read as stamps.

**Spacing scale:** 4px / 8px / 12px / 18px / 24px / 32px

**Grid systems:** Priority board uses fixed column widths (240-360px). Category view uses auto-fill grid with 240px minimum.

### Interaction & Motion

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quart) for all state transitions.

**Durations:**
- 80ms — Instant feedback (hover, button press)
- 180ms — Quick transitions (card lift, toggle change)
- 280ms — Considered transitions (modal enter, large surfaces)

**Hover states:** Cards lift 2px with shadow. Buttons darken slightly. Borders gain stamp color.

**Press states:** Buttons push down 1px (`translateY(1px)`).

**Focus states:** 3px stamp-tinted ring outside border. Input border also darkens to stamp.

### Anti-Patterns to Avoid

From DESIGN.md "Don'ts":
- ❌ Dark slate-blue palette (#020617 / #0f172a / #2563eb) — contradicts warm playful feel
- ❌ Pure black (#000) or pure white (#fff)
- ❌ Backdrop-filter blur as decoration
- ❌ Radial mouse-follow glow on cards (video-game chrome)
- ❌ Hero-metric stat-card clusters (Generic SaaS Dashboard)
- ❌ Heavy shadowed cards, blue title bars, avatar stacks (Trello/Jira)
- ❌ Colored side-stripe accents (border-left > 1px)
- ❌ Background-clip text gradients
- ❌ Uppercase tracked labels everywhere
- ❌ Gray shadows
- ❌ Lane colors used decoratively

## Iconography

**System:** Cortex uses **Lucide React** icons throughout the application. These are:
- 16-18px size typically
- `--ink-soft` stroke color (#6c5e4e)
- No fill, stroke-based
- 1.5-2px stroke width
- Rounded line caps and joins

**Common Icons:**
- Search (magnifying glass)
- Plus (add items)
- Settings (gear)
- Pen/Edit (idea cards)
- Trash (delete)
- Check (complete)
- Clock (reminders)
- Calendar
- Archive box

**Icon Usage:**
- Always 16-18px in UI controls
- Paired with text in buttons when space allows
- Icon-only buttons are 32×32px minimum (touch target)
- Color inherits from parent or uses `--ink-soft` / `--ink-dim`

**No custom SVG illustrations.** The current design uses system icons only. Brand mark is a simple 12×12px rounded square in ink-stamp color.

**Emoji:** Not currently used in the design system. Avoid unless explicitly requested or found in brand materials.

## Files in This Design System

```
/
├── README.md (this file)
├── SKILL.md
├── colors_and_type.css — All design tokens as CSS custom properties
├── assets/
│   ├── brand-icon-128.png
│   ├── brand-icon-48.png
│   └── brand-icon-16.png
├── preview/ — Design System tab cards
│   ├── colors-neutrals.html — Paper, ink, rule colors
│   ├── colors-primary-lanes.html — Ink stamp + 5 lane colors
│   ├── typography.html — Type scale specimens
│   ├── buttons.html — Primary, secondary, ghost, icon buttons
│   ├── cards.html — Link & idea cards
│   └── inputs-pills.html — Text inputs, tag pills, lane pills
└── ui_kits/
    └── cortex_app/
        ├── README.md
        └── index.html — Interactive Priority board
```

### Preview Cards

The `preview/` folder contains small HTML cards registered in the Design System tab. These demonstrate individual design elements (colors, typography, components) at ~700×400-600px each.

### UI Kit

The `ui_kits/cortex_app/` folder contains a high-fidelity recreation of the Cortex Priority board view. Open `index.html` to see an interactive kanban with sample data. This is a cosmetic recreation focused on visual accuracy — drag-drop and full app functionality are simplified for design purposes.
