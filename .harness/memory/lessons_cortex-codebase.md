---
name: Cortex codebase gotchas
description: Non-obvious implementation details in Cortex that affect feature work
type: feedback
originSessionId: f5716a5a-c5eb-4176-ad23-2bfc4672a10d
---
1. **EditModal has no type picker — use typeOverride pattern** — `resolvedType = url.trim() ? 'link' : 'idea'` computed inline, no useState for type. Adding new types needs `const [typeOverride, setTypeOverride] = useState<'issue'|'company'|null>(null)` and `resolvedType = typeOverride ?? (url ? 'link' : 'idea')`.
   **Why:** Looked like there'd be a type toggle; there isn't.

2. **SpacesView hides items with null `last_opened_at`** — FIXED in commit `20bdc18` (guard removed, section renamed "Items", nulls sort last). Runtime-verified 2026-07-18.
   **Why:** Plan file 2026-05-05-spaces-bug-fix.md stayed marked "not executed" after fix landed — check `git log -- <file>` before executing old plans.

3. **SQLite CHECK constraint expansion = full table recreation** — No `ALTER TABLE MODIFY CONSTRAINT`. Must: CREATE new table with expanded CHECK, INSERT INTO from old, DROP old triggers + table, RENAME new, recreate triggers, rebuild FTS (`INSERT INTO items_fts(items_fts) VALUES ('rebuild')`).
   **Why:** Needed when adding new item types (issue, company) to items.type column.

4. **Ideas bucket = tag `'Ideas'`, not type `'idea'`** — `FIXED_BUCKET_TAGS = ['Daily','Groceries','Tools','Ideas']`. Bucket = tag. `type==='idea'` items appear in priority columns unless they carry the `'Ideas'` tag.
   **Why:** Confused type and bucket membership; they are orthogonal.

5. **New render path for a bucket silently kills features in the old `else` branch** — When the agent added `{tag === 'Ideas' ? <IdeasBucketBody/> : ...}`, the merge bar lived in the `else` branch and was never reached for Ideas. The new path must explicitly carry over every feature (merge, inline-add, etc.) from the old path.
   **Why:** Agent followed the plan literally without auditing what the old code path did. Always check: "what did this `else` branch do that my new branch skips?"
   **How to apply:** When extracting a sub-component for one bucket, keep merge bar + "Select to merge" in PriorityView and pass `inSelectMode`/`bucketSelectIds`/`onToggleSelect` as props down.

6. **Tag analytics inside a filtered view must exclude the defining tag** — Ideas bucket themes sidebar showed "Ideas: 28" because every item in the bucket has `#ideas`. Counting a tag that appears on all items in the view is noise.
   **Why:** `buildThemes(items)` counted all tags including the bucket tag. Fix: `item.tags.filter(t => t.toLowerCase() !== 'ideas')` before counting, or filter in the display.
   **How to apply:** Any tag-count / theme component inside a bucket/filter context must strip the tag that defines that context.

7. **Runtime verification harness (works, 2026-07-18)** — build (`npm run native:electron` + `npm run build`), then node script: `import { _electron } from 'playwright-core'`, launch `out/main/index.js` with env `PLAYWRIGHT_TEST=1, NODE_ENV=test, CORTEX_DATA_DIR=<mktemp dir>` (temp DB, real DB untouched). Seed via `page.evaluate(() => window.cortex.data.createItem(...))` + `page.reload()`. Ideas bucket seed payload: `{type:'idea', title, priority:'inbox', tags:['Ideas']}`.
   **Why:** `npm run dev` isn't drivable; this pattern gives screenshots + safe destructive probes (merge etc.).
   **How to apply:** Reuse for any visual verify. Gotcha (fixed in tests 3fe883d): e2e selector `.landing-buckets` was stale — real class `.buckets-bar`. Also: PowerShell `Get-Content | Set-Content` mangles UTF-8 em-dashes in plan files — use Write/Edit tools instead. `npm run test:unit` rebuilds better-sqlite3 for NODE ABI — run `npm run native:electron` before launching the app after unit tests.

8. **Capture pipeline history (as of 2026-07-18)** — Telegram chain (Railway webhook → Supabase `bot_queue`) DEAD: Supabase project subdomain no longer resolves (project deleted/paused). Replaced by Discord poller `src/main/discord/poller.ts` (commit 81b234b): polls channel REST API every 60s, watermark in meta key `discord_last_message_id`, env `DISCORD_BOT_TOKEN`+`DISCORD_CHANNEL_ID`, priority tokens `!now !today !tomorrow !week !someday`. Telegram code kept but inert.
   **Why:** Root cause was double: dead Supabase AND `npm run dev` never loaded `.env` — unpackaged Electron defaulted userData to `%APPDATA%\Electron`, so `%APPDATA%\Cortex\.env` (real config+DB) was invisible in dev. Fixed with `app.setName('Cortex')` in same commit.
   **How to apply:** Real user data lives in `%APPDATA%\Cortex` (dev + packaged now share it). Env file for tokens: `%APPDATA%\Cortex\.env`. Never let e2e/verify scripts launch without `CORTEX_DATA_DIR` temp override or they write the real DB. Bot invite granted only View Channels + Read Message History — phase-5 receipts/replies need Add Reactions + Send Messages added to the bot role first.

9. **Discord 404 "Unknown Channel" ≠ wrong channel ID** — bot was in the guild, ID matched `.env`, still 404: private channel without the bot added to it. Diagnose with the API ladder, one layer per call: `GET /users/@me` (token valid) → `/users/@me/guilds` (invite completed) → `/guilds/:id/channels` (channel exists, get exact IDs) → `/channels/:id/messages` (channel-level access). Auth header `Authorization: Bot <token>`.
   **Why:** First instinct "user copied wrong ID" wasted a round-trip; the guild/channel enumeration probe found the real layer in seconds and even yields the correct IDs to paste.
   **How to apply:** Any Cortex Discord capture failure → run the ladder as a node script reading `%APPDATA%\Cortex\.env` before asking the user to re-copy anything. Never print the token.
