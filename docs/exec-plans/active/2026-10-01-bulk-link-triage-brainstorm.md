# Bulk Link Triage — Brainstorm Handoff

**Status:** active
**Last verified:** 2026-10-01
**Status evidence:** brainstorm only, no design approved, no code. Started in a citadel session 2026-10-01, moved here because Cortex is the chosen home.

> Not an implementation plan. This is the state of a superpowers:brainstorming session,
> paused at "capability test". Resume the brainstorm from **Next step**; the design and
> spec come after, then writing-plans.

## The problem (user's words, condensed)

Capture was never the problem — **organizing** is. Saved stuff is scattered: mostly
WhatsApp (several groups), some Discord, some Cortex. No single place says what is what.

Want: dump a batch of links + random thoughts on Claude in one go; Claude reads each,
sorts it into categories, and keeps it so that one day it can grow into an idea or a
tool. "I don't want to sort anymore."

## Decisions so far

1. **Shape = option C.** Fast inbox for capture + Claude (on the VPS, reachable from
   phone and laptop) as reviewer/summarizer. Claude does the thinking at review time,
   not at capture time.
2. **Home = Cortex.** Everything ends up in Cortex — "one point". Not Citadel memory:
   raw items there would bloat always-loaded context. Only distilled, durable things get
   promoted out (e.g. a Hermes idea → `Hermes/STATE.md` Pipeline).
3. **User feeds Claude manually.** Claude does **not** read WhatsApp or Discord. The user
   forwards/pastes links and thoughts. No WhatsApp export parsing, no Discord history pull.
4. **Inputs are short.** YouTube = Shorts only (30–60 s). Instagram = Reels. No deleted
   reels sent. Plus Reddit posts, GitHub repos, and free-text/voice-ish random thoughts.
5. **Categories** (starting set):
   - Hermes
   - Side projects (ideas for the future)
   - Claude / harness improvements
   - Job applications
   - German
   - *(proposed by Claude, not yet confirmed)* Other, Dead link
6. **Storage idea from user: "JSON bytes"** — interpreted as **JSONL** (JSON Lines): one
   JSON object per line, append-only, one line per captured item. Good fit for a raw
   inbox: easy to append, diff and grep. Whether it lives as a JSONL file or as rows in
   Cortex's SQLite is still open (see Open questions).
7. **Installs are the user's call** — no new tool gets installed until the user says so.

## Reading capability per source (Claude's assessment, unproven until the test)

| Source | Tool | Confidence |
|---|---|---|
| GitHub | `gh api` (README, stars, last push) | High |
| Reddit | `defuddle parse <url> --md`, or the post URL + `.json` | Medium-high; Reddit sometimes blocks |
| YouTube Shorts | `/watch` (yt-dlp + captions + frames) | High |
| Instagram Reels | `/watch` via yt-dlp | **Unproven** — Instagram often needs login cookies; music-only reels mean reading on-screen text from frames |
| Random text | none needed | High |

### Tools the user suggested

- **`bradautomates/claude-video`** — already installed. It *is* the `/watch` skill
  (`~/.claude/plugins/cache/claude-video/watch/0.2.0`). Nothing to add.
- **`Panniantong/Agent-Reach`** (MIT, ~87k stars, pushed 2026-09-15) — "read Twitter,
  Reddit, YouTube, GitHub, Bilibili, XiaoHongShu, one CLI". Lists **no Instagram**, which
  is the only weak source. Overlaps defuddle + `gh` + `/watch`. Claude's take: skip
  unless the capability test shows Reddit failing. Not installed.

### Approach Claude argued for

Classify cheaply first (title, caption, the user's note), deep-distill only what lands
in a category that matters. Dedupe by URL.

## Related Cortex work — check before building anything new

- `feature-backlog.md` **item 10 — Video/Reels-to-text capture enrichment.** Same goal.
- `2026-04-29-youtube-distiller-prototype.md` (**paused**) — a YouTube→note/data.json
  distiller is already built on the unmerged branch `feature/youtube-distiller-prototype`.
  Reuse or retire it; do not write a third one.
- `2026-07-18-phase-5-close-the-loop.md` (**not started**) — triage mode + Discord
  digest. This is the "review" half of option C.
- `feature-backlog.md` item 11 — "stop adding surfaces (process, don't organize)".
  This brainstorm must respect it: prefer extending Cortex's existing inbox/categories
  over a new view.

## Open questions (ask one at a time)

1. Where do sorted items live in Cortex: as normal items with a category/tag, or a JSONL
   file beside the DB that Claude writes and Cortex imports?
2. How does Claude on the VPS write into Cortex, given Cortex's SQLite currently lives
   at `%APPDATA%\Cortex` on the laptop? (Ties to the citadel vps-migration work.)
3. Are "Other" and "Dead link" accepted as categories?
4. What does one stored item contain? Proposed: url, source, category, one-line summary,
   why-it-matters, the user's own note, date, status (new / promoted / dropped).

## Next step

**Capability test.** The user pastes into a Cortex session:
one Instagram Reel, one YouTube Short, one Reddit post, one GitHub repo, and some random
thoughts. Claude reads each and assigns a category, reporting honestly what failed.
The design is built on what actually worked, then continue with the Open questions.
