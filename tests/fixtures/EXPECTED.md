# Fixture Test Expected Behaviors

Run all fixtures:
```bash
cd ~/.claude/skills/wireframe-doc
for f in tests/fixtures/*.md; do
  echo "=== $f ==="
  node scripts/wireframe-render.mjs "$f" /tmp/test-out.html 2>&1
  echo "exit: $?"
  echo ""
done
```

---

## valid-minimal.md

**Expected:** exit 0, HTML written to /tmp/test-out.html

```
Wrote /tmp/test-out.html (XX.X KB, 1 frames across 1 flows)
exit: 0
```

Verifies: smallest valid spec renders without error.

---

## invalid-mermaid-typo.md

**Expected:** exit 1, error citing "welcme" as unknown node ID

```
Error (Mermaid block, near line N): node ID "welcme" does not match any frame key. Frame keys in this doc: [welcome, share]. Check for a typo.
exit: 1
```

Verifies: Mermaid typo detection works correctly.

---

## invalid-mermaid-quoted.md

**Expected:** exit 0, renders cleanly — quoted label words are NOT validated

```
Wrote /tmp/test-out.html (XX.X KB, 3 frames across 1 flows)
exit: 0
```

Words "Welcome screen", "OTP entry", and "valid code" appear inside Mermaid brackets/quotes and must NOT be checked against frame keys. This is the Blocker 1 fix verification.

If this exits 1 with an error about "screen", "entry", or "code" — the Blocker 1 fix is broken.

---

## invalid-unclosed-fence.md

**Expected:** exit 1, error citing the exact line number of the unclosed fence

```
ERROR: Unclosed fence at line N. Expected closing ``` before EOF.
exit: 1
```

The line number N should point to the line where the ``` ascii fence OPENS.
This is the Blocker 3 fix verification.

---

## invalid-frame-count.md

**Expected (default):** exit 1, error citing mismatch

```
Error: frame_count says 5 but parsed 2 frames.
exit: 1
```

**Expected (--lenient):**
```bash
node scripts/wireframe-render.mjs tests/fixtures/invalid-frame-count.md /tmp/test-out.html --lenient
```
```
Warning: frame_count says 5 but parsed 2 frames.
Wrote /tmp/test-out.html (XX.X KB, 2 frames across 1 flows)
exit: 0
```

This is the Important 8 fix verification.

---

## invalid-device.md

**Expected (default):** exit 1, error citing the invalid device value

```
Error: Invalid device value 'foo' on frame 'home'. Expected: phone, tablet, desktop, or 'custom WxH'.
exit: 1
```

**Expected (--lenient):**
```bash
node scripts/wireframe-render.mjs tests/fixtures/invalid-device.md /tmp/test-out.html --lenient
```
```
Warning: Invalid device value 'foo' on frame 'home'. Expected: phone, tablet, desktop, or 'custom WxH'. Falling back to phone.
Wrote /tmp/test-out.html (XX.X KB, 1 frames across 1 flows)
exit: 0
```

This is the Important 9 fix verification.

---

## valid-rich-markdown.md

**Expected:** exit 0, HTML written to /tmp/test-out.html

```
Wrote /tmp/test-out.html (XX.X KB, 1 frames across 1 flows)
exit: 0
```

Open /tmp/test-out.html in a browser and verify:
1. **Bold text** renders as `<strong>`
2. _Italic text_ renders as `<em>`
3. Inline `code` renders with monospace styling
4. Blockquote renders with left border
5. Nested list renders at 3 levels
6. `<script>alert('xss')</script>` is ABSENT from the rendered HTML (sanitized by DOMPurify)
7. `<img src="x" onerror="alert('xss')">` has no `onerror` attribute in rendered HTML
8. `javascript:` href is sanitized or removed
9. The line "This line appears AFTER the injection attempts" IS present in the output

This is the Blocker 2 (XSS sanitization) fix verification.
The sanitization happens client-side in the browser — the HTML file itself will contain the raw Markdown in `<script type="text/markdown">` blocks; DOMPurify strips XSS when the browser runs the init script.

---

## flow-block.md

**Expected:** exit 0 (with one stderr Warning for the misplaced fence),
HTML written to /tmp/test-out.html

```
Warning (line N): `flow` block cannot be placed here (inside a frame). A flow card must be at the meta level (before the first "## {Flow}") or under a "## {Flow}" heading before its first "### Frame:". Skipped.
Wrote /tmp/test-out.html (XX.X KB, 2 frames across 1 flows)
exit: 0
```

Verifies positional (meta + flow) decision-flow cards (v1.3.0):

1. **Positional scoping — meta vs flow.** The META-level card
   ("Deck-level routing", authored before the first `## {Flow}`) renders
   **ONCE before any flow section** — it appears in the
   `{{META_FLOW_CARDS_HTML}}` slot, OUTSIDE and BEFORE the first
   `<section class="flow-section">`. The flow-scoped cards render at the
   HEAD of the "Checkout flow" `<section>`, before its frame strip.
2. **Flow-scoped cards in order.** Inside the "Checkout flow" section,
   three logic-card panels in document order: "Entry & identity", then
   "Failure handling", then the untitled card.
3. **Collapsible markup — same mechanism as the context sections.** Each
   **titled** card is a `<details class="logic-card" open>` with a
   `<summary class="logic-card-title">` toggle (the SAME
   `<details>`/`<summary>` wrapper as `details.scene-block` /
   `details.questions-block` / `details.diagram-block`). Titles:
   `Deck-level routing`, `Entry &amp; identity`, `Failure handling`. The
   untitled bare ` ```flow ` card has **no** `<summary>` — it stays a
   plain `<div class="logic-card">` always-open panel — but still renders
   its `<pre>` correctly (the no-title fallback).
4. Each card BODY is preserved **verbatim** in a monospace `<pre>` — the
   branch line `├─ yes → charge it, skip entry`, the `└─` branches, and
   the `▼` down-arrow appear exactly as authored. The fence info-string
   title is NOT consumed from the body.
5. The single `#frame-pay` token (in the "Entry & identity" card) renders
   as `<a href="#frame-pay">#frame-pay</a>`, targeting the existing
   per-frame anchor; all other characters are untouched.
6. The logic cards have **no device chrome** — no `device-frame`
   bezel/status-strip/browser-bar markup inside any panel.
7. **Misplaced-fence Warning (non-fatal).** The ` ```flow ` fence authored
   INSIDE the "Payment" frame cannot attach; the renderer prints exactly
   one `Warning (line N): ... Skipped.` line to stderr, drops that card
   (it is NOT rendered anywhere), and the render still completes and
   **exits 0**.
8. A spec with no ` ```flow ` block is unaffected (a panel is only emitted
   per ` ```flow ` block, at the level it was authored).

---

## valid-multi-device.md

**Expected:** exit 0, no `Syntax error` / `Warning` lines on stderr, HTML
written to /tmp/test-out.html

```
Wrote /tmp/test-out.html (XX.X KB, 4 frames across 1 flows)
exit: 0
```

Verifies multi-device chrome coverage (v1.4.0): every device type the
renderer supports — `phone` via `default_device`, plus per-frame `device:`
overrides for `tablet`, `desktop`, and `custom WxH` — in a single deck.

Author the per-fixture render once and verify with `grep` on
`/tmp/test-out.html`:

```bash
node scripts/wireframe-render.mjs tests/fixtures/valid-multi-device.md /tmp/test-out.html
```

1. **Phone frame uses the phone device-frame class.**
   The `phone-default` frame (no per-frame `device:` line — resolved via
   `default_device: phone`) is wrapped in a
   `<div class="device-frame device-phone">` on its
   `<article class="frame-card" id="frame-phone-default" ...>`. The modal
   copy uses `<div class="modal-device device-phone">`.
2. **Tablet frame uses the tablet device-frame class AND the status-strip
   CSS rule is emitted.** The `tablet-override` frame is wrapped in a
   `<div class="device-frame device-tablet">`. Tablet chrome (the small
   centered camera-dot status mark) is implemented as a CSS pseudo-element,
   not as inline markup — the inline `<style>` block emits the rule
   `.device-frame.device-tablet::before` (shared with the phone notch
   pseudo-element rule).
3. **Desktop frame uses the desktop device-frame class AND the
   browser-chrome bar CSS rule is emitted.** The `desktop-override` frame
   is wrapped in a `<div class="device-frame device-desktop">`. Desktop
   chrome (a thin browser-chrome bar + neutral window dots) is
   implemented as CSS pseudo-elements — the inline `<style>` block emits
   the rules `.device-frame.device-desktop::before` (the bar) and
   `.device-frame.device-desktop::after` (the window dots).
4. **Custom frame uses the per-size custom device-frame class AND
   inherits the desktop-style browser-chrome bar rule.** The
   `custom-override` frame is wrapped in a
   `<div class="device-frame device-custom-1440x900" style="width: 1440px; min-height: 900px;">`.
   The renderer also injects a per-size CSS rule
   `.device-frame.device-custom-1440x900 { width: 1440px; min-height: 900px; }`
   into the inline `<style>` block. Custom shares the desktop chrome via
   the attribute selectors `.device-frame[class*="device-custom-"]::before`
   (browser-chrome bar) and `.device-frame[class*="device-custom-"]::after`
   (window dots) — verify both `[class*="device-custom-"]::before` and
   `[class*="device-custom-"]::after` rules are present in the inline
   `<style>` block.
5. **Frame count matches.** `frame_count: 4` in the spec, and the
   renderer reports `Wrote /tmp/test-out.html (XX.X KB, 4 frames across 1
   flows)` — no `frame_count` mismatch error or warning on stderr.
6. **Stderr is clean.** No `Syntax error` line, no `Warning` line on
   stderr. (An `Info:` line is acceptable but the fixture also declares an
   explicit `## Stream → screens` block so no auto-graph Info line is
   emitted either.)

Grep-able structural strings (run against `/tmp/test-out.html`):

```bash
grep -c 'device-frame device-phone'              # ≥ 1 (canvas + modal)
grep -c 'device-frame device-tablet'             # ≥ 1
grep -c 'device-frame device-desktop'            # ≥ 1
grep -c 'device-frame device-custom-1440x900'    # ≥ 1
grep -c '.device-custom-1440x900 { width: 1440px; min-height: 900px; }'   # ≥ 1
grep -c '.device-frame.device-tablet::before'    # ≥ 1 (status strip rule)
grep -c '.device-frame.device-desktop::before'   # ≥ 1 (browser-chrome bar rule)
grep -c '.device-frame.device-desktop::after'    # ≥ 1 (window dots rule)
grep -c '\[class\*="device-custom-"\]::before'   # ≥ 1 (custom inherits chrome bar)
grep -c '\[class\*="device-custom-"\]::after'    # ≥ 1 (custom inherits window dots)
grep -c 'id="frame-phone-default"'               # = 1
grep -c 'id="frame-tablet-override"'             # = 1
grep -c 'id="frame-desktop-override"'            # = 1
grep -c 'id="frame-custom-override"'             # = 1
```

Note on the chrome contract: phone/tablet status strips and desktop/custom
browser-chrome bars are rendered as CSS `::before` / `::after` pseudo-elements
on the device-frame element, NOT as separate child HTML elements. This is the
intentional structural contract — verify by class + CSS rule presence, not by
searching for child markup.
