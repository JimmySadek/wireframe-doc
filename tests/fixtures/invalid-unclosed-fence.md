---
title: Invalid unclosed fence
version: v1
date: 2026-05-10
frame_count: 1
deploy_url: example.com
default_device: phone
---

# Invalid unclosed fence (Blocker 3 fix)

## Set the scene

This spec has an ASCII fence that opens on line 27 but never closes.
The render should EXIT with: "ERROR: Unclosed fence at line 27. Expected closing ``` before EOF."

## Main flow

### Frame: Home
key: home

Scene: The frame with the unclosed fence.

```ascii
┌──────────┐
│  Home    │
│
│  THIS FENCE IS NEVER CLOSED
