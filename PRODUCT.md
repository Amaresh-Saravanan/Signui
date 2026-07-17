# Product

## Register

product

## Users

- **Priya — deaf primary user.** Fluent ASL signer using SignBridge at real-world counters (pharmacy, clinic, ticket window) so hearing staff can read her transcript. Visual-first; captions are permanent, not optional.
- **Marcus — hearing counterpart.** Reads the live transcript; relies on screen-reader announcements for new lines.
- **Aisha — interpreter / learner.** Practices fingerspelling, checks per-letter confidence, saves phrases.

The deaf/HoH user is the primary audience. Accessibility is the floor, not a feature.

## Product Purpose

Privacy-first, browser-native ASL fingerspelling → text translation. Camera frames never leave the device (MediaPipe WASM, on-device). Works offline after first load. Success = a trustworthy real-time transcript a stranger can read at a counter, with honest confidence signals.

## Brand Personality

Calm, trustworthy, precise. "Premium instrument, not gadget" — the tool disappears into the conversation it enables. Emotional goals: safety (my camera is private), confidence (I can rely on this in public), honesty (the AI tells me when it's guessing).

## Anti-references

- Cloud-AI translation apps that feel like surveillance (upload spinners, "processing on our servers").
- Sci-fi HUD overload: scan lines, radar sweeps, decorative telemetry that distracts from the hand and the transcript.
- Demo-ware: mocked capabilities presented as working; empty pages that look broken.
- Motion-heavy SaaS landing energy inside the app surface.

## Design Principles

1. **The transcript is the product.** Every screen decision defers to legibility of live text at arm's length.
2. **Privacy must be visible, not just true.** The UI shows on-device processing (status pills, no upload affordances) rather than claiming it in copy.
3. **Honest AI.** Confidence is surfaced per letter with color + non-color signals; unavailable languages/features are gated, never faked.
4. **Motion conveys state, never decoration.** Every animation has a reduce-motion equivalent (crossfade or instant) via MotionConfig + the CSS kill-switch.
5. **Glass only over live content.** Backdrop blur is reserved for surfaces that float above the camera feed or scrolling content; it is disabled entirely in high-contrast mode.

## Accessibility & Inclusion

WCAG 2.1 AA floor (PRD F-20…F-28). Deaf/HoH-first: aria-live transcript announcements, permanent visual state indicators, high-contrast theme (`.high-contrast`), OS + in-app reduce-motion (`.reduce-motion` + `MotionConfig reducedMotion`), keyboard operability for all custom widgets, 360px responsive Workspace.
