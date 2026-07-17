# SignBridge — Technical Design Document (TDD)

> **Version:** 1.0 (standalone) · **Status:** Active · **Last updated:** 2026-07-16
> **Scope:** The *how* behind [`PRD.md`](./PRD.md). Architecture, module design,
> data schemas, interfaces, ML pipeline, security, testing, and deployment.
> **Execution status:** [`MIGRATION_TRACKER.md`](./MIGRATION_TRACKER.md)

---

## 1. System Overview

SignBridge is a **100% client-side SPA** today. Everything runs in the browser;
there is no server component. All persistence is `localStorage`; all inference
is on-device via MediaPipe WASM.

```
┌──────────────────────────── Browser (all execution here) ────────────────────────────┐
│  React 19 SPA · Vite 8 (rolldown) · TypeScript 6 · Tailwind 4 · framer-motion 12      │
│                                                                                        │
│  Router (react-router 7)                                                               │
│   ├─ Public:   /  /auth                                                                 │
│   ├─ Onboarding (auth, not-yet-onboarded):  /onboarding /permissions /preferences      │
│   └─ Protected (RequireAuth): /dashboard /workspace /history /phrasebook               │
│                               /analytics /settings /about /profile /contact            │
│                                                                                        │
│  State                                                                                 │
│   ├─ ThemeContext        → light/dark root class                                        │
│   ├─ AccessibilityEffects→ .reduce-motion / .high-contrast root classes + MotionConfig │
│   └─ AppDataContext      → single source of truth → localStorage 'signbridge.appData.v1'│
│                                                                                        │
│  Workspace detection loop (only route that loads ML assets)                            │
│   getUserMedia → <video> → MediaPipe HandLandmarker (WASM) → 21 landmarks               │
│                → classifyASL() geometric classifier → letter+confidence                 │
│                → majority-vote smoothing → word builder → transcript → history          │
│                                                                                        │
│  Privacy boundary: CSP connect-src 'self'. Zero egress of frames/landmarks/user data.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Future server (M5)** is additive and optional: a static SPA that *degrades to
local-only* if the API is unreachable. Inference and camera never move server-side.

---

## 2. Tech Stack (as-built)

| Layer | Tech | Version | Notes |
|---|---|---|---|
| UI | React | 19.2 | function components + hooks |
| Build | Vite (rolldown) | 8.1 | `tsc -b && vite build` |
| Language | TypeScript | 6.0 | strict |
| Styling | Tailwind CSS | 4.3 | token-based theming via CSS vars |
| Animation | framer-motion | 12 | `MotionConfig` honors reduce-motion |
| Routing | react-router-dom | 7.18 | lazy routes + guards |
| ML runtime | @mediapipe/tasks-vision | 0.10 | WASM bundled in `public/wasm` |
| Classifier | custom geometric (`aslClassifier.ts`) | — | interim; replace M4 |
| Fonts | @fontsource (Inter/Sora/Geist) | 5.x | self-hosted |
| Unit tests | Vitest | 4.1 | `npm test` |
| Lint | oxlint | 1.71 | `npm run lint` |
| CI | GitHub Actions | — | `.github/workflows/ci.yml` |

---

## 3. Module & Directory Design

```
src/
├── App.tsx                      Router; all pages React.lazy + Suspense
├── main.tsx                     ReactDOM root
├── context/
│   ├── AppDataContext.tsx        SINGLE source of truth (profile/prefs/history/…)
│   ├── ThemeContext.tsx          light/dark
│   └── AccessibilityEffects.tsx  reduce-motion / high-contrast root classes
├── layouts/MainLayout.tsx        chrome (sidebar/navbar); hideSidebar variant
├── components/
│   ├── RequireAuth.tsx           route guard (isAuthenticated + onboarding)
│   ├── ConsentBanner.tsx         first-run privacy consent
│   ├── AvatarPlaceholder.tsx     gated text-to-sign placeholder
│   └── Button/Card/Input/Toggle/… primitives
├── pages/                        14 route components
├── hooks/useSignDetector.ts      MediaPipe loader + rAF detection loop
├── lib/
│   ├── aslClassifier.ts          geometric landmark→letter classifier
│   └── aslClassifier.test.ts     Vitest unit suite (19 tests)
├── constants/languages.ts        language registry + availability gate
└── utils/cn.ts                   className merge (clsx + tailwind-merge)

public/
├── models/hand_landmarker.task   ~7.5 MB MediaPipe hand model
└── wasm/                          ~22 MB SIMD + noSIMD variants (browser fetches one)
```

**Design principle:** `AppDataContext` is the only mutation surface for app data.
Pages never touch `localStorage` directly. This keeps the future backend swap
(M5) contained to one file.

---

## 4. Data Model

### 4.1 Persisted state (`localStorage` key `signbridge.appData.v1`)

Source of truth: `src/context/AppDataContext.tsx`. Shape:

```ts
type SignLanguageCode = 'ISL' | 'ASL' | 'BSL';
type TranslationMode  = 'sign-to-text' | 'text-to-sign';

interface HistoryEntry {
  id: number;              // Date.now() + rand; client-generated
  timestamp: number;       // epoch ms
  text: string;
  type: TranslationMode;
  conf?: number;           // 0..1 confidence at capture
  saved: boolean;
  languageCode: SignLanguageCode;
}

interface UserProfile {
  firstName: string; lastName: string; email: string;
  plan: 'Free plan';
  role: 'deaf' | 'hearing' | 'interpreter';
  primaryLanguage: SignLanguageCode;
}

interface AppPreferences {
  notifications: boolean;
  localOnly: boolean;      // telemetry kill-switch (drives future OPS-5 gating)
  reduceMotion: boolean;
  highContrast: boolean;
}

interface AppDataState {
  user: UserProfile;
  preferences: AppPreferences;
  history: HistoryEntry[];
  phrasebook: Record<string, string[]>;  // categories: Greetings/Emergencies/Travel/Daily/Saved
  reportsCount: number;
  session: { email: string } | null;     // null = signed out (BE-1 seam)
  onboardingComplete: boolean;
  consentAcknowledged: boolean;
}
```

**Derived (not persisted):** `stats` is a `useMemo` over `history`/`phrasebook`
(totals, streaks via `calculateStreak`, `weeklyCounts`, `languageDistribution`,
`avgConfidence`). Recomputed on every state change.

### 4.2 Known schema-layer gaps (design decisions for M5)

- **No validation/migration.** `safeLoadState()` does a shallow default-merge, no
  runtime schema check, no `v1→v2` path. **Design:** introduce `zod` schema +
  versioned migration map before any shape change (see §8.3).
- **Synchronous write on every mutation.** `commit()` calls `setState` +
  `localStorage.setItem` inline. **Design:** debounce writes (~250 ms trailing)
  to avoid main-thread jank during rapid history updates.
- **No cross-tab sync.** **Design (optional):** `storage` event listener to
  reconcile tabs, or accept last-write-wins.

---

## 5. Detection Pipeline (the core subsystem)

### 5.1 Data flow

```
getUserMedia({video})                       Workspace.tsx
   → <video>
   → useSignDetector({ videoRef, enabled, onPrediction, smoothingWindow=6 })
       → FilesetResolver.forVisionTasks('/wasm')          load once
       → HandLandmarker.createFromOptions({ VIDEO, numHands:1 })
       → requestAnimationFrame loop:
            detectForVideo(video, performance.now())       21 landmarks
            → classifyASL(landmarks) → { letter, confidence }   aslClassifier.ts
            → smooth(letter)  majority vote over window   → stableLetter
            → onPrediction({ letter, confidence, landmarks })
   → Workspace accumulation (refs):
        COMMIT_FRAMES=8   letter stable N frames → append to word buffer
        MIN_CONF=0.55     minimum to accept a letter
        LOW_CONF=0.7      below → shown but flagged "uncertain"
        FLUSH_FRAMES=22   no-hand N frames → flush word → transcript + history
```

### 5.2 Key interfaces

```ts
// src/lib/aslClassifier.ts
interface Landmark { x: number; y: number; z?: number; }
function classifyASL(lm: Landmark[]): { letter: string; confidence: number };

// src/hooks/useSignDetector.ts
interface SignPrediction { letter: string; confidence: number; landmarks: Landmark[] | null; }
function useSignDetector(opts: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onPrediction?: (p: SignPrediction) => void;
  smoothingWindow?: number;
}): { ready: boolean; error: string | null; prediction: SignPrediction };
```

### 5.3 Classifier coverage (`docs/SIGN_DETECTION.md` is the reference)

- **Reliable:** A B C D F G H I K L O R U V W X Y
- **Weak (ambiguous from landmarks):** E S T M N P Q
- **Unsupported (motion):** J Z — need a temporal model (F-7).

### 5.4 Planned changes

| Change | Req | Design |
|---|---|---|
| Trained model swap | F-2 | Load `GestureRecognizer` (sibling of `HandLandmarker`) from a versioned `.task`; keep `classifyASL` as offline fallback behind a flag. **No change** to landmark feature ordering `[x0,y0,…,x20,y20]`. |
| fps cap + pause | F-6 | Throttle the rAF loop to a target interval (e.g. 50–66 ms); add `visibilitychange` + `enabled` gates so the loop fully suspends when hidden/paused. |
| J/Z temporal | F-7 | Ring buffer of N landmark frames → small sequence classifier; only engaged when static classifier is low-confidence on a J/Z-shaped hand. |

---

## 6. Frontend Design

### 6.1 Routing & guards

`App.tsx` splits every page with `React.lazy` + a `<Suspense>` fallback.
`RequireAuth` wraps protected routes:
- Not authenticated → redirect `/auth?redirect=<original>`.
- Authenticated but `!onboardingComplete` (and guard requires it) → redirect to wizard.
- `requireOnboarded={false}` variant lets `/onboarding` `/permissions` `/preferences` run mid-flow.

### 6.2 Theming & accessibility

- `ThemeContext` toggles light/dark; tokens are CSS variables.
- `AccessibilityEffects` applies `.reduce-motion` / `.high-contrast` root classes
  and wraps the tree in framer-motion `MotionConfig`. `reduceMotion` honors both
  the OS `prefers-reduced-motion` query and the app preference.

### 6.3 Open frontend work (design intents)

| Item | Req | Design intent |
|---|---|---|
| `aria-live` transcript | F-21 | Wrap the transcript insertion point in `aria-live="polite"`; camera/model errors in `aria-live="assertive"`. |
| Focus management | F-24/25 | Shared `useFocusTrap` hook for modal + language dropdown; on route change move focus to page `<h1>`. |
| Form validation | F-27 | Shared zod schemas + field-level errors; applied to Auth/Contact/Settings/Onboarding. |
| Error boundary | F-28 | Top-level React `ErrorBoundary` with a themed fallback; skeletons for future async reads. |
| Phrasebook Play/Edit | F-15 | Wire `onClick` handlers (currently dead) — Play = TTS/preview, Edit = inline rename. |
| Contrast | F-20 | Replace sub-AA low-opacity literals; verify with axe in CI. |

### 6.4 Conversation UX features (M2.5, from `IDEAS.md`)

All client-side — no backend, no ML retraining. These live in `Workspace.tsx`
plus small helpers; the detection pipeline (§5) is untouched except where noted.

| Feature | Req | Design intent |
|---|---|---|
| Word prediction | F-41 | Static JSON word list loaded lazily on Workspace entry; pure `predict(prefix, phrasebook): string[]` does prefix match (plain `filter` or a trie) over the current word buffer → top-3 chips above the transcript, saved-Phrasebook matches weighted first. Tap a chip → replace buffer, flush to transcript. Unit-testable in isolation. |
| Counter Mode | F-42 | Boolean UI state in `Workspace`; renders the transcript into a `position:fixed inset-0` overlay at 48px+ using `.high-contrast` tokens. No pipeline change. Tap/`Esc` exits; honors reduce-motion. |
| Quick phrase bar | F-43 | Horizontal scroll strip of chips above the transcript; default set from a new `constants/phrases.ts`, merged with `phrasebook['Saved']`. Tap → append phrase to transcript + history (no fingerspelling). |
| Undo last word | F-44 | Push each committed word onto a `wordStack` ref as it flushes (§5.1 `FLUSH_FRAMES`); Undo pops the last word from transcript + history. O(1); no re-run of detection. |
| Confidence heatmap | F-45 | Reuse the `landmarks` already returned by `useSignDetector`; draw dots on a `<canvas>` overlay colored by per-landmark visibility/score (green→amber). Settings toggle, off by default; hidden or swapped for shape/size cues under `.high-contrast`. |
| Session export | F-46 | Serialize the current session's transcript entries → `.txt` `Blob` → download or Web Share API. No new storage. |
| Low-light preprocess | F-47 | Optional pre-filter: draw `<video>` to an offscreen canvas, boost brightness/contrast, feed *that canvas* to `detectForVideo` instead of the raw element. Settings toggle, off by default; measure fps cost against the F-6 budget. |

---

## 7. Backend Design (M5 — additive, not yet built)

**Principle (BE-5/SEC-2):** no server endpoint ever accepts video/frames/landmarks.
Server handles only profile/history/phrasebook/reports metadata.

### 7.1 Integration seam (already in code)

`AppDataContext.signIn(fullName, email)` is the single credential-exchange point;
`isAuthenticated = state.session !== null`. Swapping the local session for a
provider session touches **only** `AppDataContext`, `RequireAuth`, and `Auth.tsx`.

### 7.2 Proposed API contract

```
POST   /api/reports          { text, letter?, confidence?, language, appVersion }   # no frames, ever
GET    /api/profile          → UserProfile
PUT    /api/profile          Partial<UserProfile>
GET    /api/history?cursor=  → HistoryEntry[]
POST   /api/history          HistoryEntry (client id; last-write-wins)
DELETE /api/history/:id
GET    /api/export           → full JSON dump (SEC-3)
DELETE /api/account          → purge everything (SEC-3)
```

### 7.3 Stack decision (pick at M5 start — PRD D-1/D-2)

| Concern | Option A (fastest) | Option B (most control) |
|---|---|---|
| Auth | Clerk (drop-in React) | Auth.js v5 on Vercel Functions |
| DB | Vercel Postgres / Neon | Supabase (auth + DB) |
| API | Vercel Functions `/api` | same |

Same-origin `/api` keeps `connect-src 'self'` valid — no CSP loosening. Strong
reason to prefer Vercel Functions over a separate host.

---

## 8. Cross-Cutting Concerns

### 8.1 Security & privacy

- **CSP:** `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; …`
  Currently a `<meta>` tag; **move to HTTP header** at deploy (`vercel.json`, §9) and
  delete the meta to avoid drift. Header adds `frame-ancestors 'none'`.
- **No-egress CI check:** a build/CI grep must fail if any code path posts image/
  video/landmark data. `connect-src 'self'` is the runtime backstop.
- **Camera lifecycle (F-31):** stop **all** `MediaStreamTrack`s on camera-off,
  pause, and unmount (every exit path); show a visible in-use indicator.
- **Secrets:** none client-side today; once M5 lands, no provider keys in the bundle.

### 8.2 Performance budget

| Budget | Target | Mechanism |
|---|---|---|
| Entry chunk | ≤200 KB gzip (81 KB today) | route lazy-split; CI gate |
| MediaPipe location | Workspace chunk only | dynamic import via route split |
| Detection | ≥15 fps laptop / ≥10 fps mobile | fps cap + frame skipping (F-6) |
| Heap over 10 min | ≈0 growth | landmarker `close()` on unmount; ref cleanup |

### 8.3 Persistence hardening (FR-3 design)

```
load(raw):
  parse → detect version field
  if version < CURRENT: run migration steps sequentially
  validate with zod schema
  on failure: safe-reset (never silently drop fields) + telemetry (if allowed)
write(state): debounce 250ms trailing → JSON.stringify → setItem (catch quota)
```

### 8.4 Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit | Vitest | `aslClassifier` (✅ 19 tests); add `useAppData` stats/streak/toggleSaved |
| Component | Vitest + Testing Library | Auth, Settings, Phrasebook (render + context mutations) |
| E2E | Playwright | Fake-camera (`--use-file-for-fake-video-capture=<y4m>`) detection flow; onboarding→workspace journey; guard redirect; camera-denied path |
| Visual | Playwright screenshots | Representative pages, both themes, pixel-diff threshold |
| A11y | axe-core (in E2E or CI) | AA gate per route |

**Fake-camera fixture:** record a short `.y4m` of a stable "B" (open palm);
assert the detected-letter badge + transcript reach expected output within timeout.

---

## 9. Deployment Architecture (M3)

Target: **Vercel** (Vite preset). Build `npm run build` → `dist/`. Every PR gets a
preview URL; production deploys on merge to `main`; rollback = promote previous.

### 9.1 `vercel.json` (add at repo root — not present yet)

```json
{
  "rewrites": [
    { "source": "/((?!api/|assets/|wasm/|models/|favicon.svg).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=()" }
      ]
    },
    { "source": "/(wasm|models)/(.*)", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] },
    { "source": "/assets/(.*)",        "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
  ]
}
```

### 9.2 Deployment invariants

- SPA rewrite → deep links (`/workspace` refresh) return 200.
- `/wasm` + `/models` immutable-cached 1 year ⇒ **model updates must ship under a
  new filename** (`asl-v2.task`), never overwrite (F-37).
- Delete the CSP `<meta>` tag once the header lands (avoid double-maintenance).
- `Permissions-Policy` disables mic until F-9 ships.
- Payload ≈32 MB total; browser downloads ~11 MB WASM (one variant) + 7.5 MB model,
  only on `/workspace`, cached immutably after.

### 9.3 CI gate (`.github/workflows/ci.yml`, exists)

`oxlint` → Vitest → `tsc -b` + `vite build` → entry-chunk ≤200 KB gzip + MediaPipe-
leak check. Red gate blocks merge. E2E (Playwright) added at M4.

---

## 10. Traceability (PRD feature → code)

| PRD | Code owner | State |
|---|---|---|
| F-1/F-3/F-4/F-6 | `useSignDetector.ts`, `aslClassifier.ts`, `Workspace.tsx` | ✅ / F-6 ⬜ |
| F-2/F-7 | `useSignDetector.ts` + new `.task` | ⬜ |
| F-8 | `constants/languages.ts` (`isLanguageAvailable`) | ✅ |
| F-11/F-13 | `AppDataContext.signIn/signOut` | seam ✅ / provider ⬜ |
| F-12 | `RequireAuth.tsx`, `App.tsx` | ✅ |
| F-14/F-19 | `AppDataContext` (history, `exportData`, `signOut`) | client ✅ |
| F-16/F-17/F-18 | future `/api` + `AppDataContext` swap | ⬜ |
| F-20…F-28 | pages + `AccessibilityEffects` + new hooks | partial |
| F-41…F-47 | `Workspace.tsx` + `constants/phrases.ts` + `predict()`/export helpers | ⬜ |
| F-29/F-30 | `index.html` CSP → `vercel.json` | meta ✅ / header ⬜ |
| F-32/F-34 | `App.tsx` lazy, `ci.yml` | ✅ |
| F-33/F-39 | `vercel.json` + Vercel | ⬜ |

*This document is the design contract. Task-level status lives in
[`MIGRATION_TRACKER.md`](./MIGRATION_TRACKER.md).*
