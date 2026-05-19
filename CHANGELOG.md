# Changelog

All notable changes to the `wireframe-doc` skill are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this skill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] — 2026-05-19

Converges three threads into one release: the **decision-flow block** (a
flow-level "decided logic" layer that complements — does not replace — the
Mermaid screen-map), the operational **COMPOSE-THE-SCREEN** craft rule, and
a **single canonical screenshot-verified example** replacing the prior four.
Still zero-dependency, single-file, offline-safe; the renderer and the
device-screen chrome contract are unchanged; specs without a ` ```flow `
block have no spec-conditional output change (functionally identical),
though the shared template carries new static CSS so output is not
literally byte-identical.

### Added

- **` ```flow {Card title} ` decision-flow cards — placement = scope.**
  Fenced ` ```flow ` blocks render as plain neutral bordered "logic cards"
  expressing the *decided logic*. Where the Mermaid `## Stream → screens`
  diagram maps *which screens connect*, these cards express the
  *conditions/rules that decide what a user sees* (fan-in entry, down-arrow
  progression, decision/question lines, binary branches, indented
  sub-options, parenthetical asides). **A card's placement determines its
  scope, positionally — like the rest of the doc:** a `flow` block at the
  **meta level** (before the first `## {Flow name}`, alongside Set the scene
  / Open questions / Stream → screens) is a **deck-level** card, rendered
  ONCE before all flow sections, governing the whole deck (for global
  entry/identity/routing logic); a `flow` block under a `## {Flow name}`
  heading, before that flow's first `### Frame:`, is a **flow-scoped** card
  at the HEAD of that flow section, above the screens it governs (for
  flow-local logic). The text after `flow` on the fence line is the card
  **title** (optional — a bare ` ```flow ` fence renders as an untitled
  card; the title is read from the fence info string, never consumed from
  the body). **Multiple named cards are supported at BOTH levels** and
  render as separate titled panels in document order. **Titled cards are
  collapsible** — the card title is the toggle, reusing the exact
  `<details>`/`<summary>` mechanism the Set the scene / Open questions /
  Stream → screens context sections already use (no new collapse machinery,
  no new colors); untitled cards stay plain always-open panels. A card is
  **not a screen** — no device bezel/status-strip/browser-chrome — and its
  body is rendered **verbatim** in monospace at the same fidelity as the
  ` ```ascii ` screen block (Markdown, marked.js, DOMPurify and Mermaid do
  NOT touch it; whitespace and box-drawing/branch/arrow glyphs are preserved
  exactly). The literal token `#frame-{key}` is linkified to an anchor
  targeting that frame's existing per-frame anchor — optional, and (by
  documented authoring discipline) sparse and only on decided
  outcomes/leaves, never a node-per-screen. A `flow` fence that cannot
  attach (e.g. inside a frame) emits a one-line stderr Warning and is
  skipped — the render still exits 0 (replaces the prior silent drop).
  SKILL.md gains a cheatsheet row and a craft-system authoring subsection;
  `assets/spec-template.md` gains copy-ready meta-level + flow-scoped card
  examples; `tests/fixtures/flow-block.md` is a new
  verification fixture (meta + flow placement, named cards in order,
  untitled fallback, leaf link, collapsible markup, misplaced-fence
  Warning). The four prior examples (`minimal`, `multi-flow`, `dashboard`,
  `stress-test`) are **removed** and replaced by a single canonical,
  screenshot-verified `examples/showcase/poc.md` — FieldPilot job dispatch,
  6 frames across 2 flows, exercising the full feature set including a
  deck-level meta routing card and flow-scoped cards. Specs without a
  ` ```flow ` block have no spec-conditional output change — the only
  template delta is static (the `.logic-card` CSS, the shared collapse
  rule, the meta-card placeholder) — so such specs render functionally
  identically though not literally byte-identical.

### Changed

- **Operational COMPOSE-THE-SCREEN craft rule (replaces "FILL THE
  SCREEN").** The #1 quality rule is reframed from "author enough content to
  fill it" to an operational composition discipline applied consistently in
  `SKILL.md`, `README.md`, and `assets/spec-template.md`: every screen has a
  TOP (title/nav/status), a BODY (its real purpose), and a BOTTOM (primary
  action/tab nav/status); use the per-device ROW budget like the column
  budget so the bottom region lands near the bottom; reach it with the
  screen's real elements plus **deliberate blank lines as a composition
  tool** — never invented filler; a genuinely simple screen stays simple but
  is still composed (the failure mode is content jammed at the top with a
  void, not deliberate empty space). The inaccurate "the renderer scales the
  font so … the rows fill the height" line is corrected — the renderer
  fits the font to **width** only and renders rows verbatim top to bottom;
  it does not move content vertically, so vertical composition is the
  authoring agent's job. The per-device column **and** row target table is
  retained. No renderer or template change.
- **Single canonical, screenshot-verified example.** The four prior examples
  (`examples/minimal/`, `examples/multi-flow/`, `examples/dashboard/`,
  `examples/stress-test/`) are replaced by one canonical
  `examples/showcase/poc.md` — the **FieldPilot job dispatch** deck (6 frames
  across phone/desktop/tablet, 2 flows): Set the scene, Open questions, a
  keys-only Stream → screens Mermaid map, three decision-flow `flow` cards
  (one deck-level meta routing card + one flow-scoped card per flow), and
  rich reviewer notes — every frame composed top→body→bottom and
  screenshot-verified per the verified-example protocol. SKILL.md and README
  "## Examples" now reference only this example; the render command path is
  updated.
- **README refresh.** The hero screenshots `assets/sample.png` and
  `assets/sample-shared.png` are regenerated from the rendered v1.3.0
  showcase (a composed full frame; a shared-frame deep link with the "Shared
  frame" marker) with updated captions; the README "## Examples" section,
  the duplicated craft text (now COMPOSE-THE-SCREEN), and the version badge
  (→ 1.3.0) are updated to match.

### Fixed

- **marked.js CDN-failure raw-source fallback now arms even when marked.js
  is absent.** The marked.js init early-returned when `marked` was
  `undefined`, exiting before its 2-second raw-source fallback was
  registered — so when marked.js failed to load from CDN, the documented
  graceful degradation (markdown destination blocks showing their raw
  source as a `<pre>`) never fired. The init is restructured so the
  fallback `setTimeout` is registered unconditionally (the happy-path
  render stays guarded by the `marked` check), mirroring the standalone
  Mermaid CDN-failure fallback. Behavior now matches the README and the
  CLAUDE.md "keep the 2-second raw-source fallback intact" invariant.
  Template-only change; the renderer is untouched and no version bump.

## [1.2.0] — 2026-05-17

Modal review polish: enlarged frames now read as true device screens, and
every frame carries a one-click "Copy link" share affordance. Still
zero-dependency, single-file, offline-safe; the v1.1.0 device-screen chrome
contract is preserved unchanged.

### Fixed

- **Enlarge-modal proportions, fully contained at every window size.** Tapping
  enlarge previously shrink-wrapped the bezel around the ASCII (a phone became
  a wide ASCII-shaped box). The modal device now holds its true logical
  viewport (phone 390×844, tablet 768×1024, desktop 1280×800, custom WxH at
  its injected ratio — same fixed sizes as the inline canvas frame) and is
  scaled as a single unit (bezel + chrome + ASCII + the shared-frame border
  together) via a uniform CSS `transform: scale(...)` with
  `transform-origin: top left`. The transform sits on the device while a
  reservation wrapper holds the scaled footprint, so the unit can never
  double-shrink or be flex-squeezed. The scale is computed from the **measured
  rendered layout** — the dialog's real content box, the live notes-column
  width, the real flex gap and nav height (two-pass, re-measured after the
  notes reflow) — not a viewport guess, so the device is fully visible inside
  the dialog in both the phone side-by-side and the wide stacked layout at any
  window size. Aspect ratio is exact and the v1.1.0 chrome (bezel,
  notch/camera dot, browser-chrome bar + window dots, corner radii) stays
  intact at the scaled size. Re-fits on viewport resize; small-screen
  (≤768px) modal display remains sane.
- **Modal Prev/Next no longer closes the modal.** The backdrop-close handler
  used bounding-rect coordinate math (`clientX/Y` vs
  `getBoundingClientRect()`). Once the true-proportion enlarged frame made the
  centred dialog as tall as the viewport, a real Prev/Next click resolved to a
  `clientY` beyond the dialog's clipped `rect.bottom` and was misread as an
  outside click — closing the modal instead of navigating. Replaced with the
  standard native-`<dialog>` target test: close only when the click (and its
  originating `mousedown`) target the dialog element itself (the backdrop);
  any click on inner content, including the nav buttons, navigates. No
  geometry, so dialog size/scroll/centering can no longer misfire it.

### Added

- **Per-frame "Copy link" button + education tooltip.** The raw `#frame-{key}`
  text link in the inline footer is replaced by a restrained "Copy link"
  button (same neutral idiom as the enlarge control), emitted in BOTH the
  inline footer and each modal frame, for every device type. Clicking copies
  the deep link to that frame via `navigator.clipboard` (with a tiny
  `execCommand`/`prompt` fallback for non-secure contexts) and flashes
  "Copied ✓" for ~1.5s. A lightweight, reduced-motion-safe CSS tooltip
  (revealed on hover AND keyboard focus) explains the use case. The existing
  hash-on-load deep-link behaviour is unchanged.
- **Deep-link target frame differentiator.** When a shared `#frame-{key}` link
  is opened, the recipient can now see WHICH frame was shared: the enlarged
  screen gets a heavier neutral-accent bezel and a small "Shared frame — you
  were linked here" badge above the notes, and the inline `:target` card gets
  a stronger accent outline + "Shared frame" badge. Restrained and
  palette-locked — `var(--accent)` neutral gray only, no hue/glow/decorative
  shadow. The marker stays bound to the arrival frame, so paging away and back
  keeps the shared-frame identity correct.

### Changed

- **Clearer enlarge icon.** The enlarge button now uses a monochrome
  corner-expand SVG glyph (stroke inherits the control colour) instead of the
  prior `&#10610;` arrows mark, keeping the visible "enlarge" label for screen
  readers. Neutral and low-fi — no decoration.
- **Accurate output-size docs + real-output screenshots.** README/SKILL.md
  size claims now state the measured range (~50 KB small to ~215 KB for a
  large multi-flow deck — output scales with frame count) instead of the prior
  fixed "~50–150 KB regardless of frame count"; the Figma-vs contrast is kept.
  Added `assets/sample.png` (rendered bundled `examples/multi-flow/` deck —
  the canvas hero) and `assets/sample-shared.png` (a shared-frame deep link)
  embedded in the README hero.

## [1.1.0] — 2026-05-16

This release reshapes frames to read like real device screens: the HTML frame
*is* the screen (bezel + affordance), ASCII fills it, and authors no longer draw
an outer box. Still zero-dependency, single-file, offline-safe.

### Added

- **`examples/dashboard/` — the canonical reference example.** A neutral 6-frame support-ticket console (queue overview, ticket detail, bulk-assign, agent metrics with ASCII bar + trend charts, SLA report, a `custom 1440x900` team-workload heatmap) authored fresh to the new "fill the screen" guidance — it demonstrates what good skill output looks like, and is the densest fit + emoji test case.
- **Emoji support.** Emoji work as icons in ASCII and notes. The renderer's column measurement now counts emoji (and CJK) as 2 cells, so alignment and the auto-fit stay correct. Zero-dependency (range-based, no `Intl` segmenter).
- **Screen affordance.** Phone/tablet screens get a status strip / camera dot; desktop/custom get a thin browser-chrome bar with neutral window dots — a touch of "real device" without skeuomorphic polish.
- **"Fill the screen" authoring guidance** in `assets/spec-template.md`, `SKILL.md`, and `README.md`: the device frame is the screen (no outer box), per-device **column *and* row** targets, and the emoji ≈ 2 columns rule. This is the scalable lever — the model authors screen-filling ASCII by following it.

### Changed

- **ASCII now fills the device screen (visual change for every rendered doc).** The renderer computes a per-frame font size so the widest line fills the screen, emitted as the `--ascii-fs` CSS custom property, replacing the fixed `.device-frame pre { font-size: 12px }`. Clamped to a legibility band (canvas 7–22px); the template keeps a `var(--ascii-fs, 12px)` fallback so a missing value still renders — zero-dependency and CDN-failure fallbacks unchanged.
- **The device frame is now the screen.** A 2px bezel with device-appropriate corners; content is clipped at the screen edge and top-aligned like a real screen. **Authors no longer draw an outer `┌──┐ … └──┘` box** — only screen contents (internal panels/tables still use box-drawing).
- **Scene text moved off the screen** into the notes column (under the frame name), matching the modal. The screen shows only the wireframed UI.
- **Real 1× device presets with a screen-shape height.** `phone` 390×844, `tablet` 768×1024, `desktop` 1280×800 (was width-only 280/600/1200, auto height — which letterboxed). Height is a `min-height` floor so a long screen still grows; `custom WxH` unchanged in role. Mixed-device flows no longer stretch shorter screens to a tall sibling's height.
- **Modal rebuilt.** The old fixed-900px dialog with a 1.5×-width device overflowed for desktop/custom frames. The dialog now sizes to its content (`max-width: 95vw`), wide screens stack notes below, and the enlarged screen scrolls inside the dialog instead of spilling out.

## [1.0.1] — 2026-05-10

### Changed

- **Description rewrite for triggering accuracy.** Skill-creator's `run_loop.py` ran iteration 1 of the description-optimization eval loop (12 train / 8 test split) and surfaced a critical issue: the v1.0.0 description had **100% precision but 0% recall** on natural-language trigger queries — Claude was never invoking the skill on realistic prompts like "build me wireframes for the new onboarding flow" or "share screens with my cofounders before we commit to figma". Loop crashed at the iteration-2 description-improver step due to missing `ANTHROPIC_API_KEY` in shell env. Description rewrite was applied manually based on the iteration-1 evidence — added explicit trigger phrasings (sketching screens, sharing frames with notes, replacing Figma, screen flows, X-frame mockups) and "trigger-even-when-not-explicitly-asked" guidance. Full automated optimization deferred to v1.1 polish.

## [1.0.0] — 2026-05-10

Initial public release. Token-cheap wireframe authoring + rendering pipeline.

### Added

- **Markdown spec → single-file HTML render pipeline.** Author wireframes in plain Markdown, run a Node `.mjs` script (no dependencies beyond Node stdlib), get a deployable HTML file. Bundle target: ~50–150 KB even at 19+ frames (vs. ~1.8 MB for equivalent Figma exports).
- **ASCII frames.** Each frame is a ` ```ascii ` block — intent over polish. Renders inside a thin device-frame chrome on a Netflix-style horizontal-scroll canvas.
- **Per-frame device override.** `device:` field per frame supports `phone` (280px) / `tablet` (600px) / `desktop` (1200px) / `custom WxH`. Doc-level `default_device` in frontmatter.
- **Frame-aware Mermaid integration.** Use frame keys directly as Mermaid node IDs; the renderer substitutes frame headings as labels and validates that every Mermaid node ID matches a frame key (typo catcher). Quoted labels (`["text"]`) are correctly excluded from validation. Auto-generates a linear graph if the Mermaid block is omitted.
- **Rich Markdown in 4 sections.** Scene, open questions, per-frame scene line, per-frame notes all support full GitHub-flavoured Markdown (bold, italic, links, blockquotes, nested lists, code spans, headings) via marked.js loaded from CDN.
- **HTML sanitization.** All Markdown HTML output passes through DOMPurify before injection (XSS-safe — agent-generated content can be safely embedded).
- **CDN failure fallback.** If marked.js, DOMPurify, or Mermaid fail to load, raw source is shown as `<pre>` after a 2-second timeout.
- **Tap-to-enlarge modal.** Per-frame modal with prev/next navigation, ESC-to-close, opener focus restoration, prefers-reduced-motion support, disabled-nav state at edges, ≥44×44 px touch targets (WCAG 2.5.5).
- **Anchor-link sharing.** `#frame-{key}` URLs let reviewers link directly to specific frames in chat threads.
- **Render-time validation.** Renderer hard-errors on: invalid `device:` values, `frame_count` mismatches, unclosed ASCII fences (with line-number citation), Mermaid node IDs that don't match any frame key. `--lenient` flag downgrades hard errors to warnings.
- **3 examples shipped.** `examples/minimal/` (2-frame note-taking onboarding), `examples/multi-flow/` (5-frame TaskApp with mobile + desktop), `examples/stress-test/` (real-world-scale stress test).
- **7 fixture tests.** `tests/fixtures/` covers all blocker and important-fix verifications. See `tests/fixtures/EXPECTED.md` for expected behavior per fixture.

### Origin

This skill was promoted from a private internal template. A Codex GPT-5.5 cross-model adversarial review of the internal version returned CONDITIONAL GO with 4 blockers + 7 important findings; the v1.3 hardening pass addressed all 11 findings and packaged the result as this public skill.
