---
title: Invalid device value
version: v1
date: 2026-05-10
frame_count: 1
deploy_url: example.com
default_device: phone
---

# Invalid device value (Important 9 fix)

## Set the scene

This spec uses device: foo on a frame, which is not a valid device value.
The render should exit with error: "Invalid device value 'foo' on frame 'home'. Expected: phone, tablet, desktop, or 'custom WxH'."
With --lenient flag, it should warn and fall back to phone.

## Main flow

### Frame: Home
key: home
device: foo

Scene: Frame with an invalid device value.

```ascii
┌──────────┐
│  Home    │
└──────────┘
```

**Notes:**
- device: foo is intentionally invalid — should trigger error (or --lenient warning)
