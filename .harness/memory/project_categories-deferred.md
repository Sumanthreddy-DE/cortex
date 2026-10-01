---
name: Categories view shaping deferred
description: Categories redesign needs answers to several open questions before plan can be written.
type: project
originSessionId: bfb90ca8-a6f5-4ae7-a13a-b78508d2b697
---
Categories view redesign deferred to a session AFTER priority view ships. User wants to compact context first.

Folder model confirmed: parent folders contain subfolders contain cards. Example user gave: GitHub folder with Codex + Claude subfolders.

Early mockup at `mockups/v4-categories.png` (HTML at same name) — NOT confirmed by user. Just a first sketch shown for context.

**Open questions to ask user before writing categories plan:**
- Sub-sub-folders (3+ levels deep) — needed or no?
- Rename folder / subfolder — UI affordance? Inline edit, modal, double-click?
- Drag promote / demote — can a subfolder be dragged out to become a top-level folder? Can a folder be dragged into another folder to become a subfolder?
- Folder color coding — should folders get a chosen color, or stay neutral paper?
- Folder icons / glyphs — user-pickable or auto-generated (e.g. first letter)?
- "Direct in {parent}" items (parent has both subfolders and direct items) — keep this affordance or force everything into a subfolder?
- Drag from priority Inbox onto a category folder — should this work? Currently CategoryView is a separate view; cards exist in both via tags.

**Why:** user said "I have some more questions for the categories page" and chose to compact + shape next session. Skipping these questions risks a plan that misses what they want.

**How to apply:** when categories work resumes, walk through this question list FIRST, render mockups for any contested decision, then write the plan.
