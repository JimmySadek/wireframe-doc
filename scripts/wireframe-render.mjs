// wireframe-render.mjs — Wireframe Template Render Script (wireframe-doc skill)
// Origin: 2026-05-10 wireframe-template v1 scratch build
// v1.1 patches: collapsible sections + viewport flex + frame-aware Mermaid
// v1.2 patches: rich Markdown via marked.js CDN (scene, open questions, frame scene, frame notes)
// v1.3 patches: Mermaid tokenizer skip brackets/quotes (Blocker 1), unclosed fence hard-error (Blocker 3),
//               frame_count validation (Important 8), invalid device hard-error (Important 9),
//               full Markdown block preservation (Important 7), --lenient flag
// CLI: node .scripts/wireframe-render.mjs <input.md> <output.html> [--lenient]
// No deps beyond Node stdlib.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const lenient = flags.includes('--lenient');

// ── HTML escaping ──────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Markdown script-tag escape ─────────────────────────────────────────────
// Raw </script> inside a <script> block terminates the script tag prematurely.
// Escape it as <\/script> so the browser parses the markdown payload correctly.
function escapeMarkdownForScriptTag(str) {
  return str.replace(/<\/script>/gi, '<\\/script>');
}

// ── Emit a markdown source block + destination div ─────────────────────────
// Returns: { destinationDiv, scriptBlock }
// destDiv goes first (visible slot); scriptEl follows (hidden source for marked.js).
// The template already has the dest div for scene; for others we emit both here.
function mdScriptBlock(targetId, markdownContent) {
  const safeContent = escapeMarkdownForScriptTag(markdownContent);
  return `<script type="text/markdown" data-target="${targetId}">${safeContent}<\/script>`;
}

// Slugify a string for anchor IDs
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── DEPRECATED: Basic Markdown → HTML (paragraphs only) ──────────────────
// Kept for reference only. v1.2+ uses client-side marked.js instead.
// The scene, open questions, frame scene, and frame notes all use mdScriptBlock().
// function markdownToHtml(text) { ... }

// ── YAML frontmatter parser ────────────────────────────────────────────────
function parseFrontmatter(src) {
  const lines = src.split('\n');
  if (lines[0].trim() !== '---') {
    throw new Error('Missing YAML frontmatter: file must start with ---');
  }
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) {
    throw new Error('Unclosed YAML frontmatter: missing closing ---');
  }
  const fm = {};
  for (let i = 1; i < endIdx; i++) {
    const m = lines[i].match(/^([^:]+):\s*(.*)/);
    if (m) fm[m[1].trim()] = m[2].trim();
  }
  const body = lines.slice(endIdx + 1).join('\n');
  return { fm, body };
}

// ── Device config ──────────────────────────────────────────────────────────
// Resolves a device string to { cssClass, width, height }
// height of null means auto.
// v1.3: invalid device values hard-error by default; --lenient falls back to phone.
function resolveDevice(deviceStr, frameKey) {
  const d = (deviceStr || 'phone').trim().toLowerCase();
  // Preset sizes are recognizable 1× logical viewports: iPhone 14/15 (390×844),
  // iPad portrait (768×1024), desktop/laptop 16:10 (1280×800). Height is a
  // screen-shape floor (min-height) — long screens still grow, see template CSS.
  if (d === 'phone')   return { cssClass: 'device-phone',   width: 390,  height: 844 };
  if (d === 'tablet')  return { cssClass: 'device-tablet',  width: 768,  height: 1024 };
  if (d === 'desktop') return { cssClass: 'device-desktop', width: 1280, height: 800 };
  // custom WxH — e.g. "custom 1440x900"
  const cm = d.match(/^custom\s+(\d+)x(\d+)$/);
  if (cm) {
    const w = parseInt(cm[1], 10);
    const h = parseInt(cm[2], 10);
    if (w > 0 && h > 0) {
      return { cssClass: `device-custom-${w}x${h}`, width: w, height: h };
    }
  }
  // Invalid device value
  const frameRef = frameKey ? ` on frame '${frameKey}'` : '';
  const msg = `Invalid device value '${deviceStr}'${frameRef}. Expected: phone, tablet, desktop, or 'custom WxH'.`;
  if (lenient) {
    process.stderr.write(`Warning: ${msg} Falling back to phone.\n`);
    return { cssClass: 'device-phone', width: 390, height: 844 };
  }
  console.error(`Error: ${msg}`);
  process.exit(1);
}

// ── Body parser ────────────────────────────────────────────────────────────
// v1.3: unclosed fence hard-error at EOF (Blocker 3)
// v1.3: full Markdown block preservation for scene/openq/frame scene/notes (Important 7)
function parseBody(body, defaultDevice) {
  const lines = body.split('\n');
  let sceneLines = [];
  let openQLines = [];
  let streamMermaid = '';
  let streamMermaidLineStart = -1; // line index of opening ``` inside the mermaid block
  // Deck-level decision-flow cards: `flow` blocks authored at the META level
  // (before the first "## {Flow}", alongside scene / open questions / Stream
  // → screens). Positionally scoped — rendered ONCE before all flow sections.
  // Parallel to streamMermaid/sceneLines; same { title, rawText } shape as
  // flow-scoped cards.
  const metaFlowCards = []; // [ { title, rawText } ]
  const flows = []; // { title, flowCards: [ { title, rawText } ], frames: [ { name, key, device, scene, ascii, notes, lineNum } ] }
  let currentFlow = null;
  let currentFrame = null;

  let mode = 'root';
  let inFence = false;
  let fenceType = '';
  let fenceTitle = '';
  let fenceBuf = [];
  let fenceStartLine = -1;

  // v1.3 Blocker 3: track unclosed fences for EOF detection
  let fenceOpenLineForEOF = -1;

  function flushFrame() {
    if (currentFrame && currentFlow) {
      currentFlow.frames.push(currentFrame);
      currentFrame = null;
    }
  }
  function flushFlow() {
    flushFrame();
    if (currentFlow) {
      flows.push(currentFlow);
      currentFlow = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle fenced code blocks
    if (!inFence && /^```(\w*)/.test(line)) {
      inFence = true;
      const fm = line.match(/^```(\w*)(.*)$/);
      fenceType = fm[1].toLowerCase();
      // Anything after the type token on the fence line is the info-string
      // title (used only by the `flow` block). The block BODY is never
      // touched, so the verbatim invariant holds.
      fenceTitle = (fm[2] || '').trim();
      fenceBuf = [];
      fenceStartLine = i;
      fenceOpenLineForEOF = i + 1; // 1-based for error messages
      continue;
    }
    if (inFence && /^```/.test(line)) {
      inFence = false;
      fenceOpenLineForEOF = -1; // closed cleanly
      if (fenceType === 'mermaid' && mode === 'stream') {
        streamMermaid = fenceBuf.join('\n');
        streamMermaidLineStart = fenceStartLine;
      } else if (fenceType === 'flow' && currentFlow && !currentFrame) {
        // Flow-level decision-flow card: a "decided logic" panel at the head
        // of its flow, before any frame. Title comes from the fence info
        // string (may be empty → untitled card); the BODY is verbatim,
        // exactly like the ascii screen block (no Markdown, no Mermaid).
        // Multiple cards per flow are kept in document order.
        currentFlow.flowCards.push({ title: fenceTitle, rawText: fenceBuf.join('\n') });
      } else if (fenceType === 'flow' && !currentFlow && !currentFrame) {
        // Meta-level decision-flow card: a `flow` block authored BEFORE the
        // first "## {Flow}" (alongside scene / open questions / Stream →
        // screens). Positionally scoped to the whole deck — rendered ONCE
        // before all flow sections. Same { title, rawText } shape and
        // verbatim-body fidelity as a flow-scoped card; many allowed, kept
        // in document order.
        metaFlowCards.push({ title: fenceTitle, rawText: fenceBuf.join('\n') });
      } else if (fenceType === 'flow') {
        // A `flow` fence that cannot attach (e.g. inside a frame). Positional
        // scoping has no slot for it — warn (same style as the other
        // stderr warnings in this file) and continue. Non-fatal: the render
        // still completes and exits 0. Replaces the prior silent drop.
        process.stderr.write(
          `Warning (line ${fenceStartLine + 1}): \`flow\` block cannot be placed here ` +
          `(inside a frame). A flow card must be at the meta level (before the first ` +
          `"## {Flow}") or under a "## {Flow}" heading before its first "### Frame:". Skipped.\n`
        );
      } else if (fenceType === 'ascii' && currentFrame) {
        currentFrame.ascii = fenceBuf.join('\n');
      }
      fenceBuf = [];
      fenceType = '';
      fenceTitle = '';
      fenceStartLine = -1;
      continue;
    }
    if (inFence) {
      fenceBuf.push(line);
      continue;
    }

    // Section headings
    if (/^## /.test(line)) {
      const heading = line.slice(3).trim();
      if (heading === 'Set the scene') {
        flushFlow();
        mode = 'scene';
        continue;
      }
      if (heading === 'Open questions for the team') {
        flushFlow();
        mode = 'openq';
        continue;
      }
      if (heading === 'Stream → screens' || heading === 'Stream -> screens') {
        flushFlow();
        mode = 'stream';
        continue;
      }
      // Otherwise: start a new flow
      flushFlow();
      mode = 'flow';
      currentFlow = { title: heading, flowCards: [], frames: [] };
      continue;
    }

    if (/^### Frame: /.test(line)) {
      flushFrame();
      const frameName = line.slice('### Frame: '.length).trim();
      currentFrame = {
        name: frameName,
        key: null,          // filled in by key: line or derived
        device: defaultDevice, // default; overridden by device: line
        scene: '',
        ascii: '',
        // v1.3 Important 7: preserve full note lines (not just bullet text)
        notesLines: [],
        lineNum: i + 1,   // 1-based for error messages
      };
      mode = 'frame';
      continue;
    }

    // Accumulate by mode
    // v1.3 Important 7: scene captures ALL lines (preserves empty lines, paragraphs)
    if (mode === 'scene') {
      sceneLines.push(line);
    } else if (mode === 'openq') {
      // v1.3 Important 7: capture ALL lines (preserves empty lines, nested lists, paragraphs)
      openQLines.push(line);
    } else if (mode === 'frame' && currentFrame) {
      // **Notes:** marker
      if (/^\*\*Notes:\*\*/.test(line.trim())) {
        mode = 'notes';
        continue;
      }
      // key: line — MUST be before any scene text or ascii block
      const keyMatch = line.match(/^key:\s*([a-z][a-z0-9-]*)$/);
      if (keyMatch && !currentFrame.scene) {
        currentFrame.key = keyMatch[1];
        continue;
      }
      // device: line — before scene text
      const deviceMatch = line.match(/^device:\s*(.+)$/i);
      if (deviceMatch && !currentFrame.scene) {
        currentFrame.device = deviceMatch[1].trim().toLowerCase();
        continue;
      }
      // Scene: first non-empty, non-heading, non-fence line after ### Frame:
      // v1.3 Important 7: once scene has started, accumulate full content until next marker
      if (!currentFrame.scene && line.trim() && !/^```/.test(line) && !/^key:/.test(line) && !/^device:/.test(line)) {
        currentFrame.scene = line.trim();
      }
    } else if (mode === 'notes' && currentFrame) {
      if (/^\*\*Notes:\*\*/.test(line.trim())) continue;
      // v1.3 Important 7: detect section end (heading lines exit notes mode)
      if (/^#{1,3} /.test(line)) {
        // Re-process heading lines
        mode = 'frame';
        if (/^## /.test(line)) {
          const heading = line.slice(3).trim();
          flushFlow();
          mode = 'flow';
          currentFlow = { title: heading, flowCards: [], frames: [] };
        } else if (/^### Frame: /.test(line)) {
          flushFrame();
          const frameName = line.slice('### Frame: '.length).trim();
          currentFrame = {
            name: frameName,
            key: null,
            device: defaultDevice,
            scene: '',
            ascii: '',
            notesLines: [],
            lineNum: i + 1,
          };
          mode = 'frame';
        }
        continue;
      }
      // v1.3 Important 7: preserve ALL note lines (empty, bullets, nested, paragraphs)
      currentFrame.notesLines.push(line);
    }
  }

  // Flush any remaining
  flushFlow();

  // v1.3 Blocker 3: EOF unclosed fence detection
  if (inFence && fenceOpenLineForEOF > 0) {
    console.error(`ERROR: Unclosed fence at line ${fenceOpenLineForEOF}. Expected closing \`\`\` before EOF.`);
    process.exit(1);
  }

  // ── Post-process: convert notesLines to final markdown, assign/derive keys ──
  const allFrames = flows.flatMap(f => f.frames);
  for (const frame of allFrames) {
    // Build notes markdown from preserved lines
    // Strip trailing empty lines; keep internal structure
    const notesTrimmed = frame.notesLines.join('\n').trimEnd();
    frame.notesMarkdown = notesTrimmed.length > 0 ? notesTrimmed : '_No notes._';
    delete frame.notesLines;
  }

  // ── Post-process: assign / derive keys, check duplicates ─────────────────
  const keysSeen = new Map(); // key → lineNum
  for (const frame of allFrames) {
    if (!frame.key) {
      // Derive from heading (lowercase + hyphens), warn
      const derived = slugify(frame.name);
      process.stderr.write(
        `Warning (line ${frame.lineNum}): frame "${frame.name}" has no key: field. ` +
        `Derived key "${derived}" — add key: ${derived} to suppress this warning.\n`
      );
      frame.key = derived;
    }
    if (keysSeen.has(frame.key)) {
      process.stderr.write(
        `Error (line ${frame.lineNum}): duplicate key "${frame.key}". ` +
        `First seen at line ${keysSeen.get(frame.key)}. Keys must be unique per doc.\n`
      );
      process.exit(1);
    }
    keysSeen.set(frame.key, frame.lineNum);
  }

  // ── Mermaid validation + label substitution ───────────────────────────────
  // v1.3 Blocker 1: Tokenize OUTSIDE brackets/quotes only
  const frameKeySet = new Set(allFrames.map(f => f.key));
  const frameKeyToName = new Map(allFrames.map(f => [f.key, f.name]));

  if (!streamMermaid) {
    // Auto-generate linear graph from frame order
    if (allFrames.length > 0) {
      const nodeIds = allFrames.map(f => f.key);
      const pairs = [];
      for (let i = 0; i < nodeIds.length - 1; i++) {
        pairs.push(`  ${nodeIds[i]} --> ${nodeIds[i + 1]}`);
      }
      if (pairs.length > 0) {
        streamMermaid = 'graph LR\n' + pairs.join('\n');
      } else {
        // Single frame
        streamMermaid = `graph LR\n  ${nodeIds[0]}`;
      }
      process.stderr.write(
        `Info: no "## Stream → screens" block found — auto-generated linear Mermaid graph from frame order.\n`
      );
    }
  } else {
    // v1.3 Blocker 1: validate Mermaid node IDs only OUTSIDE brackets/quotes
    const mermaidLines = streamMermaid.split('\n');
    const nodeIds = new Set();

    for (const mLine of mermaidLines) {
      // Skip directive lines (graph LR, graph TD, etc.)
      if (/^\s*(graph|flowchart|sequenceDiagram|classDiagram)\b/i.test(mLine)) continue;
      if (/^\s*(%%|subgraph|end\b)/.test(mLine)) continue;

      // Strip bracketed label expressions: [...], (...), {...}, ["..."], ("..."), {{"..."}}
      // Strip quoted strings: "...", '...'
      // Strip arrow labels: --text-->, ==text==>, -.text.->
      let stripped = mLine;
      // Strip bracketed labels (all Mermaid label syntaxes)
      stripped = stripped.replace(/\[(?:"[^"]*"|[^\]]*)\]/g, '');
      stripped = stripped.replace(/\((?:"[^"]*"|[^)]*)\)/g, '');
      stripped = stripped.replace(/\{(?:"[^"]*"|[^}]*)\}/g, '');
      // Strip arrow labels: --text-->, ==text==>, -.text.->
      stripped = stripped.replace(/--[^->\s]+-{0,2}>/g, '-->');
      stripped = stripped.replace(/==[^=>\s]+=={0,2}>/g, '==>');
      stripped = stripped.replace(/-\.[^.\s]+\.->/g, '-->');
      // Strip remaining quoted strings
      stripped = stripped.replace(/"[^"]*"/g, '');
      stripped = stripped.replace(/'[^']*'/g, '');

      // Now extract bare word tokens that look like node IDs
      const tokenRegex = /\b([a-z][a-z0-9-]*)\b/g;
      let m;
      while ((m = tokenRegex.exec(stripped)) !== null) {
        const candidate = m[1];
        // Skip Mermaid keywords
        if (['graph', 'flowchart', 'lr', 'td', 'tb', 'rl', 'bt', 'subgraph', 'end', 'direction', 'style', 'class', 'classDef', 'linkStyle'].includes(candidate)) continue;
        nodeIds.add(candidate);
      }
    }

    // Validate: any nodeId must exist in frameKeySet
    let hasError = false;
    for (const nodeId of nodeIds) {
      if (!frameKeySet.has(nodeId)) {
        process.stderr.write(
          `Error (Mermaid block, near line ${streamMermaidLineStart + 1}): ` +
          `node ID "${nodeId}" does not match any frame key. ` +
          `Frame keys in this doc: [${[...frameKeySet].join(', ')}]. ` +
          `Check for a typo.\n`
        );
        hasError = true;
      }
    }
    if (hasError) {
      process.exit(1);
    }

    // Warn: any frame key not appearing in any Mermaid node
    for (const key of frameKeySet) {
      if (!nodeIds.has(key)) {
        process.stderr.write(
          `Warning: frame key "${key}" does not appear in the Stream → screens Mermaid diagram. ` +
          `The frame exists in the deck but is not in the flow.\n`
        );
      }
    }

    // Substitute labels: replace bare node IDs with labeled versions
    // e.g., "welcome" becomes "welcome["Welcome"]" in the rendered Mermaid
    // Only substitute when the node ID appears without a label already
    // v1.3 Blocker 1: skip already-labeled nodes (id["label"] or id[label])
    let substituted = streamMermaid;
    for (const [key, name] of frameKeyToName) {
      // Match the key as a standalone identifier (not already followed by a bracket)
      // Pattern: key NOT followed by [, (, {, "
      const re = new RegExp(`\\b${escapeRegex(key)}\\b(?!\\s*[\\[\\({"'])`, 'g');
      substituted = substituted.replace(re, `${key}["${name.replace(/"/g, '\\"')}"]`);
    }
    streamMermaid = substituted;
  }

  return { sceneLines, openQLines, streamMermaid, metaFlowCards, flows };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── CSS for device variants ────────────────────────────────────────────────
// Returns inline <style> block if any custom dimensions are needed
function buildDeviceCustomStyles(flows) {
  const customs = new Map(); // "WxH" → { w, h }
  for (const flow of flows) {
    for (const frame of flow.frames) {
      const dev = resolveDevice(frame.device, frame.key);
      if (dev.cssClass.startsWith('device-custom-') && dev.height !== null) {
        customs.set(`${dev.width}x${dev.height}`, { w: dev.width, h: dev.height });
      }
    }
  }
  if (customs.size === 0) return '';
  let css = '<style>\n';
  for (const [, { w, h }] of customs) {
    const cls = `device-custom-${w}x${h}`;
    // Canvas screen = exact custom size, height as a screen-shape floor. The
    // modal screen now holds the SAME logical viewport (scaled as one unit by
    // the modal script) so custom frames keep their true ratio when enlarged.
    css += `  .device-frame.${cls} { width: ${w}px; min-height: ${h}px; }\n`;
    css += `  .modal-device.${cls} { width: ${w}px; min-height: ${h}px; }\n`;
  }
  css += '</style>';
  return css;
}

// ── ASCII fit sizing ───────────────────────────────────────────────────────
// CSS cannot measure the character-column count of authored ASCII, so the
// renderer (the only component that has the text) computes a font-size that
// makes the widest line fill the device inner width. Monospace advance width
// is ≈ CHAR_RATIO × font-size; 0.62 is conservative vs the common 0.60 so the
// widest line spans ~97% of the inner width — it reads full-bleed without
// overflowing. Emitted as the --ascii-fs custom property; the template keeps a
// hard-coded var() fallback so a missing value still renders legibly.
const CHAR_RATIO = 0.62;       // monospace advance width ÷ font-size
const FRAME_PAD_BORDER = 40;   // device-frame: padding 2×18 + bezel border 2×2 (border-box)
const CANVAS_FS_MIN = 7;       // floor: pathologically wide art stays legible
const CANVAS_FS_MAX = 22;      // ceiling: do not grotesquely zoom tiny art

// Display width of one code point. Emoji and CJK occupy ~2 monospace cells but
// are 1 code point — counting them as 1 skews alignment and the fit math, so
// authors can use emoji as icons and borders still line up. Zero-dependency,
// no Intl segmenter; range-based and deliberately conservative (over-counting
// only shrinks the font slightly, which is the safe direction).
function charWidth(cp, nextCp) {
  if (cp === 0xFE0F || cp === 0x200D || (cp >= 0x1F3FB && cp <= 0x1F3FF)) return 0; // VS16, ZWJ, skin tone
  if ((cp >= 0x0300 && cp <= 0x036F) || (cp >= 0x1AB0 && cp <= 0x1AFF) ||
      (cp >= 0x1DC0 && cp <= 0x1DFF) || (cp >= 0x20D0 && cp <= 0x20FF) ||
      (cp >= 0xFE20 && cp <= 0xFE2F)) return 0;                                     // combining marks
  if (nextCp === 0xFE0F) return 2;                                                  // forced emoji presentation
  if (cp >= 0x1F000) return 2;                                                      // astral emoji / pictographs / flags
  if ((cp >= 0x2600 && cp <= 0x27BF) || (cp >= 0x2B00 && cp <= 0x2BFF) ||
      cp === 0x3030 || cp === 0x303D) return 2;                                      // BMP emoji-ish symbol blocks
  if ((cp >= 0x1100 && cp <= 0x115F) || (cp >= 0x2E80 && cp <= 0xA4CF) ||
      (cp >= 0xAC00 && cp <= 0xD7A3) || (cp >= 0xF900 && cp <= 0xFAFF) ||
      (cp >= 0xFE30 && cp <= 0xFE4F) || (cp >= 0xFF00 && cp <= 0xFF60) ||
      (cp >= 0xFFE0 && cp <= 0xFFE6)) return 2;                                      // East Asian wide (defensive)
  return 1;
}
function displayWidth(str) {
  const cps = Array.from(str).map(c => c.codePointAt(0));
  let w = 0;
  for (let i = 0; i < cps.length; i++) w += charWidth(cps[i], cps[i + 1]);
  return w;
}

function asciiMaxCols(ascii) {
  if (!ascii) return 1;
  let max = 0;
  for (const line of ascii.split('\n')) {
    const w = displayWidth(line);
    if (w > max) max = w;
  }
  return Math.max(1, max);
}

// Canvas font-size (px) so the widest ASCII line ≈ fills the device inner width.
function canvasFontSize(ascii, deviceWidth) {
  const inner = Math.max(40, deviceWidth - FRAME_PAD_BORDER);
  const cols = asciiMaxCols(ascii);
  const raw = Math.floor(inner / (cols * CHAR_RATIO));
  return Math.max(CANVAS_FS_MIN, Math.min(CANVAS_FS_MAX, raw));
}

// v1.2.0: the modal device holds its TRUE fixed logical viewport (same as the
// canvas frame) and is scaled as one unit by the modal script to fit the
// screen. The ASCII must therefore fit that fixed device width exactly like
// the canvas does, so the modal uses the canvas fit font size directly — the
// uniform CSS scale provides the on-screen enlargement. (The pre-v1.2 phone
// ×1.7 blow-up only "worked" with the old shrink-wrap modal; against a fixed
// 390px screen it made the art wider than the screen and clipped.)
function modalFontSize(canvasFs) {
  return canvasFs;
}

// ── Shared control markup ──────────────────────────────────────────────────
// Clearer enlarge affordance: a corner-expand / fullscreen glyph (monochrome,
// neutral — strokes inherit the control colour). Visible "enlarge" text stays
// so the control is not icon-only for screen readers.
const ENLARGE_ICON =
  '<svg class="enlarge-ico" width="13" height="13" viewBox="0 0 16 16" ' +
  'aria-hidden="true" stroke-width="1.6" stroke-linecap="round" ' +
  'stroke-linejoin="round"><path d="M6 2H2v4M14 6V2h-4M10 14h4v-4M2 ' +
  '10v4h4"/></svg>';

// Copy-link button — emitted in BOTH the inline footer and each modal frame.
// Carries the frame key; the template script copies
// origin+pathname+search+#frame-{key}. Tooltip explains the use case and is
// revealed on hover AND keyboard focus (CSS, reduced-motion safe).
const COPY_TIP_TEXT =
  'Copies a link straight to this frame — paste it anywhere to start a discussion.';
function copyLinkButton(key) {
  return `<button class="copy-link-btn" data-frame-key="${key}" type="button" ` +
    `aria-label="Copy link to frame ${key}">` +
    `<span class="copy-label">Copy link</span>` +
    `<span class="copy-tip" role="tooltip">${escapeHtml(COPY_TIP_TEXT)}</span>` +
    `</button>`;
}

// ── Flow decision-flow cards ───────────────────────────────────────────────
// Flow-level "decided logic" panels. The card BODY is verbatim monospace (NOT
// Markdown, NOT Mermaid) — same fidelity as the ascii screen block. The only
// transform is: any literal #frame-{key} token becomes an anchor to that
// frame's existing per-frame anchor (#frame-{key}). All other characters are
// escaped and left exactly as authored. The renderer does NOT validate where
// links appear — "links at leaves only, sparse" is SKILL.md authoring
// guidance, not code. The card title comes from the fence info string (never
// the body) and may be empty (untitled card).
function linkifyFlowBlock(rawText) {
  // Escape first so box-drawing / arrows / branch glyphs are preserved exactly
  // and no authored character can become markup, then splice anchors in on the
  // escaped string (the #frame-{key} token contains no HTML-special chars).
  const escaped = escapeHtml(rawText);
  return escaped.replace(/#frame-([a-z][a-z0-9-]*)/g, (m, key) =>
    `<a href="#frame-${key}">${m}</a>`);
}

// ── HTML generators ────────────────────────────────────────────────────────
// One logic-card panel — shared by deck-level (meta) and flow-scoped cards so
// the markup is byte-identical at both placements. NOT a screen: no device
// chrome. Verbatim body in a monospace <pre>; an optional title from the
// fence info string (omitted when untitled). The title doubles as the
// collapse toggle via <details>/<summary> (same mechanism as scene / open
// questions); an untitled card stays a plain always-open panel.
function logicCardHtml(card, indent) {
  const p = indent;
  let html = '';
  if (card.title) {
    html += `${p}<details class="logic-card" open>\n`;
    html += `${p}  <summary class="logic-card-title">${escapeHtml(card.title)}</summary>\n`;
    html += `${p}  <pre>${linkifyFlowBlock(card.rawText)}</pre>\n`;
    html += `${p}</details>\n`;
  } else {
    html += `${p}<div class="logic-card">\n`;
    html += `${p}  <pre>${linkifyFlowBlock(card.rawText)}</pre>\n`;
    html += `${p}</div>\n`;
  }
  return html;
}

// Deck-level logic cards: positionally scoped to the whole deck (authored at
// the meta level). Rendered ONCE, before all flow sections, in document order.
function generateMetaFlowCards(metaFlowCards) {
  let html = '';
  for (const card of metaFlowCards) {
    html += logicCardHtml(card, '  ');
  }
  return html;
}

function generateFlowSections(flows) {
  let html = '';
  for (const flow of flows) {
    html += `<section class="flow-section">\n`;
    html += `  <h2>${escapeHtml(flow.title)}</h2>\n`;
    // Plain bordered "logic card" panels — NOT screens: no device chrome,
    // no bezel, no status strip. One panel per flow card, in document order,
    // at the HEAD of the flow section before the frame strip. Verbatim body
    // in a monospace pre; an optional title heading from the fence info
    // string (omitted entirely when the card is untitled).
    for (const card of flow.flowCards) {
      html += logicCardHtml(card, '  ');
    }
    html += `  <div class="frame-strip">\n`;
    for (const frame of flow.frames) {
      const key = frame.key;
      const anchorId = `frame-${key}`;
      const dev = resolveDevice(frame.device, key);
      const fsCanvas = canvasFontSize(frame.ascii, dev.width);

      // Card width = screen + notes column (320) + gap + padding. Presets get
      // their screen size from the CSS device class; only custom needs an
      // inline screen size (width + min-height screen-shape floor).
      const cardMin = dev.width + 320 + 24 + 20 * 2;
      const cardStyle = ` style="min-width: ${cardMin}px; max-width: ${cardMin + 60}px;"`;
      const deviceFrameStyle = dev.cssClass.startsWith('device-custom-')
        ? ` style="width: ${dev.width}px; min-height: ${dev.height}px;"`
        : '';

      // Per-frame scene markdown target ID
      const sceneTargetId = `md-frame-${key}-scene`;
      // Per-frame notes markdown target ID
      const notesTargetId = `md-frame-${key}-notes`;

      html += `    <article class="frame-card" id="${anchorId}"${cardStyle}>\n`;
      // The screen holds ONLY the wireframed UI. Scene text is meta about the
      // frame, so it lives in the notes column (like the modal already does).
      html += `      <div class="device-frame ${dev.cssClass}"${deviceFrameStyle}>\n`;
      html += `        <pre style="--ascii-fs:${fsCanvas}px">${escapeHtml(frame.ascii)}</pre>\n`;
      html += `      </div>\n`;
      html += `      <div class="notes">\n`;
      html += `        <div>\n`;
      html += `          <h3>${escapeHtml(frame.name)}</h3>\n`;
      if (dev.cssClass !== 'device-phone') {
        html += `          <span class="device-badge">${escapeHtml(frame.device)}</span>\n`;
      }
      if (frame.scene) {
        html += `          <div class="frame-scene md-content" id="${sceneTargetId}"></div>\n`;
        html += `          ${mdScriptBlock(sceneTargetId, frame.scene)}\n`;
      }
      html += `          <div class="md-content" id="${notesTargetId}"></div>\n`;
      html += `          ${mdScriptBlock(notesTargetId, frame.notesMarkdown)}\n`;
      html += `        </div>\n`;
      html += `        <div class="frame-footer">\n`;
      html += `          ${copyLinkButton(key)}\n`;
      html += `          <button class="enlarge-btn" data-frame-key="${key}" aria-label="Enlarge frame ${key}">${ENLARGE_ICON} enlarge</button>\n`;
      html += `        </div>\n`;
      html += `      </div>\n`;
      html += `    </article>\n`;
    }
    html += `  </div>\n`;
    html += `</section>\n`;
  }
  return html;
}

function generateModalFrames(flows) {
  let html = '';
  for (const flow of flows) {
    for (const frame of flow.frames) {
      const key = frame.key;
      const dev = resolveDevice(frame.device, key);
      const isPhone = dev.cssClass === 'device-phone';
      const fsModal = modalFontSize(canvasFontSize(frame.ascii, dev.width));
      // The enlarged device holds its true logical viewport (fixed via the
      // CSS device class) and is scaled as one unit by the modal script to
      // fit the dialog — no inline device sizing needed here.
      const modalDeviceStyle = '';

      // Modal uses unique target IDs (prefixed "modal-") so they don't collide with canvas IDs
      const modalSceneTargetId = `md-modal-${key}-scene`;
      const modalNotesTargetId = `md-modal-${key}-notes`;

      html += `<div class="modal-frame${isPhone ? '' : ' modal-wide'}" data-key="${key}">\n`;
      html += `  <div class="modal-content">\n`;
      html += `    <div class="modal-device-scaler"><div class="modal-device ${dev.cssClass}"${modalDeviceStyle}><pre style="--ascii-fs:${fsModal}px">${escapeHtml(frame.ascii)}</pre></div></div>\n`;
      html += `    <div class="modal-notes">\n`;
      html += `      <span class="deep-link-badge">Shared frame — you were linked here</span>\n`;
      html += `      <h2>${escapeHtml(frame.name)}</h2>\n`;
      html += `      <div class="modal-share">${copyLinkButton(key)}</div>\n`;
      if (frame.scene) {
        html += `      <p class="scene md-content" id="${modalSceneTargetId}"></p>\n`;
        html += `      ${mdScriptBlock(modalSceneTargetId, frame.scene)}\n`;
      }
      html += `      <div class="md-content" id="${modalNotesTargetId}"></div>\n`;
      html += `      ${mdScriptBlock(modalNotesTargetId, frame.notesMarkdown)}\n`;
      html += `    </div>\n`;
      html += `  </div>\n`;
      html += `</div>\n`;
    }
  }
  return html;
}

// ── Main ───────────────────────────────────────────────────────────────────
function main() {
  const [inputPath, outputPath] = args;

  // Graceful help / missing args
  if (!inputPath || inputPath === '--help' || inputPath === '-h') {
    console.log('Usage: node .scripts/wireframe-render.mjs <input.md> <output.html> [--lenient]');
    console.log('');
    console.log('  input.md    — Wireframe spec Markdown file (with YAML frontmatter)');
    console.log('  output.html — Output HTML path');
    console.log('  --lenient   — Warn instead of error for frame_count mismatch, invalid device');
    console.log('');
    console.log('Template: output/wireframes-template/spec-template.md');
    process.exit(inputPath ? 0 : 1);
  }
  if (!outputPath) {
    console.error('Error: missing <output.html> argument');
    console.error('Usage: node .scripts/wireframe-render.mjs <input.md> <output.html> [--lenient]');
    process.exit(1);
  }

  const inputAbs = resolve(process.cwd(), inputPath);
  const outputAbs = resolve(process.cwd(), outputPath);
  const templateAbs = resolve(__dirname, '../assets/render-template.html');

  // Read input
  let src;
  try { src = readFileSync(inputAbs, 'utf-8'); }
  catch (e) { console.error(`Error: cannot read input file: ${inputPath}\n  ${e.message}`); process.exit(1); }

  // Read template
  let tpl;
  try { tpl = readFileSync(templateAbs, 'utf-8'); }
  catch (e) { console.error(`Error: cannot read render template: ${templateAbs}\n  ${e.message}`); process.exit(1); }

  // Parse frontmatter
  let fm, body;
  try {
    ({ fm, body } = parseFrontmatter(src));
  } catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }

  const requiredFields = ['title', 'version', 'date', 'frame_count', 'deploy_url'];
  for (const f of requiredFields) {
    if (!fm[f]) {
      console.error(`Error: frontmatter missing required field: ${f}`);
      process.exit(1);
    }
  }

  // Resolve default device (Patch 2)
  const defaultDevice = fm['default_device'] || 'phone';
  // v1.3: resolveDevice now hard-errors on invalid values (--lenient warns)
  resolveDevice(defaultDevice);

  // Parse body
  const { sceneLines, openQLines, streamMermaid, metaFlowCards, flows } = parseBody(body, defaultDevice);

  // Count frames
  const totalFrames = flows.reduce((acc, f) => acc + f.frames.length, 0);
  const totalFlows = flows.length;

  // v1.3 Important 8: validate frame_count frontmatter vs actual count
  const declaredFrameCount = parseInt(fm.frame_count, 10);
  if (!isNaN(declaredFrameCount) && declaredFrameCount !== totalFrames) {
    const msg = `frame_count says ${declaredFrameCount} but parsed ${totalFrames} frames.`;
    if (lenient) {
      process.stderr.write(`Warning: ${msg}\n`);
    } else {
      console.error(`Error: ${msg}`);
      process.exit(1);
    }
  }

  // Build any custom device <style> blocks
  const customDeviceStyles = buildDeviceCustomStyles(flows);

  // Generate substitutions

  // v1.3 Important 7: scene captures full markdown (all lines, preserves empty/paragraphs)
  const sceneMarkdown = sceneLines.length
    ? sceneLines.join('\n').trimEnd()
    : '_No scene description provided._';
  const sceneMdScript = mdScriptBlock('md-scene', sceneMarkdown);

  // v1.3 Important 7: open questions captures full markdown block
  const openQMarkdown = openQLines.length
    ? openQLines.join('\n').trimEnd()
    : '_No open questions listed._';
  const openQMdScript = mdScriptBlock('md-open-questions', openQMarkdown);

  const metaFlowCardsHtml = generateMetaFlowCards(metaFlowCards);
  const flowSectionsHtml = generateFlowSections(flows);
  const modalFramesHtml = generateModalFrames(flows);

  // All frame keys for the JS modal lookup
  const allFrames = flows.flatMap(f => f.frames);
  const frameKeysJson = JSON.stringify(allFrames.map(f => f.key));

  // Substitute placeholders
  let out = tpl
    .replace(/\{\{TITLE\}\}/g, escapeHtml(fm.title))
    .replace(/\{\{VERSION\}\}/g, escapeHtml(fm.version))
    .replace(/\{\{DATE\}\}/g, escapeHtml(fm.date))
    .replace(/\{\{FRAME_COUNT\}\}/g, escapeHtml(fm.frame_count))
    .replace(/\{\{DEPLOY_URL\}\}/g, escapeHtml(fm.deploy_url))
    .replace('{{SCENE_MD_SCRIPT}}', sceneMdScript)
    .replace('{{OPEN_QUESTIONS_MD_SCRIPT}}', openQMdScript)
    .replace('{{STREAM_MERMAID}}', streamMermaid)
    .replace('{{META_FLOW_CARDS_HTML}}', metaFlowCardsHtml)
    .replace('{{FLOW_SECTIONS_HTML}}', flowSectionsHtml)
    .replace('{{MODAL_FRAMES_HTML}}', modalFramesHtml)
    .replace('{{CUSTOM_DEVICE_STYLES}}', customDeviceStyles)
    .replace('{{FRAME_KEYS_JSON}}', frameKeysJson);

  // Write output
  try { writeFileSync(outputAbs, out, 'utf-8'); }
  catch (e) { console.error(`Error: cannot write output file: ${outputPath}\n  ${e.message}`); process.exit(1); }

  const sizeKb = (Buffer.byteLength(out, 'utf-8') / 1024).toFixed(1);
  console.log(`Wrote ${outputPath} (${sizeKb} KB, ${totalFrames} frames across ${totalFlows} flows)`);
}

main();
