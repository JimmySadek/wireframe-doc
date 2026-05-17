---
title: Valid rich markdown + HTML injection attempt
version: v1
date: 2026-05-10
frame_count: 1
deploy_url: example.com
default_device: phone
---

# Valid rich markdown (Blocker 2 fix — XSS sanitization)

## Set the scene

This spec verifies that:
1. Rich Markdown features (bold, italic, code, blockquotes, nested lists) render correctly
2. HTML injection attempts in notes are **sanitized** by DOMPurify, not executed

The frame notes contain an XSS injection attempt via `<script>` tag and an `<img onerror=>` tag.
These should be stripped from the rendered HTML output. The valid Markdown should render normally.

## Main flow

### Frame: Rich notes frame
key: home

Scene: Frame with rich Markdown AND an HTML injection attempt in notes.

```ascii
┌──────────┐
│  Home    │
│          │
│  [Safe]  │
└──────────┘
```

**Notes:**
- **Bold text** renders correctly
- _Italic text_ renders correctly
- Inline `code` renders correctly
- > Blockquotes render correctly
- Nested list:
  - Level 2 item
    - Level 3 item
- XSS attempt 1: <script>alert('xss')</script> — should be sanitized
- XSS attempt 2: <img src="x" onerror="alert('xss')"> — should be sanitized
- XSS attempt 3: <a href="javascript:alert('xss')">click me</a> — href should be sanitized
- Safe HTML: <strong>bold via HTML</strong> — may render (DOMPurify allows safe tags)
- This line appears AFTER the injection attempts — confirms parsing continues correctly
