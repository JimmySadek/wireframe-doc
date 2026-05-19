---
title: [Doc title]
version: v1
date: YYYY-MM-DD
frame_count: N
deploy_url: your-project-wireframes-v1.example.com
default_device: phone
---

# [Doc title]

<!--
DRAWING FRAMES — the device frame IS the screen.
Don't draw an outer box around a frame. The rendered device has a screen
bezel (2px border, device corners, a status strip / browser bar). You draw
the screen *contents*. Internal panels, tables and cards in box-drawing are
fine — just no outer ┌──┐ … └──┘ wrapper.

COMPOSE THE SCREEN — this is the #1 rule. The device frame is a real
screen, not a sticky note. Compose it like one:
  1. Every screen has a TOP (title/nav/status), a BODY (its real purpose),
     and a BOTTOM (primary action/tab nav/status). Compose across all three.
  2. Use the per-device ROW budget like the column budget — the BOTTOM
     region's last line should land near the BOTTOM of the row budget.
  3. Reach it with the screen's REAL elements plus deliberate blank lines
     as a composition tool — add real content / deliberate spacing until
     the rendered frame has NO large empty band at the bottom. Verify by
     rendering.
  4. NEVER pad with invented content. A genuinely simple screen stays
     simple but is still composed (top at top, bottom region near the
     bottom) — not jammed at the top with a void.
  5. The renderer FITS THE FONT TO WIDTH and renders rows VERBATIM, top to
     bottom — it does NOT move content vertically. Vertical composition is
     YOUR job.

Match BOTH the column and row target:

  phone   (390×844)   → ≈ 34–44 cols  × ≈ 36–44 rows  (~13–17px)
  tablet  (768×1024)  → ≈ 70–95 cols  × ≈ 44–56 rows  (~12–17px)
  desktop (1280×800)  → ≈ 95–125 cols × ≈ 28–34 rows  (~16–21px)
  custom  WxH         → ≈ W ÷ 10 cols × ≈ H ÷ 22 rows (~16px)

The renderer scales the font so the widest line fills the width; it does
NOT stretch rows to fill the height — composing top→body→bottom to the row
target is what makes a frame read like a real screen. Keep every line the
same display width so internal panels align.

CRAFT — read SKILL.md § "Authoring great wireframes" for the full system.
The essentials:
  • SCREEN = pure ASCII + emoji ONLY. Markdown does NOT render here —
    no ##, **, ``` (literal clutter). Hierarchy = a title + ──── rule,
    UPPERCASE, boxes, a leading ▸. Compose top bar → body → bottom bar.
  • NOTES/scene = rich Markdown (it DOES render): **bold** the decision,
    > blockquote the open question, `code` for fields, - [ ] criteria.
  • Use the curated emoji set as icons (nav 🔍 🏠 ⚙️ 🔔 👤 / status 🟢 ⚠️
    ✅ / objects 📊 📋 👥 / actions ➕ ✏️ 🗑️ 💾) — 2 cells each, clarify
    not decorate, one consistent set per doc.
  • Use the ASCII component vocabulary (buttons [ X ], inputs, [x]/(•),
    [ Option ▾ ], tables, ███░░ progress, ▁▂▆█ sparklines, • list rows).
  • Add a tiny legend line for any non-obvious symbols.

A genuinely sparse screen (a one-line confirmation) is fine — keep it
simple but still composed (top at top, bottom region near the bottom),
never jammed at the top with a void. This comment is ignored by the
renderer; delete it or keep it, your call.
-->

## Set the scene

[Plain English: which user flow this covers, scope, feedback requested,
who shouldn't weigh in, what's NOT in this draft.]

**Markdown is supported here.** Use `**bold**`, `_italic_`, `` `code` ``, and `> blockquotes`
to highlight decisions and signal status.

> Example: _This draft covers the onboarding flow only — settings and profile screens are **out of scope**._

## Open questions for the team

- Q1 — [decision needed] — include `code spans` or **bold** to mark critical choices
- Q2 — [decision needed]
- Q3 — [decision needed]

## Stream → screens

```mermaid
graph LR
  landing --> otp --> main
```

<!--
OPTIONAL decision-flow cards — the "decided logic". They COMPLEMENT the
Mermaid screen-map (Mermaid = which screens connect; this = the rules that
decide what the user sees). PLACEMENT = SCOPE, positionally:

  • A ```flow block HERE (at the meta level, before the first ## {Flow},
    alongside Set the scene / Open questions / Stream → screens) is a
    DECK-LEVEL card — rendered ONCE before all flows. Put GLOBAL
    entry/identity/routing logic here.
  • A ```flow block under a ## {Flow} heading (before its first ### Frame:)
    is a FLOW-SCOPED card at that flow's head. Put FLOW-LOCAL logic there.

The text after ```flow is the card TITLE; the block BODY is rendered
verbatim monospace (Markdown does NOT render; NOT a screen — no device
chrome). MANY named cards allowed at BOTH levels — separate titled panels
in document order. A bare ```flow fence renders untitled. Titled cards are
COLLAPSIBLE (click the title). The six moves: fan-in entry · ▼ progression ·
a question · ├─/└─ branches · indented sub-options · (parenthetical aside) +
free-prose tail. #frame-{key} becomes a link — keep links OPTIONAL, SPARSE,
on decided OUTCOMES (leaves) only; never a node per screen.
-->

```flow Entry & identity
arrives via link or direct URL
            │
            ▼
  Already verified on this device?
  ├─ yes → skip OTP, go straight in
  └─ no  → send code, collect it  → #frame-otp
           (resend allowed after 60s)
```

## Onboarding flow

```flow Code retry policy
code submitted
        │
        ▼
  Correct?
  ├─ yes → continue into the app
  └─ no  → show attempts left, allow resend after 60s
```

### Frame: Landing
key: landing

Scene: Entry point. _User arrives via link or direct URL._

```ascii
┌──────────────┐
│  [App logo]  │
│              │
│  Welcome     │
│              │
│  [Continue]  │
└──────────────┘
```

**Notes:**
- Entry point — describe what the user has done to get here
- What data is pre-filled vs. blank?
- Q: what does the user already know at this point?

### Frame: OTP entry
key: otp

Scene: User enters a verification code.

```ascii
┌──────────────┐
│  Enter code  │
│              │
│  [_][_][_]  │
│  [_][_][_]  │
│              │
│  Resend in   │
│  00:45       │
└──────────────┘
```

**Notes:**
- 6-digit code, auto-submit on digit 6
- Resend timer: 60s countdown
- **Critical:** retry limit — show remaining attempts after first failure

## Main flow

### Frame: Main screen
key: main

Scene: [One line describing what the user sees and why they're here.]

```ascii
┌──────────────┐
│              │
│  [content]   │
│              │
│  [CTA]       │
└──────────────┘
```

**Notes:**
- [Bullet notes for reviewers — `**bold**` marks critical decisions]
- [One note per concern or open question]
- [Include backend deps, edge cases, copy questions]
