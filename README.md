![wireframe-doc — Markdown spec to HTML wireframes](assets/banner.jpg)

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# wireframe-doc

> Figma is for designing. **wireframe-doc is for deciding what to design.**

A Claude Code skill that turns a Markdown spec into a single self-contained HTML
page of low-fidelity screen wireframes — ASCII frames in device chrome, a flow
diagram, decision-flow logic cards, reviewer notes — that you share as one URL. ~50 KB for a small deck,
~215 KB for a large multi-flow one — no design tool, no export. Built for the
messy moment before design: when you need cofounders or your team reacting to
the screens in your head.

![The FieldPilot showcase, enlarged: the desktop "Dispatch board" frame in a browser-chrome device shell — KPI strip on top, unassigned-jobs queue and fleet timeline as the body, action bar pinned to the bottom — beside its reviewer notes, with the Copy link button and the modal close/Prev/Next controls](assets/sample.png)

*The "Dispatch board" frame (desktop) from the FieldPilot job-dispatch showcase, opened in the enlarge modal — composed top→body→bottom, its reviewer notes alongside. Authored as plain Markdown ASCII; shared as one URL.*

## The problem

The fastest way to align on a product flow is to show people the screens. But
the tools for that are heavy — Figma means a license, a learning curve, and a
~1.8 MB export for what's still just a sketch. So the screens stay in your head,
or in a doc nobody can picture, and you commit to a design before anyone's
reacted to the flow.

## Who it's for

- Founders, pre-design — get cofounders reacting to a flow before you spend a design cycle on it.
- Product and engineering with no designer in the loop — sketch the screens, drop the link in Slack, read the notes when people get to them.
- Anyone who'd otherwise send a heavy Figma export — replace it with a URL that opens on a phone.

## wireframe-doc vs a real design tool

| | wireframe-doc | Figma / design tool |
|---|---|---|
| Stage | Before design — deciding the flow | During design — making it real |
| Fidelity | Low-fi, intent over polish | Pixel-perfect |
| Output | One ~50–215 KB URL | ~1.8 MB file / export |
| Audience | Cofounders, team, async reviewers | Designers, stakeholders |

Use wireframe-doc to decide what to build. Switch to a real design tool to make it look right.

## What's inside

When an AI agent triggers this skill, it reads `SKILL.md` — the authoring contract that teaches it how to produce a quality wireframe deck. Humans don't need to. Here's where to look:

- **`SKILL.md`** — the authoring contract. Agents read this at trigger time; humans can skim it to understand what good output looks like.
- **`examples/showcase/poc.md`** — the canonical screenshot-verified example (6 frames across phone, tablet, and desktop; 2 flows; the full feature set).
- **`assets/spec-template.md`** — copy this to start a new wireframe doc.
- **`tests/fixtures/`** — renderer fixture coverage.

## Quick start

1. Copy `assets/spec-template.md` to your project
2. Fill in frontmatter + scene + open questions + frames + notes
3. Render: `node scripts/wireframe-render.mjs your-spec.md output.html`
4. Open `output.html` in a browser, or deploy to any static host
5. Share the URL — or use a frame's **Copy link** button to share one screen for discussion

## Deploy

The render output is a **single self-contained HTML file**. Deploy it anywhere:

- **Vercel** — `vercel deploy --prod --yes`
- **Netlify** — drag the HTML file to Netlify Drop
- **GitHub Pages** — commit as `index.html` to a `gh-pages` branch

## Examples

One canonical, screenshot-verified example ships with the skill — `examples/showcase/poc.md` (FieldPilot job dispatch, 6 frames across phone / desktop / tablet, 2 flows). Render it:

```
node scripts/wireframe-render.mjs examples/showcase/poc.md /tmp/showcase.html
```
