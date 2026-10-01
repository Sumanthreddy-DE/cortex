---
name: Use Graphify before coding
description: Always query Graphify graph before implementing features or making changes in this project
type: feedback
originSessionId: 43a3e10e-25e1-4611-b57d-083bbaf27ae8
---
Before touching code for any feature, fix, or refactor — query Graphify first.

**Why:** User explicitly requires this. Saves tokens, prevents missing key connections, avoids breaking god nodes or cross-community bridges without knowing it.

**How to apply:**
- Before implementing: `graphify query "<feature area>"` or `graphify explain "<relevant node>"` to understand current state
- For cross-module changes: `graphify path "<A>" "<B>"` to see dependency chain
- Check god nodes (`getItemById`, `createItem`, `attachNoteEntries`, `updateItem`, `drainBotQueue`, `createApiApp`, `normalizePriority`) — changes near these ripple wide
- After modifying code files: run `graphify update .` to keep graph current (AST-only, free)
- Read `graphify-out/GRAPH_REPORT.md` for community structure before answering architecture questions
