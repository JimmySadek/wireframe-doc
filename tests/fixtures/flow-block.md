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

Exercises the flow-level decision-flow cards: two NAMED cards in one flow
rendering as separate titled panels in document order, one card with a
#frame-{key} leaf link, and one bare UNTITLED `flow` block (the no-title
fallback). Branch glyphs and a down-arrow are preserved verbatim.

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

**Notes:**
- Reached only when no default card is on file
