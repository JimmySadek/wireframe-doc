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

**Expected:** exit 0, HTML written to /tmp/test-out.html

```
Wrote /tmp/test-out.html (XX.X KB, 2 frames across 1 flows)
exit: 0
```

Verifies the flow-level decision-flow cards (v1.3.0):

1. **Three** `<div class="logic-card">` panels are emitted at the HEAD of
   the "Checkout flow" section, before the frame strip, in document order:
   "Entry & identity", then "Failure handling", then the untitled card.
2. The first two cards have a `<div class="logic-card-title">` heading
   (`Entry &amp; identity`, then `Failure handling`); the third (bare
   ` ```flow ` fence, no title text) has **no** title element but still
   renders its `<pre>` correctly — the no-title fallback.
3. Each card BODY is preserved **verbatim** in a monospace `<pre>` — the
   branch line `├─ yes → charge it, skip entry`, the `└─` branches, and
   the `▼` down-arrow appear exactly as authored. The fence info-string
   title is NOT consumed from the body.
4. The single `#frame-pay` token (in the first card) renders as
   `<a href="#frame-pay">#frame-pay</a>`, targeting the existing
   per-frame anchor; all other characters are untouched.
5. The logic cards have **no device chrome** — no `device-frame`
   bezel/status-strip/browser-bar markup inside any panel.
6. A spec with no ` ```flow ` block is unaffected (a panel is only emitted
   per ` ```flow ` block a flow actually contains).
