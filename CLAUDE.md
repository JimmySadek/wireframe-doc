# CLAUDE.md — wireframe-doc skill

## 🎯 Project Facts

- **What:** A Claude Code skill that renders Markdown wireframe specs into a single deployable HTML file. Public, MIT, shipped at v1.0.1.
- **Canonical location:** This directory (`~/.config/skillshare/skills/wireframe-doc`). `~/.claude/skills/wireframe-doc` is a symlink to here — edit here, not via the symlink.
- **Remote:** Public — `github.com/JimmySadek/wireframe-doc`. Anything committed is public.
- **Renderer:** `scripts/wireframe-render.mjs` runs on **Node stdlib only — zero dependencies.** Do not add `package.json` deps or an `npm install` step.

## 📍 Where to Look

- `SKILL.md` — skill contract, spec syntax cheatsheet, frontmatter fields
- `scripts/wireframe-render.mjs` — the renderer (Markdown spec → single-file HTML)
- `assets/spec-template.md` — starting template for new wireframe docs
- `assets/render-template.html` — HTML shell (DOMPurify, modal a11y, CDN fallback)
- `examples/{minimal,multi-flow,stress-test}/poc.md` — small / medium / real-world stress-test specs
- `tests/fixtures/` + `tests/fixtures/EXPECTED.md` — 7 verification cases

## 🧠 Behavioral Guardrails

- **Intentionally low-fidelity.** Neutral gray palette by design. Do not add brand styling, theming, or pixel-polish — that defeats the skill's purpose (intent over aesthetics, pre-Figma review).
- **The device-screen chrome is intentional (v1.1.0+).** The 2px screen bezel, device-appropriate corners, and the "touch of affordance" (phone/tablet status strip, desktop/custom browser-chrome bar with neutral gray window dots) are a deliberate, owner-approved visual contract — they make frames read as real screens. This is structural, not skeuomorphic polish: do NOT extend it toward realistic device art, colored traffic lights, gloss, or shadows-as-decoration, and do NOT revert it as "off-brand." Frames are authored WITHOUT an outer ASCII box — the bezel is the screen edge.
- **Zero-dep invariant.** The renderer must keep running on Node stdlib only. The browser-side libs (marked.js, DOMPurify, Mermaid) load from CDN with a 2-second raw-source fallback — keep that fallback intact.
- **Output stays static HTML.** No clickable prototypes or state transitions — that is an explicit non-goal of the skill.

## ⚙️ Release Process

- SemVer; `CHANGELOG.md` follows Keep a Changelog. Bump `version:` in `SKILL.md` frontmatter on release.
- Manual test loop (renderer over `tests/fixtures/`) is documented in `SKILL.md` § Tests. Run it before any release.
- **Pre-publish guard (mandatory before any public push):** run `scripts/pre-publish-check.sh`; it must exit `0` and print `SAFE TO PUBLISH`. It scans the working tree **and full git history** for leaked confidential content (denylist-driven; the denylist is local-only and gitignored), verifies `SKILL.md` ↔ `CHANGELOG.md` version parity, and runs the fixture render loop. It fails closed — a non-zero exit means do **not** push.
- **Publish flow (single-pass, gated, zero-dep):** the publish path is the local-only, gitignored `.scripts/publish.sh` (supersedes the old multi-flag runbook). Step 1 — dispatch a review agent with `.scripts/release-review-brief.md`; it computes the `origin/main..HEAD` diff, renders an adversarial release-VALUE + README-sanity verdict, and writes `.scripts/.release-verdict` (`APPROVE`/`REJECT`, with base/head/README/CHANGELOG hashes that must match what ships). Step 2 — `bash .scripts/publish.sh` runs every gate in one pass (preflight incl. origin-exists; durable denylist seed from `.scripts/.confidential-markers`; the guard above; durable banner ack `.scripts/.banner-confirmed`; the verdict gate) and, on full pass, prints the one finalize command. Step 3 — `bash .scripts/publish.sh --confirm-publish` does the irreversible push. The script **never calls a model or network** (zero-dep invariant); it only mechanically verifies a fresh, matching, `APPROVE` verdict and fails closed on missing/stale/REJECT (override only via the audited `--override-rejected-verdict="<reason>"`). All `.scripts/*` publish artifacts are gitignored and MUST never be committed.

## 📦 Deferred Work

- **v1.1 trigger-optimization polish** — the full automated description-optimization loop (5 iterations, train/test split, variance benchmark) is deferred; blocked on `ANTHROPIC_API_KEY` being available in the shell env. See the v1.0.1 entry in `CHANGELOG.md` for the deferral rationale.
