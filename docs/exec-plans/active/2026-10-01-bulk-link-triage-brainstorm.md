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
  Reddit, YouTube, GitHub, Bilibili, XiaoHongShu, one CLI". **Corrected after reading its
  README:** it *does* cover Instagram, but for both Reddit and Instagram it states there
  is **no zero-config path** — anonymous Reddit is blocked and the official API is
  approval-gated. Both go through OpenCLI reusing a logged-in desktop Chrome session (or
  rdt-cli + cookie), and the README itself warns of account-ban risk and says to use a
  throwaway account. So it wraps the login-session route, it does not bypass it. Default
  install is check-only; `--system` / `--dry-run` flags exist. Not installed.

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

## Capability test — run 2026-10-01 (from the laptop, citadel session)

| Item | Read? | What came back | Proposed category |
|---|---|---|---|
| Instagram carousel `instagram.com/p/Dd07Kv7EdBB` (@saadkhanads) | ~20% | Cover image only, via `og:image` — "Give Claude a WhatsApp number. Yes, seriously." Slides 2+ and the caption are behind the login wall; `yt-dlp` failed ("login required") | Claude / Hermes |
| YouTube Short `ZvDTGkidXVI` (Kev Builds Apps, 32 s) | 100% | Title + description, which already held the spoken script and the repo link. Auto-captions hit HTTP 429 and were not needed | Side projects (or self-talk-coach / German) |
| ↳ repo in that Short: `debpalash/VoiceStudio` | 100% | `gh api`: local ElevenLabs alternative, voice cloning/dubbing/dictation, 646 languages, AGPL-3.0, ~51k stars | — |
| Reddit share link `r/hermesagent/s/Nu7NWNURhd` | ~10% | Share link resolves (curl GET) to `comments/1wt8blb` — title from the URL slug only: "Can you use a Claude subscription with Hermes yet". Body/comments blocked: `.json` 302, `api.reddit.com` HTML wall, defuddle empty, WebFetch "unable to fetch from www.reddit.com" | Hermes |
| Website `resourcify.com` | 100% | defuddle: circular-economy waste-management SaaS ("operating system for a circular future"), 25k locations, 800+ recyclers | Job applications? — ask why it was saved |
| Text "Sebastian Raschka build a reasoning model from scratch / Libgenis" | 100% | Book *Build a Reasoning Model (From Scratch)*; "Libgenis" = libgen.is. Code repo is free on GitHub (`rasbt/reasoning-from-scratch`, unverified) | Learning / AI — not in the category list |

**Score: ~4 of 6 fully automatic.** The two failures are login walls, not tool gaps.

Fixes, all the user's call (installs/accounts):
- **Reddit:** ~~free Reddit API "script" app~~ — per Agent-Reach README the official API is now approval-gated (unverified); login session via Agent-Reach/OpenCLI; or the user pastes the post text / screenshots. Untested whether the VPS IP is blocked too (datacenter IPs usually are, worse than residential).
- **Instagram:** `yt-dlp --cookies-from-browser` with a logged-in session — cookies are credentials, so never on the VPS without a throwaway account; or the user screenshots carousel slides (the Read tool reads text in images).
- **Images:** user drops screenshots; Claude reads text and content from them directly. Image files need a home — open question.
