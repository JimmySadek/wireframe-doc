---
title: Invalid frame count
version: v1
date: 2026-05-10
frame_count: 5
deploy_url: example.com
default_device: phone
---

# Invalid frame count (Important 8 fix)

## Set the scene

This spec declares frame_count: 5 in frontmatter, but only has 2 frames.
The render should exit with error: "frame_count says 5 but parsed 2 frames."
With --lenient flag, it should warn instead of error.

## Main flow

### Frame: Home
key: home

Scene: First frame.

```ascii
┌──────────┐
│  Home    │
└──────────┘
```

**Notes:**
- Frame 1 of 2

### Frame: About
key: about

Scene: Second frame.

```ascii
┌──────────┐
│  About   │
└──────────┘
```

**Notes:**
- Frame 2 of 2 (frame_count says 5, this is a mismatch — should error)
