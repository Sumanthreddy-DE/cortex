---
name: Write self-contained, phased plan files
description: Cortex work is phased — each phase ships independently, plans are written so any agent can execute without chat context.
type: feedback
originSessionId: bfb90ca8-a6f5-4ae7-a13a-b78508d2b697
---
Cortex design migration is phased: phase 1 (tokens), phase 2 (priority view), phase 3 (categories), follow-up (cleanup). One plan file per phase, lives in `docs/superpowers/plans/`. Each plan is self-contained — explicit code snippets, acceptance criteria per task, verification + rollback blocks. Agent or future-self can execute without re-reading chat.

User explicitly rejected the big-bang approach ("You just wrote the .md files and you will implement everything at one go. What do you recommend?") and chose phased.

**Why:** user wants small landable changes, ability to hand off to another coding agent, and ability to revert one phase without unwinding others. Big PRs are hard to review and risky to revert.

**How to apply:** for any non-trivial Cortex change, write a plan file first; do not implement multiple phases in one PR. Plan must be readable cold (no "see the chat" references).
