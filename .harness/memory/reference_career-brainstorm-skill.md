---
name: career-brainstorm skill
description: Custom composite skill for portfolio project planning — CEO employer-fit challenge gates entry to technical brainstorming
type: reference
originSessionId: 5f85024b-676d-4dec-adc6-bbe4e8f22839
---
Custom skill at `~/.claude/skills/career-brainstorm/SKILL.md`.

Invoke: `/career-brainstorm` or via Skill tool with `career-brainstorm`.

**What it does:** Phase 0 (CEO employer-fit challenge) → Phase 1 (Superpowers-style technical brainstorming). Phase 0 is a hard gate — cannot be skipped.

**Phase 0 forces:** target employer name → their actual hiring question → fit verdict (STRONG/PARTIAL/MISMATCH) → gap resolution if needed.

**Phase 1 follows:** Superpowers brainstorming flow (clarifying questions → 2-3 approaches → design → spec → writing-plans).

**Why it exists:** SimReady was built for the wrong target (MecAgent). Superpowers brainstorm asked HOW to build but never asked IF the project answers the employer's actual hiring question. This skill fixes that gap.

**Use instead of:** `superpowers:brainstorming` whenever a job target is in scope.
