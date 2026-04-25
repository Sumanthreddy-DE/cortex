# Cortex — Feature Backlog

This is the running list of future feature ideas. Add new ideas here as they come to you.
When you're ready to build one, open a Claude Code session and say:
**"Let's build [feature name] from the Cortex backlog."**

Claude will read this file, run brainstorming, produce a spec, and write an implementation plan.

---

## How to Add a Feature

Copy this template and fill it in. You don't need to answer every field — even a one-line description is enough to start building.

```markdown
### Feature Name

**What:** One sentence — what does it do?
**Why:** What problem does it solve / what pain does it remove?
**How I imagine it:** Any UI or behavior details you have in mind (optional)
**Priority:** High / Medium / Low / Someday
**Phase:** Which phase would this fit into, or does it need its own?
**Notes:** Anything else — constraints, inspiration, related features
```

---

## Confirmed Future Phases (from design spec)

These were already discussed and agreed on during design. Not fully specced yet — add details as you have them.

### Phase 6: Bulk Tag Editing

**What:** Select multiple items and apply/remove tags in one action.
**Why:** When reorganizing categories, re-tagging 20 items one by one is tedious.
**How I imagine it:** Checkbox mode activated by long-press or a multi-select button. Bottom action bar appears with "Add tag" / "Remove tag" / "Archive" options.
**Priority:** Medium
**Notes:** Related to Category view drag-and-drop — bulk tag edit is the "power user" version.

---

### Phase 6: Chrome Bookmarks Import

**What:** One-click import of all Chrome bookmarks into Cortex Inbox.
**Why:** Getting existing links into the system without manually re-adding them.
**How I imagine it:** Settings page button "Import from Chrome" → parse bookmarks HTML export file → batch insert as Inbox links.
**Priority:** Medium
**Notes:** Chrome exports bookmarks as a `.html` file (Netscape format). Could also read from Chrome's JSON profile if the path is known.

---

### Phase 6: Light Mode

**What:** Toggle between dark (current) and light color scheme.
**Why:** Usability in bright environments.
**How I imagine it:** Toggle in Settings. System preference detection as default.
**Priority:** Low
**Notes:** All colors currently hardcoded as CSS variables in `globals.css`. Light mode = swap the variable values. Design spec deferred this to Phase 5/6.

---

### Phase 6: Mobile PWA

**What:** Progressive Web App version accessible from mobile browser.
**Why:** Access Cortex from phone without the Telegram bot.
**Priority:** Low / Someday
**Notes:** The Express API already exists at localhost:51204. The renderer is already a React SPA. PWA = adding a service worker + manifest to the renderer. The main challenge is LAN access (phone needs to hit the laptop's IP, not localhost).

---

## Ideas to Explore

Add your new ideas below this line. No format required — anything from a one-liner to a paragraph.

---

<!-- Add new ideas below here -->

