# Design System Unification — Design Spec

**Date:** 2026-07-26
**Status:** Approved, ready for implementation planning

## Problem

SignBridge has three competing visual languages instead of one:

1. **The app shell** (`Sidebar`, `Navbar`, `MainLayout`, `Button`, `Card`, `Input`, `Badge`, `Toggle`, `Skeleton`, `EmptyState`) — a well-built, token-driven system defined in `src/index.css`'s `@theme` block, with light ("Warm Alabaster/Teal"), dark ("Midnight Luminous"), and high-contrast themes. This system is accessible (focus management, reduce-motion, WCAG-aware confidence-color pairing) and is followed correctly by most of the authenticated app, especially `Workspace.tsx`.
2. **`Landing.tsx`** — imports its own standalone stylesheet (`src/styles/landing.css`) with its own `:root` color palette (cyan `#22d3ee` / emerald `#34d399` on near-black `#0a0a0f`), hardcoded to dark mode regardless of the user's theme preference, using emoji icons instead of `lucide-react`, and a plain-text logo instead of the app's custom mark.
3. **`Auth.tsx`** — a third hardcoded palette (`#101415` background, `#44e2cd` accent), a hand-rolled particle-canvas background duplicating `HeroCanvas.tsx`'s logic, and copy that reads as sci-fi filler ("deploy interactive nodes," "configure a reset loop") rather than the plain, human tone used elsewhere (e.g. `ConsentBanner.tsx`).

A subset of app pages (`Dashboard.tsx` most notably) use the shared components but override them with inline hardcoded opacity/color values (`bg-white/[0.02]`, `border-black/[0.06]`), bypassing the token system they're built on.

This matters more than typical visual inconsistency because SignBridge is an accessibility tool for the deaf/HoH community — legibility and predictability are the product, not decoration. Two concrete accessibility defects were found during the audit:

- `Auth.tsx:523` — "or" divider text at 20% opacity on near-black background. Computed WCAG contrast ratio ≈ **1.56:1** (requires 4.5:1). Confirmed fail.
- App-wide `--color-text-secondary` (`#6B7280`) on light-theme `--color-background` (`#F7F5F0`). Computed contrast ≈ **4.43:1**, just under the 4.5:1 AA threshold. Borderline — used for all hints/labels/timestamps app-wide.

A functional bug was also found: `Dashboard.tsx:40` hardcodes "Welcome back, Akshaya" instead of reading the signed-in user's name.

## Decision

**Keep the existing token system in `src/index.css` as the single source of truth for the entire application.** Do not introduce a new visual language (e.g. glassmorphism-as-primary, neo-brutalism, Material 3). The existing system is already a minimalist style in the vein of Linear/Vercel/Stripe — flat surfaces, one accent color per theme, restrained shadows, spring-based micro-interactions defined once in `src/lib/motion.ts`. The gap is enforcement, not aesthetics.

Concretely:
- `Landing.tsx` and `Auth.tsx` migrate off their standalone color systems (`landing.css`'s `:root` block, Auth's hardcoded hex values) onto the shared `--color-*` tokens. Their layouts, copy structure, and non-color animation logic (GSAP scroll reveals, particle canvas) can stay — only the palette and component reuse change.
- Both pages reuse `Navbar`'s existing brand logo mark instead of rendering plain "SignBridge" text.
- `Dashboard.tsx` (and any other page found doing the same) removes inline `bg-white/[…]` / `border-black/[…]` overrides on `Card`, letting the component's own token-driven styling apply.
- Auth's microcopy is rewritten to match the plain, direct tone used in `ConsentBanner.tsx` and the rest of the app.
- Landing's emoji icons (`📹 🤟 ⚡ 💾 🔒 🌐`) are replaced with `lucide-react` icons to match the rest of the app's icon system.

### Glassmorphism — scoped, not primary

Glass (`.glass` utility, already defined in `index.css`) stays reserved for panels floating over live content: the camera-feed confidence badge, the sticky Navbar, ConsentBanner. It is explicitly **not** the general card/page style — `Dashboard.tsx`'s `backdrop-blur-xl` on static content cards (nothing live behind them) is a misuse and should be removed in favor of the plain `Card` component. The existing `.high-contrast .glass` override (forces opaque) must be preserved for anything new.

### Animation consolidation

Framer Motion (via `src/lib/motion.ts`) remains the one system for UI micro-interactions app-wide — durations 150–250ms, transform+opacity only, respects `MotionConfig`/reduce-motion. Landing's GSAP/ScrollTrigger/Lenis scroll-reveal system can stay (it solves a different problem — scroll-driven reveals — that Framer Motion isn't set up for here), but:
- The two independently-implemented particle-canvas engines (`HeroCanvas.tsx` for Landing, the inline one in `Auth.tsx`) should be consolidated into one reusable component.
- Auth's particle canvas currently has no `prefers-reduced-motion` guard (unlike `HeroCanvas`, which checks it correctly) — the consolidated version must check it.

### Dead code removal

- `src/App.css` — unused Vite-template boilerplate, not imported anywhere.
- `src/components/landing/LottieIcon.tsx` and the `lottie-web` dependency — the component is never imported anywhere in the app.
- `@fontsource/geist-sans` — installed but not referenced by any `--font-*` token; either assign it a purpose or remove it.

## Out of scope

- No new design tokens, spacing scale, or shadow system — the existing ones in `index.css` are sufficient and well-designed.
- No full WCAG contrast re-audit in this pass — flagged as a follow-up (run axe-core/Lighthouse across all pages/themes) rather than hand-verifying every color pair.
- No changes to the 3D avatar (`Avatar3D.tsx`), sign-detection logic, or any non-visual functionality.

## Roadmap (priority order)

1. **Critical:** Fix `Dashboard.tsx:40` hardcoded user name (functional bug).
2. **Critical:** Fix `Auth.tsx:523` contrast failure (20%-opacity divider text).
3. **High:** Rewrite Auth microcopy to plain/human tone.
4. **High:** Migrate `Auth.tsx` onto shared color tokens; reuse `Navbar`'s logo mark.
5. **High:** Migrate `Landing.tsx`/`landing.css` onto shared color tokens (keep layout/animation, swap colors).
6. **Medium:** Replace Landing's emoji icons with `lucide-react`.
7. **Medium:** Remove `Dashboard.tsx`'s inline `Card` overrides.
8. **Medium:** Consolidate the two particle-canvas engines; add reduce-motion guard to Auth's version.
9. **Low:** Remove dead code (`App.css`, `LottieIcon.tsx` + `lottie-web` dependency, unused `geist-sans` font).
10. **Low:** Run a full automated contrast pass across all pages/themes.
11. **Nice-to-have:** Extend `SignStroke` as a recurring brand motif on Landing in place of generic gradient orbs.

## Full audit reference

The complete phase-by-phase audit (design system inconsistencies, UX/accessibility findings, animation audit, performance notes, industry benchmark scoring) that this spec is derived from was presented in the brainstorming conversation on 2026-07-26 and is summarized above; see conversation history for the full findings table with file:line references.
