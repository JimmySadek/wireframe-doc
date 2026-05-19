---
name: wireframe-doc
version: 1.3.0
author: Jimmy Sadek <gamal.sadek@gmail.com>
license: MIT
description: Author and ship low-fidelity product wireframes as a single deployable HTML file from a Markdown spec — ASCII frames inside thin device-frame chrome, Mermaid flow diagrams, sticky-note style reviewer notes, and a Netflix-style horizontal canvas with tap-to-enlarge modal. Designed for asynchronous founder/team review BEFORE committing to UI design or Figma. Use this skill whenever the user wants to wireframe, mockup, sketch screens, or share screen flows for review — including phrases like "build me wireframes", "share screens with my cofounders", "low-fi mockup", "wireframe deck", "screen flow before we build it", "X frames for the [feature]", "cheap alternative to Figma", or "show my team the screens I have in mind". Trigger even when the user doesn't say the word "wireframe" explicitly — sketching screens, scaffolding a user flow, sharing frames with notes for async team review, and replacing heavy Figma exports with lightweight shareable URLs are all core use cases. Bundle scales with frame count — ~50 KB small to ~215 KB for a large multi-flow deck (still far smaller than a 1–2 MB Figma export).
metadata:
  short-description: Markdown-to-HTML wireframe review docs
  triggers:
    - wireframe doc
    - low-fi wireframes
    - product review wireframes
    - cheap wireframes
    - wireframe template
---

# wireframe-doc

## What this skill does

The wireframe-doc skill lets you write product wireframes in plain Markdown and render them as a single deployable HTML file — no design tools, no Figma account, no multi-megabyte exports.

You write structured Markdown: ASCII frames that show what each screen looks like, a Mermaid flowchart that shows how screens connect, and bullet-note "sticky notes" that explain what's happening and what questions need answers. The render script assembles these into a polished review doc with a horizontal card strip, collapsible context sections, and a tap-to-enlarge modal for each frame.

The result is a shareable URL that works in any browser. Founders and teammates can view the flow, read the notes, and give targeted feedback by linking to specific frames via `#frame-{key}` anchors — no Figma view access, no Loom, no synchronous meeting required.

HTML in reviewer notes is sanitized by DOMPurify before rendering, so agent-generated content is safe to inject. CDN fallback shows raw source after 2 seconds if libraries fail to load.

## When to use it

- **Pre-design product reviews** — founders need to see flow and intent before committing to a UI implementation. ASCII frames communicate structure without burning design time.
- **Async team feedback on multi-flow user journeys** — share a URL, collect comments in a chat thread. No realtime coordination needed.
- **Lightweight specs that double as input to next-stage UI generation** — structured frame notes and scene descriptions are clean input for a UI-generation agent.
- **Replacing screenshot-heavy wireframe decks** — a 1–2 MB Figma export becomes a ~50–215 KB self-contained HTML. Faster to share, faster to load, version-controllable as plain text.

## When NOT to use it

- **Pixel-perfect mockups** — use a real design tool (Figma, Sketch, etc.). This is intentionally low-fidelity.
- **Interactive prototypes** — the output is static HTML. No clickable flows, no state transitions.
- **Brand-styled comps** — the template uses a neutral gray palette by design. It communicates intent, not aesthetics.

## Quick start

1. Copy `assets/spec-template.md` to your project:
   ```
   cp ~/.claude/skills/wireframe-doc/assets/spec-template.md my-wireframes/spec.md
   ```
2. Fill in the YAML frontmatter (`title`, `version`, `date`, `frame_count`, `deploy_url`), then write your scene, open questions, flow diagram, and frames.
3. Render:
   ```
   node ~/.claude/skills/wireframe-doc/scripts/wireframe-render.mjs my-wireframes/spec.md my-wireframes/index.html
   ```
4. Open `my-wireframes/index.html` in a browser, or deploy to any static host (Vercel, Netlify, GitHub Pages, S3, file://).
5. Share the URL. Link to specific frames via `#frame-{key}` (e.g., `your-url.com#frame-landing`).

## Spec syntax cheatsheet

| Syntax | What it does |
|--------|--------------|
| `## {Flow name}` | Defines a flow section (e.g., `## Onboarding flow`) |
| `### Frame: {Name}` | Defines a frame within the current flow |
| `key: {kebab-key}` | Frame key — REQUIRED, on the line right after `### Frame:`. Used as Mermaid node IDs and URL anchors (`#frame-{key}`). Must be lowercase kebab-case, unique per doc. |
| `device: {value}` | Per-frame device override — OPTIONAL, placed after `key:` and before the scene paragraph. Values: `phone` / `tablet` / `desktop` / `custom WxH` (e.g., `custom 1440x900`). |
| Paragraph after `### Frame:` line | Optional scene/flavor text (after `key:` and `device:` lines) |
| ` ```ascii ` block | Screen *contents* (monospace, whitespace preserved). The device frame is the screen border — **don't draw an outer box**; internal panels/tables are fine. Emoji ≈ 2 columns. |
| `**Notes:**` + content | Reviewer notes — full Markdown supported (bullets, paragraphs, headings, code, blockquotes) |
| ` ```mermaid ` block under `## Stream → screens` | Flow diagram. Use frame keys as node IDs — renderer substitutes frame headings as labels. Omit to auto-generate a linear graph. |
| ` ```flow {Card title} ` block — **placement = scope** | Flow-level **decision-flow** card — the *decided logic* (conditions/rules that decide what a user sees). **Positionally scoped:** authored at the **meta level** (before the first `## {Flow}`, alongside scene / open questions / Stream → screens) → a **deck-level** card rendered ONCE before all flows (use for global entry/identity/routing logic); authored under a `## {Flow}` heading (before its first `### Frame:`) → that **flow's** card at its head (flow-local logic). Text after `flow` is the card title (optional → untitled card); the BODY is verbatim monospace. Complements the Mermaid screen-map (does not replace it); NOT a screen, NO device chrome, Markdown does NOT render. **Many** named cards allowed at **both** levels — separate titled panels in document order. **Titled cards are collapsible** (click the title — same toggle as the context sections). The literal token `#frame-{key}` becomes an anchor to that frame — OPTIONAL, sparse, on decided outcomes only. A `flow` fence that cannot attach (e.g. inside a frame) prints a one-line stderr Warning and is skipped (render still exits 0). |

**YAML frontmatter fields:**
- `title` — page title + header h1
- `version` — shown in header (e.g., `v0`, `v1`)
- `date` — ISO date (YYYY-MM-DD)
- `frame_count` — total frame count (validated against actual count — error on mismatch; use `--lenient` to warn)
- `deploy_url` — URL without `https://` (shown in header + footer)
- `default_device` — OPTIONAL. Default device for all frames. Values: `phone` (default) / `tablet` / `desktop` / `custom WxH`.

**Device dimensions** (recognizable 1× logical viewports; height is a screen-shape floor — a longer screen still grows):
- `phone` → 390 × 844 (iPhone 14/15) — **default**
- `tablet` → 768 × 1024 (iPad portrait)
- `desktop` → 1280 × 800 (laptop, 16:10)
- `custom WxH` → W × H (e.g., `custom 1440x900`)

Each rendered frame is a **screen with a bezel** (2px border, device corners, a status strip on phone/tablet, a browser-chrome bar on desktop/custom). The screen is the chrome — **you don't draw an outer box**, just the screen contents. Content is clipped at the bezel like a real screen.

**ASCII sizing — COMPOSE THE SCREEN: top, body, bottom (the #1 quality rule):**
The device frame is a real screen, not a sticky note. Compose it like one:

1. Every screen has a **TOP** (title / nav / status), a **BODY** (its real
   purpose), and a **BOTTOM** (primary action / tab nav / status). Compose
   across all three.
2. Use the per-device **ROW budget** like the column budget. The BOTTOM
   region's last line should land near the **bottom** of the row budget.
3. Reach it with the screen's **real elements plus deliberate blank lines as
   a composition tool** — add real content / deliberate spacing until the
   rendered frame has **no large empty band at the bottom**. Verify by
   rendering.
4. **Never pad with invented content.** A genuinely simple screen stays
   simple but is still composed (top at top, bottom region near the bottom) —
   not jammed at the top with a void.
5. The renderer **fits the font to width** and renders rows **verbatim, top
   to bottom — it does not move content vertically.** Vertical composition is
   your job as the authoring agent; that is what this rule teaches.

Match **both** the column and row target for the device:

| Device | Columns | Rows | Renders at |
|--------|---------|------|------------|
| `phone` (390×844) | **≈ 34–44** | **≈ 36–44** | ~13–17px |
| `tablet` (768×1024) | **≈ 70–95** | **≈ 44–56** | ~12–17px |
| `desktop` (1280×800) | **≈ 95–125** | **≈ 28–34** | ~16–21px |
| `custom WxH` | **≈ W ÷ 10** | **≈ H ÷ 22** | ~16px |

The renderer scales the font so the widest line fills the width; it does **not** stretch rows to fill the height — composing top→body→bottom to the row target is what makes a frame read like a real screen. Keep every line the same display width so internal panels align. **Emoji are welcome as icons** — counted as 2 columns, so budget 2 cells each. A genuinely sparse screen (a one-line confirmation) is fine — keep it simple but still composed, never jammed at the top with a void. Art far narrower than target renders chunky; far wider is clamped (min 7px) and clipped at the bezel.

**CLI flags:**
- `--lenient` — warn instead of error for `frame_count` mismatches and invalid `device:` values

## Authoring great wireframes (craft system)

This section teaches you, the authoring agent, how to produce top-tier wireframes with this skill. The screen and the notes are two different channels — use each for what it's good at:

> **Screen** (the ` ```ascii ` block) = pure ASCII + emoji. Rendered verbatim in monospace — **Markdown does NOT render here.** `##`, `**`, `` ``` `` are literal clutter; use ASCII/emoji hierarchy instead.
> **Notes / scene** = rich Markdown. Rendered to real HTML beside the screen. This is where bold, blockquote, code, and checklists pay off — use them.

### 1. Compose like a real screen

Every screen has a **TOP** (title / nav / actions), a **BODY** (its real purpose), and a **BOTTOM** (tab nav / status / primary action). Compose across all three: the top sits at the top, the bottom region's last line lands near the **bottom** of the row budget, the body fills between them (see § ASCII sizing). Reach the row target with the screen's **real elements plus deliberate blank lines** — never invented filler. A genuinely simple screen stays simple but is still composed (top at top, bottom region near the bottom); the failure mode is content **jammed at the top with a void below**, not deliberate empty space. Density by device: `phone` = one focused task + one primary action; `tablet` = one rich view; `desktop`/`custom` = dense, multi-panel (tables, KPI cards, side rails).

Hierarchy in **pure ASCII** (never `##`/`**` — they won't render):
- **Title / section:** a short label then a full-width rule, or an `UPPERCASE` label.
- **Emphasis:** a leading `▸`, an emoji icon, `[ ]`/`(•)`, `UPPERCASE`, or a box — not `**bold**`.
- **Grouping:** box-drawing panels `┌─ Title ─┐ … └─────────┘`.
- **Rules:** `────────` section · `════════` strong · `· · · · ·` soft.

### 2. ASCII component vocabulary (copy-paste)

| Component | Pattern |
|---|---|
| Top bar | `‹ Back     Title                       ⚙` |
| Bottom nav | rule, then `🏠 Home   🔍 Search   🔔 Alerts   👤 Me` |
| Button | `[ Primary ]`  `[ Cancel ]`  `[ + New ]` |
| Text input | `┌──────────────┐` / `│ value        │` / `└──────────────┘` |
| Search | `🔍 [ Search…                    ]` |
| Select / dropdown | `[ Option ▾ ]` |
| Checkbox | `[x] selected`   `[ ] not selected` |
| Radio | `(•) chosen`   `( ) other` |
| Toggle | `[x] on`  /  `[ ] off` |
| Tabs | `[ Active ]  Inactive   Inactive` |
| Card / panel | `┌ Title ──────────┐` … `└──────────────────┘` |
| Table | `┌ Col ─┬ Col ─┐` / `│ … │ … │` / `└──────┴──────┘` |
| List row | `• Label ───────────────────── meta` |
| Progress | `███████░░░  70%` |
| Bar chart | `Rosa L.  ████████████████  142` |
| Sparkline | `▁▂▄▅▆▇█   ▆▇█▅▆` |
| Badge / pill | `[ High ]`   `‹NEW›`   `( 3 )` |
| Avatar | `👤`  or  `( A )` |
| Empty state | a short centered line + one `[ CTA ]` |
| Loading | `▒▒▒▒▒▒    ▒▒▒▒▒▒▒▒` |
| Active/selected row | prefix `▸ ` or wrap in a `═` border |

### 3. Curated emoji set (icons — 2 columns each)

Pick from this neutral, widely-rendered set; keep one consistent set per doc. An emoji must **clarify** (a nav target, a status, an action) — never decorate.

- **Navigation:** ◀ ▶ 🔼 🔽 ‹ › ☰ 🔍 🏠 ⚙️ 🔔 👤 ✕ ⤴
- **Status:** 🟢 🟡 🔴 ✅ ⚠️ ⏳ 🔄 ⛔ ℹ️ ★ ☆
- **Objects / sections:** 📂 📊 📈 📉 📋 📝 📨 📥 📤 🗂 👥 🔗 💳 🗓️ 🔒 🏷️
- **Actions:** ➕ ✏️ 🗑️ 💾 ⬇️ ⬆️ 🔁 ▶️ ⏸️

The renderer counts each emoji as 2 monospace cells, so budget 2 cells and alignment + auto-fit stay correct.

### 4. Legend block

For any non-obvious symbol set, add a 2–3 line legend in the screen or the scene so the wireframe reads independently — e.g. `legend:  · 0–3   ░ 4–8   ▒ 9–14   █ 15+`.

### 5. Notes & scene — your rendered-Markdown channel

For **every** frame, exploit rendered Markdown in the notes:
- `**bold**` the decision or the critical constraint.
- `>` blockquote the one open question the frame raises.
- `` `code` `` for fields / endpoints / keys (`GET /tickets`, `frame_count`).
- `- [ ]` / `- [x]` acceptance criteria; numbered lists for ordered steps; nested lists for decision trees.
- `_italic_` for asides. The screen shows *what*; the notes argue *why / open questions / backend* — in rich text.

### 6. Decision-flow cards — the decided-logic layer (optional)

A ` ```flow {Card title} ` block renders as a plain bordered "logic card" —
the *decided logic*. It **complements the Mermaid screen-map, it does not
replace it**: Mermaid maps *which screens connect*; this expresses the
*conditions/rules that decide what a user sees*.

**Placement determines scope** (positional, like the rest of the doc):

- **Meta level** — authored *before the first `## {Flow}`*, alongside
  Set the scene / Open questions / Stream → screens → a **deck-level** card,
  rendered ONCE before all flow sections, governing the whole deck. Put
  **global entry / identity / routing** logic here (it stays visible no
  matter which flow the reader scrolls to).
- **Under a `## {Flow}` heading** — *before that flow's first `### Frame:`* →
  a **flow-scoped** card at the head of that flow, above the screens it
  governs. Put **flow-local** logic here.

The text after `flow` on the fence line is the **card title** (optional — a
bare ` ```flow ` fence renders as an untitled card). You may add **many** named
cards at **both** levels — they render as separate titled panels in document
order (split distinct decisions into separate cards). **Titled cards are
collapsible** — the title is the toggle, the same mechanism as the context
sections. Verbatim monospace — Markdown does NOT render here (like the screen
block); it is NOT a screen, so no device chrome. The body is never consumed
for the title. A `flow` fence that cannot attach (e.g. inside a frame) prints
a one-line stderr Warning and is skipped — the render still exits 0.

The six recurring moves (compose in this order):

```flow Entry & identity
cart + saved-payment            ← fan-in entry line (what arrives here)
        │
        ▼                       ← a down-arrow progression step
  Has a default card on file?   ← a question / decision line
  ├─ yes → charge it, skip      ← binary branch lines
  └─ no  → ask for a card
           Apple Pay first      ← indented sub-options
           (iOS only)           ← parenthetical aside + optional free-prose tail
```

**Screen links — the discipline that keeps this from collapsing into a
screen-map:** the literal token `#frame-{key}` (an existing frame key) becomes
an anchor to that frame. It is **optional and sparse** — put a link only on a
**decided OUTCOME (a leaf)**, e.g. `└─ no → ask for a card → #frame-pay`.
**Never** add a node-per-screen; the moment every line points at a frame, this
stops being decided logic and just duplicates the Mermaid map. The renderer
linkifies `#frame-{key}` mechanically and does not enforce this — it is your
discipline as the author.

### 7. Anti-patterns — do not ship these

- Content jammed at the top with a large empty band below (compose top→body→bottom to the row target — deliberate empty space is valid, invented filler is not).
- An outer `┌──┐ … └──┘` box around the whole frame (the bezel **is** the screen).
- `##`, `**`, or `` ``` `` **inside the screen** — literal noise; use ASCII/emoji hierarchy.
- Misaligned columns / inconsistent line widths.
- Placeholder lorem or `[text here]` — use realistic labels, counts, and states.
- Emoji as decoration, or a different emoji for the same concept across frames.
- Borders everywhere with no visual hierarchy.

## Examples

| Example | Description |
|---------|-------------|
| `examples/showcase/poc.md` | The single canonical, screenshot-verified showcase — **FieldPilot job dispatch** (6 frames, 2 flows). Exercises the full feature set: Set the scene, Open questions, a keys-only Stream → screens Mermaid map, **three decision-flow `flow` cards** (one deck-level meta routing card + one flow-scoped card per flow), and 6 frames across phone / desktop / tablet with rich reviewer notes — every frame composed top→body→bottom. This is what good skill output looks like. |

Render the example:
```
node ~/.claude/skills/wireframe-doc/scripts/wireframe-render.mjs \
  ~/.claude/skills/wireframe-doc/examples/showcase/poc.md \
  /tmp/test-showcase.html && open /tmp/test-showcase.html
```

## Tests

Seven fixture files in `tests/fixtures/` cover all blocker and important-fix verifications. Run them manually:

```bash
cd ~/.claude/skills/wireframe-doc
for f in tests/fixtures/*.md; do
  echo "=== $f ==="
  node scripts/wireframe-render.mjs "$f" /tmp/test-out.html 2>&1
  echo "exit: $?"
  echo ""
done
```

See `tests/fixtures/EXPECTED.md` for expected behavior per fixture.
