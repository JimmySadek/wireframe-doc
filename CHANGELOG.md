# Changelog

All notable changes to the `wireframe-doc` skill are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this skill adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-05-17

Modal review polish: enlarged frames now read as true device screens, and
every frame carries a one-click "Copy link" share affordance. Still
zero-dependency, single-file, offline-safe; the v1.1.0 device-screen chrome
contract is preserved unchanged.

### Fixed

- **Enlarge-modal proportions.** Tapping enlarge previously shrink-wrapped the
  bezel around the ASCII (a phone became a wide ASCII-shaped box). The modal
  device now holds its true logical viewport (phone 390×844, tablet 768×1024,
  desktop 1280×800, custom WxH at its injected ratio — same fixed sizes as the
  inline canvas frame) and is scaled as a single unit (bezel + chrome + ASCII
  together) via a uniform CSS `transform: scale(...)` computed per-frame from
  the viewport, with `transform-origin: top left`. Aspect ratio is exact and
  the v1.1.0 chrome (bezel, notch/camera dot, browser-chrome bar + window dots,
  corner radii) stays intact at the scaled size. Re-fits on viewport resize;
  small-screen (≤768px) modal display remains sane.
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
