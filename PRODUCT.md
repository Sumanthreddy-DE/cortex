# Product

## Register

product

## Users

Solo power user (project owner), all day every day, on Windows desktop. Captures links, ideas, notes constantly between work tasks via global shortcut (`Ctrl+Shift+N`), Chrome extension (`Ctrl+Shift+S`), or Telegram bot from phone. Triages by dragging items between time-priority columns. Tool runs in system tray full-time, expected to be there when summoned, gone when not. No onboarding tolerated. No login walls. The user is a developer who uses keyboard shortcuts reflexively and treats every extra click as friction.

## Product Purpose

Cortex is a local-first desktop command center for ephemeral thoughts: links worth reading, ideas worth keeping, tasks worth doing. It exists because every other tool (Notion, browser bookmarks, sticky notes, Telegram saved messages) loses things in a folder hierarchy or sync delay. Cortex collapses capture-to-triage-to-action into one keystroke loop with six time-priority lanes (Inbox → For Now → Today → Tomorrow → This Week → Someday) and tag facets. Success looks like: thought appears in head, lands in Inbox in under 2 seconds, gets dragged to a column without thinking, fires a notification at the right moment, gets archived clean.

## Brand Personality

Playful, warm, hand-made. Three-word axis: *personal · curious · alive*. Voice has a mild author voice (microcopy can wink, headers can be casual, empty states can be cheeky). Color is allowed and welcome — coral, teal, butter, sage as named accents, not just neutral gray. Rounded edges over sharp corners. Slight imperfection over machine-precise. Reflects that this is YOUR tool, made by you, for you, not a SaaS sold to a thousand companies. Closer to Raycast (keyboard-first launcher with personality) and Notion (warm friendly blocks) than to Linear (enterprise-precise) or Things 3 (Apple-restrained).

## Anti-references

- **Generic SaaS dashboard.** Big-number stat cards across the top, identical 3-column feature grids, gradient mesh backgrounds, cliché hero-metric template. The default-when-AI-makes-UI look. Cortex is not a metrics dashboard.
- **Trello / Jira corporate kanban.** Heavy shadowed cards, blue title bars, stacked user avatars on every card, due-date pills, bureaucratic chrome, "team activity" feeds. Cortex is one person's brain, not a project-management tool.
- Specifically NOT bland. Restraint as a default reads as cowardice. Cortex should look like a person made it on purpose.

## Design Principles

1. **Triage beats display.** Every screen optimizes for the next action (move, complete, archive, edit), not for reading status. If a layout shows information without offering a next move on it, redesign.
2. **Capture in one beat.** From thought to saved item must take one keystroke and zero decisions. Inbox is the universal landing zone — categorization is a separate, optional motion later.
3. **Personal voice, not corporate.** Microcopy can be casual, opinionated, even a little weird. Empty states earn their place with character. No "Welcome to Cortex! Get started by..." onboarding sludge.
4. **Tray-resident dignity.** App is always-on, opens fast, closes faster, never demands attention. Notifications are precise, never marketing.
5. **Local-first means no cloud theatre.** No sync spinners, no "saved!" toasts, no login walls, no upgrade nags. Items just exist in SQLite. Behavior reflects that.
6. **Color earns its meaning.** Each named color carries a role (priority, category, reminder, idea-vs-link). Not decorative. Not random. Not all-the-colors.

## Accessibility & Inclusion

Solo-user tool, no formal WCAG audit required, but maintain these floors so the UI stays usable in the user's actual environment (Windows, daylight + evening, occasional eye fatigue from long coding sessions):

- Body text contrast minimum 4.5:1 against background; UI chrome minimum 3:1.
- Respect `prefers-reduced-motion`: all transitions degrade to instant when set.
- Keyboard reachable for every primary action (already largely true: `n`, `/`, `Ctrl+K`, `Esc`, drag-drop has button alternatives in modal).
- Don't rely on color alone for priority/state — pair with shape, position, or label.
- Color choices must remain distinguishable for the most common color-vision deficiencies (deuteranopia, protanopia). Test palette against simulators before committing.
