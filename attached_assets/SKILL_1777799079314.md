---
name: cortex-design
description: Use this skill to generate well-branded interfaces and assets for Cortex, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Design Philosophy

Cortex feels like a hardcover Moleskine on a developer's desk: cream paper (#f7f1e6), hand-set serif chapter heads (Fraunces), fountain-pen ink, worn cloth corners. The interface should feel like opening a personal notebook to today's spread, not loading a SaaS dashboard.

**Key Rules:**
- Warm cream paper foundation, never gray or white
- Serif (Fraunces) for chapter heads, sans (Inter) for writing
- Flat at rest, lift only on hover/focus
- Lane colors (coral/teal/butter/sage/violet) map 1:1 to priority columns only
- Ink Stamp primary color covers max 8% of screen
- Warm shadows only (never gray)
- No glassmorphism blur
- Sentence case preferred, avoid SHOUTING-CASE

**Brand Personality:** Playful, warm, hand-made. *Personal · curious · alive*.

**Anti-references:** Generic SaaS dashboard, Trello/Jira corporate kanban, bland restraint.

## Quick Start

1. Load `colors_and_type.css` for all design tokens
2. Use Fraunces (Google Fonts) for headlines, Inter for body, JetBrains Mono for code
3. Reference `preview/` cards for component patterns
4. Check `ui_kits/cortex_app/index.html` for full interface recreation
5. Follow README.md for detailed guidance on colors, typography, elevation, iconography
