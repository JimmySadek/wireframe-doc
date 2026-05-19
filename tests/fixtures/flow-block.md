---
title: Flow block fixture
version: v1
date: 2026-05-19
frame_count: 2
deploy_url: example.com
default_device: phone
---

# Flow block fixture

## Set the scene

Exercises positional (meta + flow) decision-flow card placement: one
META-level card (authored before the first "## {Flow}") rendered ONCE before
all flow sections; two NAMED flow-scoped cards plus one bare UNTITLED card
under "## Checkout flow" rendering as separate titled panels in document
order; a #frame-{key} leaf link; collapsible markup on titled cards; and a
misplaced `flow` fence inside a frame that emits a one-line stderr Warning
(non-fatal). Branch glyphs and a down-arrow are preserved verbatim.

```flow Deck-level routing
app opened from any entry point
            │
            ▼
  Signed in on this device?
  ├─ yes → straight to the cart
  └─ no  → sign-in wall first
```

## Checkout flow

```flow Entry & identity
cart + saved-payment
        │
        ▼
  Has a default card on file?
  ├─ yes → charge it, skip entry
  └─ no  → ask for a card  → #frame-pay
           (Apple Pay offered first on iOS)
```

```flow Failure handling
charge attempt
        │
        ▼
  Declined?
  ├─ no  → confirmation
  └─ yes → retry once, then offer another method
```

```flow
unnamed: this bare flow fence proves the no-title fallback renders
        │
        ▼
  still a valid card with no title heading
```

### Frame: Cart
key: cart

Scene: User reviews the cart before paying.

```ascii
┌──────────────┐
│  Cart        │
│              │
│  1 item      │
│  [Checkout]  │
└──────────────┘
```

**Notes:**
- Entry point for the checkout flow

### Frame: Payment
key: pay

Scene: Card entry screen.

```ascii
┌──────────────┐
│  Payment     │
│              │
│  [ Card #  ] │
│  [ Pay ]     │
└──────────────┘
```

```flow Misplaced — inside a frame
this flow fence sits INSIDE a frame and cannot attach
it must emit a one-line stderr Warning and be skipped
the render must still complete and exit 0
```

**Notes:**
- Reached only when no default card is on file
