# SignBridge — Production Readiness Requirements

> **Status:** Draft v1.0 · **Owner:** SignBridge team · **Scope:** entire product
> **Repo:** `Amaresh-Saravanan/Signui` · **Branch:** `claude/what-does-this-have-cvbi0s`

## 1. Executive Summary

SignBridge is a real-time sign-language translation web application. Today it is a
polished React SPA with **browser-native ASL alphabet detection** (MediaPipe hand
landmarks + a geometric classifier) wired into a live Workspace, with the remaining
product surface (auth, history, analytics, phrasebook, text-to-sign) running on
mocked, client-side data.

This document defines everything required to take SignBridge from its current
prototype state to a **production-ready product**. Requirements are grouped by
domain, individually numbered for traceability (FR-x, UX-x, TEST-x, ML-x, BE-x,
SEC-x, PERF-x, OPS-x, DOC-x), and prioritized:

| Priority | Meaning |
|---|---|
| **P0** | Launch blocker — must ship before any public release |
| **P1** | Required for a credible v1.0 within one release cycle |
| **P2** | Post-launch roadmap |

### Product pillars

1. **Privacy-first**: camera frames are processed on-device and never leave the browser by default.
2. **Accessibility-native**: the primary audience is deaf and hard-of-hearing users; WCAG 2.1 AA is a floor, not a target.
3. **Honest AI**: detection confidence is surfaced in the UI (already implemented); model limitations must always be disclosed.
4. **Offline-capable**: core translation must work without a network connection.

---

## 2. Table of Contents

1. [Executive Summary](#1-executive-summary)
2. Current State Audit
3. Frontend Requirements (FR)
4. UI/UX & Accessibility Requirements (UX)
5. Testing Requirements (TEST)
6. ML & Detection Pipeline Requirements (ML)
7. Backend & API Requirements (BE)
8. Security & Privacy Requirements (SEC)
9. Performance Requirements (PERF)
10. Deployment, CI/CD & Observability (OPS)
11. Compliance & Documentation (DOC)
12. Priorities, Launch Gate & Delivery Phases

---

## Current State Audit

SignBridge is a Vite + React 19 + TypeScript + Tailwind 4 single-page app with client-side routing (`react-router-dom` v7) defined entirely in `src/App.tsx`. There is **no backend, no API client, and no network layer of any kind** in the codebase — every "service" is either `localStorage`, a `setTimeout`, or a hand-authored placeholder. State is split across two React contexts: `ThemeContext` (light/dark, in-memory only, resets to `dark` on reload) and `AppDataContext` (`src/context/AppDataContext.tsx`), which is the single source of truth for the user profile, preferences, translation history, phrasebook, and derived stats, all persisted to one `localStorage` key (`signbridge.appData.v1`) via a synchronous `commit()` that calls `setState` + `localStorage.setItem` on every mutation, with no debouncing, quota handling, or cross-tab sync.

The one genuinely real subsystem is browser-native ASL fingerspelling detection: `src/hooks/useSignDetector.ts` loads MediaPipe's `HandLandmarker` (WASM, ~30MB combined in `public/wasm` + `public/models/hand_landmarker.task`) and runs it against the live `<video>` element every animation frame; `src/lib/aslClassifier.ts` is a hand-written geometric (non-ML) classifier that turns 21 landmarks into a letter + confidence score, documented candidly in `docs/SIGN_DETECTION.md` as a heuristic replacement for a never-trained scikit-learn model. Per that doc, only static fingerspelling letters are supported (J/Z, which require motion, are not), and the closed-fist family (M/N/T/E/S) is explicitly low-confidence. This is real, working computer vision — but it is the *only* real feature end-to-end.

Everything adjacent to it is mocked:

- **Auth (`src/pages/Auth.tsx`)** has no backend call, no password hashing, no session/token, no "Continue with Google" implementation (the button has no `onClick`). Any syntactically valid email logs the user in by deriving a display name from the email string and calling `setAuthUser`, which just writes to `AppDataContext`/localStorage. The "forgot password" flow sets `isSubmitted = true` locally; no email is ever sent. There is no logout endpoint either — `Profile.tsx`'s "Sign out" button simply `navigate('/')` without clearing `AppDataContext` or localStorage, so the user stays "logged in."
- **Mic button** in `Workspace.tsx` (`micOn` state, `Mic`/`MicOff` icons) toggles local UI state only — it never calls `getUserMedia({ audio: true })` and has no speech-to-text wiring. "Text → Sign" mode's `sendText()` posts a fake `"Text-to-sign tracking output queued…"` meta message after a `setTimeout(600)` and never actually drives an avatar.
- **Text-to-sign avatar**: `src/components/AvatarPlaceholder.tsx` renders a dashed-border box with a Sparkles icon and the literal label "Reserved for backend integration" — there is no avatar renderer, no animation data, no sign-synthesis of any kind.
- **Analytics (`src/pages/Analytics.tsx`) / Dashboard / Profile stats**: all numbers are derived client-side in `AppDataContext`'s `stats` `useMemo` purely from the local `history` array (counts, a naive `totalTranslations * 0.03` "hours translated" heuristic, streak calculated from `Date.now()` day-boundaries). "Avg. latency" is hardcoded to `—` with the caption "Available after backend integration" — an explicit admission there's no telemetry pipeline.
- **History (`src/pages/History.tsx`)** and **Phrasebook (`src/pages/Phrasebook.tsx`)** read/write the same local `AppDataContext` state; Phrasebook's "Play" and "Edit" icon buttons (lines 118–129) have no `onClick` at all — they are visually present but functionally dead.
- **Settings (`src/pages/Settings.tsx`)**: "Automated Phrase Backup" toggle (`autoExport`) is local `useState` never wired into `AppDataContext` or persisted; "Delete Account & Clear Cache" button has no `onClick` — clicking it does nothing. The "Reduce Dynamic Motion" toggle is persisted to `AppDataContext.preferences.reduceMotion` but **nothing in the codebase reads that flag** — no `prefers-reduced-motion` media query and no conditional disabling of the `framer-motion` animations exist anywhere (confirmed via full-repo search), so the setting is inert. Similarly, `MainLayout.tsx` toggles a `high-contrast` class on `<html>` from a `localStorage`-backed flag, but no CSS rule for `.high-contrast` exists in `src/index.css` or anywhere else — the toggle is a no-op.
- **Contact (`src/pages/Contact.tsx`)** form has no submit handler beyond a local 5-second success-message timer; no email/ticket is sent.
- **Onboarding/Permissions/Preferences** wizard: `Permissions.tsx`'s "Allow" buttons just flip local booleans (`setGranted`) — they never call `navigator.mediaDevices.getUserMedia` or `navigator.permissions.query`, so a user can "grant" camera/mic access without the browser's permission prompt ever firing, and the real prompt only appears later in `Workspace.tsx`.
- **Routing has no guards**: any route (`/dashboard`, `/workspace`, `/settings`, etc.) is reachable directly by URL with no auth check, so an unauthenticated user can skip `/auth` and `/onboarding` entirely; `App.tsx` has no `<ProtectedRoute>` wrapper or redirect logic.

### Page functional-status table

| Route | Page | Status |
|---|---|---|
| `/` | Landing | Real UI/marketing; all CTAs navigate correctly; nav anchor links (`#features` etc.) work in-page |
| `/auth` | Auth | Fake login/signup/forgot-password; no backend; Google OAuth button is dead |
| `/onboarding` | Onboarding | Real local wizard state; dialect selection not persisted until `/preferences` |
| `/permissions` | Permissions | Fake — booleans only, no real `getUserMedia`/Permissions API call |
| `/preferences` | Preferences | Real — writes `role` to `AppDataContext` |
| `/dashboard` | Dashboard | Real local data (history/phrasebook counts), hardcoded first-name "Akshaya" in the greeting header (not from `state.user`) |
| `/workspace` | Workspace | **Real** ASL sign-to-text detection (MediaPipe + geometric classifier); text-to-sign is faked; mic is inert; error-report dialog just increments a local counter |
| `/history` | History | Real local CRUD (search/filter/save/delete) against localStorage-backed history |
| `/phrasebook` | Phrasebook | Real add/remove; Play and Edit buttons are visually present but non-functional |
| `/analytics` | Analytics | Real charts computed from local history; "Avg. latency" explicitly stubbed as unavailable |
| `/settings` | Settings | Partially real (profile/name/email/language/notifications persist); reduceMotion and highContrast are persisted but never applied; autoExport and Delete Account are dead |
| `/about` | About | Static marketing copy, no interactivity needed |
| `/profile` | Profile | Real stats display; achievements are computed client-side; "Sign out" doesn't clear session state |
| `/contact` | Contact | Fake — form has no submission target, local timer only |

## Frontend Requirements

**FR-1: Real authentication backend.** Replace `Auth.tsx`'s client-only `setAuthUser(fullName, email)` (which accepts any string containing `@`) with real signup/login/password-reset endpoints, password hashing server-side, and a session token (httpOnly cookie or short-lived JWT + refresh) stored outside `localStorage`. Acceptance: invalid credentials return a distinguishable error, and the "Continue with Google" button either performs a real OAuth redirect or is removed.

**FR-2: Route guards / protected routing.** Add an `AuthGuard`/`RequireAuth` wrapper in `App.tsx` around the `/dashboard`, `/workspace`, `/history`, `/phrasebook`, `/analytics`, `/settings`, `/profile` routes that redirects unauthenticated users to `/auth`, and an onboarding-completion guard that redirects incomplete users from `/dashboard` back to `/onboarding` or `/permissions`. Acceptance: navigating directly to `/dashboard` with no session redirects to `/auth`; the redirect preserves the original destination via `?redirect=` for post-login return.

**FR-3: Migrate `AppDataContext` off ad-hoc localStorage to a versioned, validated persistence layer.** `commit()` in `src/context/AppDataContext.tsx` writes the entire state blob synchronously on every keystroke-level mutation with no schema validation beyond the informal `safeLoadState` merge and no migration path if `AppDataState` shape changes (`STORAGE_KEY = 'signbridge.appData.v1'` has no `v2` handling). Acceptance: state is validated with a runtime schema (e.g. zod) on load, corrupted/legacy data triggers a migration or safe reset instead of silently dropping fields, and writes are debounced to avoid main-thread jank during rapid history/phrasebook updates.

**FR-4: Wire real backend sync for history/phrasebook/analytics.** Today all of `History.tsx`, `Phrasebook.tsx`, and `Analytics.tsx` read exclusively from local `AppDataContext.state`/`stats`; "Avg. latency" is hardcoded to `—`. Acceptance: history/phrasebook CRUD calls a real API with optimistic UI updates and rollback on failure, and Analytics' latency/other backend-only metrics are fetched rather than displayed as permanently unavailable.

**FR-5: Implement the mic / speech-to-sign path or remove it.** The mic toggle in `Workspace.tsx` (`micOn`) and the "Speech-to-Sign" marketing claim on the Landing page currently do nothing beyond flipping a boolean — no `getUserMedia({audio:true})`, no speech-recognition API, no output. Acceptance: either Web Speech API (or a real STT service) is wired end-to-end from mic toggle to transcript, or the mic control and speech-to-sign marketing copy are removed until implemented.

**FR-6: Implement or replace the text-to-sign avatar.** `AvatarPlaceholder.tsx` is a static dashed box labeled "Reserved for backend integration"; `Workspace.tsx`'s text-to-sign mode only appends a fake `"…tracking output queued…"` message after a `setTimeout`. Acceptance: a real avatar renderer (sprite sequence, 3D rig, or video-clip lookup per phrase) replaces the placeholder, or the text-to-sign tab is hidden/labeled "Coming soon" rather than presented as functional.

**FR-7: Code splitting — the production bundle is a single 660KB JS chunk.** `dist/assets/index-BGTqJeCa.js` is 660,416 bytes (plus a 99KB CSS file) because `App.tsx` statically imports all 14 pages and `vite.config.ts` has no `build.rollupOptions.manualChunks`; MediaPipe's WASM/model assets (~30MB in `public/wasm` + `public/models`) are also eagerly reachable from the first page load path. Acceptance: convert page imports to `React.lazy()` with `<Suspense>` boundaries per route in `App.tsx`, split MediaPipe/`useSignDetector` loading so it only downloads when `/workspace` mounts, and reduce the initial JS payload below a defined budget (e.g. 200KB gzipped for the landing/auth path) verified in CI.

**FR-8: Form validation.** `Auth.tsx` only checks `email.includes('@')`; `Contact.tsx`'s inputs use HTML `required` but no client-side format/length validation or server-side revalidation; `Settings.tsx`'s email/name fields have no validation before `updateUserProfile`. Acceptance: introduce a shared validation layer (e.g. zod + react-hook-form) with field-level error messages, applied consistently to Auth, Contact, Settings, and Onboarding/Preferences forms.

**FR-9: Error, loading, and empty states beyond the two already present.** History (`History.tsx`) and Phrasebook (`Phrasebook.tsx`) have decent empty states, but there is no loading skeleton anywhere (all data is synchronous from localStorage today, so this gap will surface the moment FR-4 introduces network calls), and no global error boundary — a thrown error in any page (e.g. `useAppData()` outside its provider, or a MediaPipe WASM load failure surfaced only as `detectorError` text in `Workspace.tsx`) has no `ErrorBoundary` fallback UI at the `App.tsx` level. Acceptance: add a top-level React error boundary, add loading skeletons for the (future) network-backed History/Analytics/Phrasebook fetches, and standardize a toast/inline-error pattern for mutation failures.

**FR-10: Session/logout correctness.** `Profile.tsx`'s "Sign out" button (`onClick={() => navigate('/')}`) does not clear `AppDataContext` state or `localStorage`, so the user profile, history, and phrasebook persist after "signing out," and re-visiting `/dashboard` still shows them as logged in. Acceptance: sign-out clears the session token and either clears or securely scopes local state per authenticated user.

**FR-11: Offline / PWA baseline.** There is no `manifest.json`, no service worker, and no offline fallback despite the product's core value proposition being on-device/private processing that should work without connectivity. Acceptance: add a web app manifest and a service worker (e.g. via `vite-plugin-pwa`) that caches the app shell and the MediaPipe WASM/model assets so `/workspace` sign detection works fully offline after first load, with an explicit "offline mode" indicator in the UI.

## UI/UX & Accessibility Requirements

**UX-1: WCAG 2.1 AA color contrast audit.** Several text treatments use very low-opacity white/black (`text-[#c6c6cd]/30`, `text-white/[0.06]` borders, `opacity-[0.015]` overlays) throughout `Auth.tsx` and `Landing.tsx` that likely fail the 4.5:1 (text) / 3:1 (UI component) contrast minimums, especially in the `Auth.tsx` dark canvas theme. Acceptance: run an automated contrast audit (axe-core or Lighthouse) against every route in both themes and fix all AA-level violations, with a CI gate that fails on new violations.

**UX-2: Fix the dead high-contrast mode.** `MainLayout.tsx` persists and toggles a `high-contrast` class on `document.documentElement` (`isHighContrast` state, `localStorage` key `signbridge.accessibility.highContrast`) but no CSS in `src/index.css` (or anywhere) defines `.high-contrast` styles, so the feature currently does nothing when enabled from wherever it's exposed. Acceptance: define actual high-contrast token overrides (colors, borders, focus rings) scoped under `.high-contrast`, and expose the toggle in `Settings.tsx` (it is not currently surfaced there at all).

**UX-3: Keyboard navigation audit for interactive controls.** Custom controls like the language dropdown in `Workspace.tsx` (`langDropdownOpen`, closed only via a `mousedown` document listener), the onboarding dialect/role selector buttons, and the report-error modal (`Workspace.tsx` lines 562–606) need explicit keyboard support (Escape to close, focus trap inside modal, arrow-key support in the dropdown listbox). Acceptance: every custom widget is operable with Tab/Shift+Tab/Enter/Space/Escape/Arrow keys without a mouse, verified with a keyboard-only manual test pass per release.

**UX-4: Live-region announcements for the real-time transcript and detection state.** The Workspace transcript panel (`transcriptRef` div, `Workspace.tsx` ~line 490) and the "Live Studio / Loading model… / Model error" status badge and detected-letter overlay update purely visually with no `aria-live` region anywhere in the codebase (confirmed zero `aria-live` usages repo-wide) — meaning screen-reader users, a core audience for a deaf/HoH-focused product's *hearing counterpart* mode, get no announcement of new translations. Acceptance: wrap the transcript's new-entry insertion point and the detection status badge in an `aria-live="polite"` (or `assertive` for errors) region so assistive tech announces new sign-to-text output and camera/model errors.

**UX-5: Visual-first design honesty for the primary audience.** Given the app targets a deaf/HoH audience, camera error states (`camError` in `Workspace.tsx`) and the model-loading state currently communicate via text only ("Camera Unavailable", "Loading model…"); captions/subtitles for any future audio (mic/speech-to-sign) must be permanently visible, not toggleable, and sign-to-text confidence indicators (the ember/emerald bounding box + badge) should also carry a non-color-only signal (already partially done via the `ShieldAlert` icon in low-confidence states — extend this pattern everywhere confidence-color is used, e.g. `History.tsx`'s green "accuracy" badges use color alone).

**UX-6: Respect `prefers-reduced-motion` and make the Settings toggle functional.** `Settings.tsx` has a "Reduce Dynamic Motion" toggle wired to `AppDataContext.preferences.reduceMotion`, but nothing consumes that flag, and there is no `@media (prefers-reduced-motion: reduce)` CSS anywhere despite heavy use of `framer-motion` (page transitions, staggered cards, canvas particle/shader backgrounds in `Auth.tsx`/`Landing.tsx`). Acceptance: gate all `framer-motion` `initial`/`animate`/`transition` props and the two WebGL/canvas particle backgrounds behind both the OS-level media query and the app preference, defaulting animations off when either is set.

**UX-7: Focus management on route change and modal open/close.** `BrowserRouter`/`Routes` in `App.tsx` does not reset focus to the new page's heading on navigation, and the report-error modal and language dropdown in `Workspace.tsx` don't move focus into themselves on open or restore it to the trigger on close. Acceptance: focus moves to an `h1`/landmark on route change, and every modal/dropdown implements a focus trap with focus restoration on close (a shared `useFocusTrap` hook is a reasonable implementation target).

**UX-8: Responsive/mobile pass for the Workspace studio.** `Workspace.tsx`'s camera+transcript layout (`flex-1 flex flex-col lg:flex-row`) and the fixed floating toolbar (`max-w-sm mx-auto`) need verification on small viewports where the video, overlay canvas, and word-builder strip stack — plus `MobileNav` (`src/components/Sidebar.tsx`) only surfaces the first 4 nav items, silently hiding Analytics/Settings/Profile/About on mobile. Acceptance: define a documented mobile IA (e.g. an overflow "More" tab in `MobileNav`) and verify the Workspace camera view remains usable (no cropped controls) at 360px width.

**UX-9: Theme parity check across light/dark.** Several components hardcode dark-only literals (`Auth.tsx`'s entire background is `bg-[#101415]` with no light variant at all — it's a fixed dark screen regardless of the app-wide theme toggle in `Navbar.tsx`), creating an inconsistent experience where `/auth` ignores the user's theme choice while `/dashboard` honors it via `dark:` Tailwind variants. Acceptance: either make `Auth.tsx` and `Landing.tsx` theme-aware or make an explicit, documented product decision that marketing/auth pages are permanently dark, and audit remaining pages for any other hardcoded (non-`dark:`-variant) color literals.

## Testing Requirements

**TEST-1: Formalize `aslClassifier.ts` unit tests with Vitest.** There is currently no test runner in `package.json` (no `vitest`, `@testing-library/*`, or `playwright` in `dependencies`/`devDependencies`, and no `*.test.*`/`*.spec.*` files exist in the repo) despite `src/lib/aslClassifier.ts` being pure, synchronous, and highly testable (it's a deterministic function from `Landmark[]` to `{letter, confidence}`). Acceptance: add `vitest` + `@vitest/coverage-v8`, write a `src/lib/aslClassifier.test.ts` with synthetic-landmark fixtures covering each documented letter class (B, W, F, L/Y/I, R/H/P/K/V/U, G/Q/D, X, C, O, and the low-confidence closed-fist family T/A/E/S/M/N) plus edge cases (`lm.length < 21`, all-zero landmarks), and wire `npm test` into `package.json`.

**TEST-2: Unit-test `useAppData`'s derived stats and mutation logic.** `calculateStreak`, the `weeklyCounts`/`languageDistribution`/`avgConfidence` derivations, and the `toggleSaved`/`removeHistoryEntry` phrasebook-sync side effects in `src/context/AppDataContext.tsx` have nontrivial date-boundary and cross-entity-sync logic with zero test coverage today. Acceptance: unit tests (Vitest + `@testing-library/react-hooks` or a custom provider wrapper) cover streak calculation across day boundaries/DST, and verify the Saved-phrasebook-category stays consistent after save/unsave/delete sequences.

**TEST-3: Component tests for form and state-driven pages.** `Auth.tsx` (mode switching, validation error display), `Settings.tsx` (save round-trip into context), and `Phrasebook.tsx` (add/remove/search filtering) have no component-level tests. Acceptance: add `@testing-library/react` component tests for these three pages asserting on rendered output and `AppDataContext` mutations, run in CI on every PR.

**TEST-4: Playwright E2E with a fake camera for the Workspace sign-detection flow.** The one real, differentiated feature (`Workspace.tsx` + `useSignDetector.ts` + `aslClassifier.ts`) has zero end-to-end coverage; Playwright supports `--use-fake-device-for-media-stream` plus `--use-file-for-fake-video-capture=<path>.y4m` to feed a recorded hand-sign video into `getUserMedia`. Acceptance: add a Playwright config launching Chromium with fake-camera flags, a fixture video showing a stable known letter (e.g. "B" — open palm), and an E2E test asserting the detected-letter badge and transcript eventually show the expected output within a timeout, plus a second test asserting the camera-denied error path renders `camError` UI correctly.

**TEST-5: E2E coverage for the full onboarding-to-workspace journey and route guards.** No E2E test currently exercises `/` → `/auth` → `/onboarding` → `/permissions` → `/preferences` → `/dashboard` → `/workspace`, nor whether unauthenticated direct navigation to `/dashboard` is blocked (currently it is not — see FR-2). Acceptance: a Playwright journey test walks the full flow and asserts state lands correctly in `AppDataContext`/localStorage at each step, and a second test asserts the guard added in FR-2 actually redirects.

**TEST-6: Visual regression testing for the theme system and Workspace overlay.** Given the number of hand-tuned low-opacity color literals across `Auth.tsx`, `Landing.tsx`, and the Workspace confidence-color overlay (`drawOverlay` in `Workspace.tsx`, emerald vs. ember canvas strokes), visual drift is easy to introduce silently. Acceptance: integrate Playwright's built-in screenshot assertions (or Chromatic/Percy) for representative pages in both light and dark theme, gated in CI with a defined pixel-diff threshold.

**TEST-7: Continuous integration pipeline.** There is no `.github/workflows` directory or any other CI configuration in the repo today — `tsc -b` (the `build` script in `package.json`) and `oxlint` (the `lint` script) currently only run locally/manually. Acceptance: add a GitHub Actions workflow that runs `npm run lint`, `tsc -b --noEmit`, the Vitest unit/component suite (TEST-1–3), and the Playwright E2E suite (TEST-4–5) on every PR, blocking merge on failure, plus a separate bundle-size check enforcing the budget defined in FR-7.

## ML & Detection Pipeline Requirements

**ML-1 — Replace the geometric heuristic with a trained gesture recognizer (primary route). [P0]**
The current classifier in `src/lib/aslClassifier.ts` is a hand-tuned geometric
heuristic (per-finger curl ratios, hand orientation, thumb position) with
hardcoded confidences, not a trained model. Ship a MediaPipe Model Maker gesture
recognizer exported as a `.task` bundle as the production primary, trained on a
labeled ASL fingerspelling dataset. Acceptance: `.task` artifact loads via the
same `FilesetResolver`/task pattern already used in `useSignDetector.ts`;
top-1 accuracy on a held-out test set beats the heuristic baseline by ≥15
absolute points measured on the same eval set.

**ML-2 — ONNX landmark-classifier as the documented alternative route. [P1]**
Support the alternative already sketched in `docs/SIGN_DETECTION.md`: a
classifier trained on the 42-feature landmark vector (`[x0,y0,…,x20,y20]`),
exported to ONNX and run with `onnxruntime-web`. Acceptance: an `.onnx` model in
`public/models/` is loaded in `useSignDetector.ts` and swapped in for the
`classifyASL(lm)` call behind a config flag, with no change to the landmark
feature ordering; inference parity verified against the `.task` route within
±3 accuracy points.

**ML-3 — Per-class accuracy targets with explicit floors for the weak family. [P0]**
`docs/SIGN_DETECTION.md` and `aslClassifier.ts` flag E, S, T, M, N, P, Q as
low-confidence and A/E/S as ambiguous. The production model must publish a
per-letter confusion matrix. Acceptance: ≥95% top-1 for the letters currently
marked "Reliable" (A, B, C, D, F, G, H, I, K, L, O, R, U, V, W, X, Y); a hard
floor of ≥85% top-1 for the currently-weak family (E, S, T, M, N, P, Q); no
single letter below 80% at launch.

**ML-4 — Temporal/sequence model for motion letters J and Z. [P1]**
J and Z are motion gestures and are explicitly unrecognizable from the single
frame that `classifyASL` sees; `useSignDetector.ts` only does a majority-vote
smoothing window (`smoothingWindow = 6`), which cannot capture trajectory. Add a
short temporal model (e.g. sliding-window sequence classifier over N frames of
landmarks) covering J and Z. Acceptance: J and Z recognized at ≥85% top-1 in a
motion test set; latency added by the sequence buffer ≤120 ms end-to-end.

**ML-5 — Multi-language: only ASL is real; gate ISL/BSL behind capability flags. [P0]**
`src/constants/languages.ts` advertises ISL, ASL, and BSL (each with a fake
`engineVersion` like `v2.1`/`v2.4`), the Workspace language dropdown lets users
pick all three, and `AppDataContext` tracks a per-entry `languageCode` and a
`languageDistribution` stat — but only ASL has any detection logic. Non-ASL
selections must be disabled or clearly labeled "coming soon" until a real model
exists, and the classifier path must not silently apply ASL logic to an ISL/BSL
selection. Acceptance: selecting a language with no shipped model surfaces an
explicit unavailable state; no translation is recorded to history under a
language code that has no model; the fake `engineVersion` strings are removed or
replaced with real model versions.

**ML-6 — Text-to-sign direction (avatar rendering). [P2]**
`TranslationMode` includes `'text-to-sign'` and the Workspace renders an
`AvatarPlaceholder` while `sendText()` only echoes a stubbed
"Text-to-sign tracking output queued…" meta message — there is no real avatar.
Define an avatar rendering pipeline (glossing/text→sign-sequence mapping plus a
signing avatar or clip library). Acceptance: a defined finger-spelling avatar
renders arbitrary A–Z input at ≥24 fps; a phased plan documents progression from
fingerspelling to lexical signs.

**ML-7 — On-device inference budget. [P0]**
The detection loop in `useSignDetector.ts` runs on `requestAnimationFrame` and
calls `detectForVideo` on every new video frame with no explicit throttle.
Define and enforce a budget: sustained detection ≥15 fps on a mid-tier laptop
and ≥10 fps on a mid-tier mobile; per-frame landmark+classify latency ≤66 ms;
steady-state JS heap growth ≈0 over a 10-minute session (no leak). Acceptance:
budgets verified via automated perf harness on reference devices; the loop
degrades gracefully (frame skipping) rather than blocking the main thread when
over budget.

## Backend & API Requirements

**BE-1 — Managed authentication replacing the mocked auth. [P0]**
Auth is entirely faked: `setAuthUser(fullName, email)` in `AppDataContext.tsx`
just splits a name string into local state; there is no credential, session, or
token. Introduce real authentication (managed auth provider or equivalent) with
secure session tokens. Acceptance: unauthenticated users cannot access synced
data; tokens are httpOnly/secure; the mocked `setAuthUser` local-only flow is
replaced end-to-end.

**BE-2 — User profile persistence service. [P1]**
`UserProfile` (name, email, role, `primaryLanguage`, plan) currently lives only
in `localStorage`. Provide a profile API so a signed-in user's profile follows
them across devices. Acceptance: profile reads/writes go through an authenticated
API; `localStorage` becomes a cache, not the source of truth for signed-in
users.

**BE-3 — History and phrasebook sync. [P1]**
`history` and `phrasebook` (including the `Saved` category and all `stats`
derivations) are computed client-side from `localStorage`. Add an authenticated
sync service so translations and saved phrases survive device loss. Acceptance:
create/update/delete of history and phrasebook entries round-trips through the
API; conflict resolution defined for concurrent devices; anonymous users retain
full local-only functionality.

**BE-4 — Error-report ingestion replacing the mocked counter. [P1]**
The Workspace "Report error" modal calls `incrementReports()`, which only bumps
an in-memory `reportsCount`; the user's report text (`reportText`) is discarded
entirely. Add an endpoint that persists report text plus minimal context (letter,
confidence, language, app version). Acceptance: submitted reports are stored
server-side and queryable; explicitly **no** video frames or raw landmarks are
attached unless the user opts in per-report.

**BE-5 — Video frames must never leave the device by default (privacy-first). [P0]**
Detection today is 100% local — `getUserMedia` frames go only to the in-browser
MediaPipe runtime and are never uploaded. This property is a product guarantee,
not an accident. Acceptance: no server API accepts raw video/frames in the
default architecture; any future server-side inference is strictly opt-in,
per-session, and off by default; a network audit confirms zero frame/landmark
egress during normal use.

**BE-6 — Minimal, vendor-neutral backend architecture. [P1]**
Keep the server surface small: a lightweight stateless API + managed auth + a
relational store (e.g. Postgres) for profiles, history, phrasebook, and reports.
Inference and all camera handling stay client-side (see BE-5). Acceptance: an
architecture doc enumerates exactly which data crosses the network and why;
the static SPA remains fully functional (local-only) if the API is unreachable.

## Security & Privacy Requirements

**SEC-1 — Explicit camera-permission UX and lifecycle. [P0]**
`Workspace.tsx` calls `getUserMedia` on mount whenever `detecting` is true and
only shows a recovery card after the browser denies; there is no pre-prompt
rationale. Add an explicit permission-rationale step (a `/permissions` route
already exists) and guaranteed track teardown. Acceptance: users see why the
camera is needed before the OS prompt; all `MediaStreamTrack`s are stopped on
camera-off, pause, and unmount (the existing `stream.getTracks().forEach(t =>
t.stop())` cleanup must cover every exit path); a visible in-use indicator is
present whenever the camera is live.

**SEC-2 — No frame exfiltration, enforced. [P0]**
Complements BE-5 at the client boundary. Acceptance: CSP `connect-src` is
restricted to the known API origin only; a build-time/CI check fails if any code
path posts image, video, or landmark data to the network; documented and tested.

**SEC-3 — GDPR / consent and data-subject rights. [P0]**
With real accounts (BE-1..BE-4) the app processes personal data (email, name,
translation history). Provide consent capture, a privacy policy, and
export/delete flows. Acceptance: users can export and permanently delete all
server-side data; consent is recorded with timestamp and version; `clearHistory`
and account deletion also purge server copies.

**SEC-4 — Local-first storage with encrypted sync. [P1]**
Current `localStorage` persistence is plaintext under
`signbridge.appData.v1`. Keep local-first behavior but encrypt data in transit
(TLS) and at rest server-side, and consider client-side encryption for synced
history. Acceptance: all sync traffic is TLS 1.2+; server data encrypted at rest;
sensitive fields never logged.

**SEC-5 — Content Security Policy and self-hosted fonts. [P0]**
`index.html` loads fonts from two third-party CDNs (`fonts.googleapis.com` /
`fonts.gstatic.com` and `api.fontshare.com`), which leaks user IP/UA to those
hosts and blocks a strict CSP. Self-host all fonts and ship a strict CSP.
Acceptance: no external `<link>` font requests remain; CSP has no `unsafe-inline`
for scripts, `default-src 'self'`, `connect-src` limited to the API, and `wasm`
execution allowed for the local MediaPipe runtime.

**SEC-6 — Dependency audit and supply-chain gate. [P1]**
Runtime deps include `@mediapipe/tasks-vision`, `framer-motion`,
`react-router-dom`, `lucide-react` (package.json). Add automated vulnerability
scanning and lockfile integrity to CI. Acceptance: CI fails on new high/critical
advisories; dependencies pinned via lockfile; a documented update cadence.

**SEC-7 — Secrets handling. [P1]**
No secrets exist client-side today (good). Once BE-1 lands, no API keys or
provider secrets may be embedded in the SPA bundle. Acceptance: only public,
non-sensitive config ships to the client; all secrets live server-side/in a
secrets manager; a CI secret-scan blocks committed credentials.

## Performance Requirements

**PERF-1 — Initial JS budget and code-splitting. [P0]**
`src/App.tsx` statically imports every page including `Workspace` (line 8), which
transitively pulls `@mediapipe/tasks-vision` and `framer-motion` into the main
bundle (~660 KB today) even for users who never open the Workspace. Route-split
all pages with `React.lazy` + `Suspense`. Acceptance: initial route JS
(gzipped) ≤200 KB; MediaPipe code is not present in the entry chunk.

**PERF-2 — Lazy-load WASM and model only on the Workspace route. [P0]**
The ~7.8 MB `hand_landmarker.task` and ~21 MB (uncompressed) WASM runtime under
`public/wasm` must load only when detection is actually needed, not on app boot.
Acceptance: no model/WASM fetch occurs on Landing/Dashboard/etc.; the fetch is
triggered on Workspace entry (matching the existing model-load `useEffect` in
`useSignDetector.ts`); SIMD/no-SIMD WASM variant is selected per capability so
only one is downloaded.

**PERF-3 — Core Web Vitals targets. [P1]**
Acceptance (75th percentile, mid-tier mobile): LCP ≤2.5 s, CLS ≤0.1, INP
≤200 ms on the Landing and Dashboard routes; the Workspace's model download is
excluded from LCP via a distinct loading state (the existing "Loading model…"
badge in `Workspace.tsx` is the anchor).

**PERF-4 — Detection-loop CPU and battery budget. [P1]**
The `requestAnimationFrame` loop in `useSignDetector.ts` runs unthrottled at
display refresh. Cap detection to a configurable target (e.g. 15–20 fps) to bound
CPU/GPU and battery drain, and pause fully when the tab is hidden or translation
is paused (`live` is already a control in Workspace). Acceptance: sustained CPU
attributable to detection ≤35% of one core on a reference laptop; loop is fully
suspended on `visibilitychange` hidden and when `live` is off.

**PERF-5 — Low-end device support and graceful degradation. [P2]**
The no-SIMD WASM fallback exists in `public/wasm`, implying low-end targets are
in scope. Acceptance: on a device without WASM SIMD the app still detects at
≥8 fps or presents a clear reduced-performance notice; memory footprint stays
within a documented ceiling; the UI never hard-crashes on model-load failure
(the existing `detectorError` path must render a usable error state).

## Deployment, CI/CD & Observability Requirements

**OPS-1 — Static hosting on a CDN. [P0]**
The build (`tsc -b && vite build`) produces a static SPA; host it on a CDN with
SPA fallback routing (all app routes are client-side under `BrowserRouter`).
Acceptance: all routes deep-link correctly (200 on refresh of `/workspace`);
large immutable assets (WASM, `.task`) served with long-lived cache headers and
content hashing; HTTPS enforced.

**OPS-2 — CI pipeline stages. [P0]**
Establish a pipeline running: lint (`oxlint`), typecheck (`tsc -b`), unit tests,
build, and e2e. Note there is **no test tooling in package.json today** — adding
a test runner and e2e framework is part of this requirement. Acceptance: every
PR must pass lint + typecheck + tests + build before merge; e2e smoke covers the
camera→detection→transcript happy path with a mocked media stream.

**OPS-3 — Preview deploys per PR. [P1]**
Acceptance: each PR gets an isolated, shareable preview URL built from that
branch; previews are torn down on merge/close.

**OPS-4 — Versioned model artifacts. [P1]**
`hand_landmarker.task` (and any future `.task`/`.onnx`) are large binaries
currently living unversioned in `public/models`. Track model artifacts with
explicit versions decoupled from app releases. Acceptance: each model has a
version/hash surfaced in-app (replacing the fake `engineVersion` strings in
`languages.ts`); models are cache-busted on update; a model change is
independently rollback-able from app code.

**OPS-5 — Error tracking and privacy-safe analytics. [P1]**
No telemetry exists today. Add error tracking and product analytics that never
capture frames, landmarks, or transcript text by default. Acceptance: crashes and
model-load failures (the `detectorError`/`camError` paths) are reported with no
PII; analytics events are aggregate/opt-in and honor the consent from SEC-3;
the existing `localOnly` preference in `AppPreferences` disables all telemetry.

**OPS-6 — Rollback. [P0]**
Acceptance: any release (app bundle and, separately, model artifact per OPS-4)
can be rolled back to the previous known-good version within minutes without a
rebuild; rollbacks are logged and alertable.

## Compliance & Documentation Requirements

**DOC-1 — WCAG 2.1 AA conformance statement. [P0]**
The app already has accessibility affordances (`reduceMotion`, `highContrast` in
`AppPreferences`; `aria-label`s throughout `Workspace.tsx`) but no audited
conformance. Publish and back a WCAG 2.1 AA statement. Acceptance: automated
(axe) plus manual keyboard/screen-reader audit passes at AA; `reduceMotion`
actually suppresses the Framer Motion animations; color-contrast including the
ember "uncertain" flag meets AA.

**DOC-2 — User-facing model-limitation disclosure. [P0]**
`docs/SIGN_DETECTION.md` documents the weak letters (E, S, T, M, N, P, Q) and the
unsupported motion letters (J, Z) for developers only. Users need an equivalent
in-product disclosure. Acceptance: the Workspace or an about/help surface states,
in plain language, which letters are lower-accuracy and that J/Z are not yet
supported; the existing per-letter "Uncertain" confidence flag remains and is
explained to users.

**DOC-3 — Licensing and attribution. [P0]**
MediaPipe assets (`@mediapipe/tasks-vision`, the WASM runtime, and
`hand_landmarker.task`) are Apache-2.0 and require attribution; the geometric
classifier is adapted from a referenced third-party Python project (cited in
`docs/SIGN_DETECTION.md`). Ship a third-party licenses/attribution page.
Acceptance: an in-app "Open source licenses" view lists MediaPipe (Apache-2.0)
and all bundled dependency licenses; the upstream sign-language reference project
is credited; license files are included in the distribution.

**DOC-4 — Accessibility & privacy documentation for users. [P1]**
Acceptance: a public page documents the local-first / no-frame-egress guarantee
(BE-5/SEC-2), data retention, and how to export/delete data (SEC-3), written for
end users rather than engineers.

---

## Priority Assignments — Frontend, UX & Testing

The FR/UX/TEST requirements above map to the same P0/P1/P2 scheme:

| Priority | Requirements |
|---|---|
| **P0** | FR-1, FR-2, FR-7, FR-10 · UX-1, UX-4, UX-6 · TEST-1, TEST-7 |
| **P1** | FR-3, FR-5, FR-8, FR-9, FR-11 · UX-2, UX-3, UX-5, UX-7, UX-9 · TEST-2, TEST-3, TEST-4, TEST-6 |
| **P2** | FR-4, FR-6 · UX-8 · TEST-5 |

Rationale: anything that misrepresents product state to a user (fake auth with no
guards, a sign-out that doesn't sign out, dead accessibility toggles for a
deaf/HoH audience) or blocks safe iteration (no CI, no tests on the one real
feature) is a launch blocker. Server-backed sync (FR-4) and the signing avatar
(FR-6) are roadmap items — the product can launch honestly as a local-first,
sign-to-text tool.

## Cross-Cutting Dependencies

- **FR-7 ↔ PERF-1/PERF-2** — one workstream: route-split `src/App.tsx`, lazy-load MediaPipe on `/workspace` only.
- **TEST-7 ↔ OPS-2** — one CI pipeline satisfies both; include the bundle-size budget gate.
- **UX-6 ↔ DOC-1** — the WCAG statement cannot ship while `reduceMotion` is inert.
- **FR-1/FR-2 ↔ BE-1** — route guards are meaningless until real sessions exist; land together.
- **ML-5 ↔ FR-modal surfaces** — gating ISL/BSL affects the Workspace dropdown, Onboarding dialect step, and Settings language picker; change all three in one pass.

## Launch Gate — P0 Checklist

A public release is blocked until every box below is checked:

- [ ] Trained gesture model shipped, beats heuristic by ≥15 pts (ML-1), per-class floors met (ML-3)
- [ ] ISL/BSL gated as "coming soon"; fake engine versions removed (ML-5)
- [ ] Inference budget verified: ≥15 fps laptop / ≥10 fps mobile (ML-7)
- [ ] Real auth + route guards; sign-out actually clears session (BE-1, FR-1, FR-2, FR-10)
- [ ] No-frame-egress guarantee enforced by CSP + CI check (BE-5, SEC-2)
- [ ] Camera permission rationale + guaranteed track teardown (SEC-1)
- [ ] GDPR consent, export, delete (SEC-3)
- [ ] Fonts self-hosted; strict CSP (SEC-5)
- [ ] Entry chunk ≤200 KB gzipped; MediaPipe lazy-loaded (FR-7, PERF-1, PERF-2)
- [ ] CDN hosting with SPA fallback + rollback runbook (OPS-1, OPS-6)
- [ ] CI: lint, typecheck, unit, build, e2e on every PR (TEST-7, OPS-2)
- [ ] Classifier unit-test suite in Vitest (TEST-1)
- [ ] WCAG 2.1 AA audit passed; contrast fixed; `reduceMotion` functional; transcript has `aria-live` (UX-1, UX-4, UX-6, DOC-1)
- [ ] In-product model-limitation disclosure (weak letters, no J/Z) (DOC-2)
- [ ] Open-source licenses/attribution page (DOC-3)

## Suggested Delivery Phases

| Phase | Theme | Contents |
|---|---|---|
| **1 — Foundation** | Make iteration safe | CI (TEST-7/OPS-2), Vitest + classifier tests (TEST-1), code-splitting (FR-7/PERF-1/PERF-2), CSP + self-hosted fonts (SEC-5) |
| **2 — Honesty pass** | Stop misrepresenting state | ML-5 language gating, FR-10 sign-out, UX-2/UX-6 dead toggles, DOC-2 disclosure, FR-5/FR-6 remove-or-label mic & avatar |
| **3 — Real accounts** | First backend | BE-1 auth, FR-1/FR-2 guards, SEC-3 GDPR, BE-4 error reports |
| **4 — Real model** | ML quality | ML-1 trained `.task`, ML-3 per-class floors, ML-7 perf budget, OPS-4 model versioning |
| **5 — Sync & scale** | Cross-device | BE-2/BE-3 profile + history sync, SEC-4 encrypted sync, OPS-3/OPS-5 previews + observability |
| **6 — Roadmap** | Differentiators | ML-4 J/Z temporal model, ML-6 signing avatar, FR-11 PWA/offline, PERF-5 low-end support |

---

*Generated from a full audit of the codebase at branch `claude/what-does-this-have-cvbi0s`. Companion developer docs: `docs/SIGN_DETECTION.md`.*
