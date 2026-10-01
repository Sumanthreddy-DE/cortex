---
name: Show visual decisions as rendered screenshots, not ASCII
description: For UI/design decisions, user needs real pixels via playwright, not ASCII previews.
type: feedback
originSessionId: bfb90ca8-a6f5-4ae7-a13a-b78508d2b697
---
For any UI shape question on Cortex, render an HTML mockup using DESIGN.md tokens and screenshot it via the playwright CLI (`/c/Users/suman/AppData/Local/Programs/Python/Python312/Scripts/playwright screenshot ...`). Save HTML + PNG into `mockups/`.

ASCII previews are NOT enough. User explicitly rejected ASCII twice in one session ("Show real screenshots of refs, not ASCII") before approving directions only after seeing playwright-rendered pixel output.

**Why:** user can't visualize abstractions or character art well. Decisions only land after they see real type, real spacing, real color. Saves multiple correction rounds.

**How to apply:** when proposing 2+ visual options, build each as a self-contained HTML file (Google Fonts inline, OKLCH/hex tokens inline), screenshot at 1440×900 or 1440×1100, present side-by-side with a one-paragraph diff. Then ask for pick.
