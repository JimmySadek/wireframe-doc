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
