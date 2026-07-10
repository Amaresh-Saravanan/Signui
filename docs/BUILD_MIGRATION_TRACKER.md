# SignBridge — Build & Migration Tracker

> **Status:** Living document · updated 2026-07-10
> **Repo:** `Amaresh-Saravanan/Signui` · **Working branch:** `claude/what-does-this-have-cvbi0s` (PR #1)
> **Target platform:** Vercel (static SPA now → serverless API later)
> **Companion docs:** [`REQUIREMENTS.md`](./REQUIREMENTS.md) (62 numbered requirements) · [`SIGN_DETECTION.md`](./SIGN_DETECTION.md) (ML pipeline)

This is the single tracker for taking SignBridge from its current state to a
production deployment on Vercel — architecture, tech stack, migration phases
with live status, deployment configuration, and the plans for the two big
future migrations (real backend, trained ML model).

---

## 1. Where the product came from (migration history)

The codebase is the result of three merges of independent work, all landed on
this branch:

| Step | Source | What was taken |
|---|---|---|
| 1. Base app | `Amaresh-Saravanan/Signui` (main) | React 19 + Vite SPA skeleton, 14 pages, routing, contexts |
| 2. UI redesign | `Akshayab-07/Signui` | Full visual layer: "Warm Alabaster / Midnight Luminous" theme, Sora/Geist/Inter fonts, glass/aurora effects — architecture untouched |
| 3. ML pipeline | `VAKULABHUSHAN/sign-language` (Python) | Ported to browser: MediaPipe HandLandmarker (WASM) + geometric ASL classifier replacing the untrained RandomForest; wired into Workspace |

Then three production-hardening phases were executed (§4).

---

## 2. Current architecture (as-built)

```
┌────────────────────────── Browser (everything runs here) ──────────────────────────┐
│                                                                                     │
│  React 19 SPA (Vite 8, TS 6, Tailwind 4)                                            │
│  ├─ Routing: react-router 7, all 14 pages React.lazy-split                          │
│  │   └─ RequireAuth guard → /auth?redirect= for unauthenticated users               │
│  ├─ State: AppDataContext (profile, prefs, history, phrasebook, session,            │
│  │   onboarding, consent) → localStorage 'signbridge.appData.v1'                    │
│  ├─ Theme: ThemeContext (light/dark) + .high-contrast + .reduce-motion              │
│  │   root classes via AccessibilityEffects (drives framer-motion MotionConfig)      │
│  │                                                                                  │
│  └─ Workspace detection loop (only route that loads ML assets)                      │
│      getUserMedia ──► MediaPipe HandLandmarker (WASM, local /wasm + /models)        │
│                  ──► classifyASL() geometric classifier (42 landmark features)      │
│                  ──► majority-vote smoothing ──► letter+confidence                  │
│                  ──► word builder ──► transcript + history                          │
│                                                                                     │
│  Privacy invariant: CSP connect-src 'self' — zero network egress of frames,         │
│  landmarks, or any user data. No backend exists.                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**No server component exists.** Auth is a client session (documented seam for
BE-1), analytics/history are computed locally, error reports increment a local
counter. This is deployable today as a purely static product.

### Bundle & asset budget (measured, current build)

| Artifact | Size | Notes |
|---|---|---|
| Entry chunk `index-*.js` | 252 KB raw / **81 KB gzip** | Budget ≤200 KB gzip — enforced in CI |
| `Workspace-*.js` chunk | 161 KB raw | Contains MediaPipe JS API; loads only on `/workspace` |
| CSS | 116 KB raw / 17 KB gzip | Tailwind 4 + self-hosted font-face |
| `public/models/hand_landmarker.task` | 7.5 MB | Fetched only on Workspace entry |
| `public/wasm/` (SIMD + noSIMD variants) | 22 MB | Browser fetches ~11 MB (one variant) |
| Fonts (@fontsource woff2) | ~5 woff2 files on first paint | Self-hosted, `font-src 'self'` |

---

## 3. Tech stack — current vs. required for production

### In place today

| Layer | Tech | Version | Status |
|---|---|---|---|
| UI framework | React | 19.2 | ✅ |
| Build | Vite (rolldown) | 8.1 | ✅ |
| Language | TypeScript | 6.0 | ✅ strict, `tsc -b` in CI |
| Styling | Tailwind CSS | 4.3 | ✅ token-based theming |
| Animation | framer-motion | 12 | ✅ MotionConfig honors reduce-motion |
| Routing | react-router-dom | 7.18 | ✅ lazy + guards |
| ML runtime | @mediapipe/tasks-vision | 0.10 | ✅ WASM bundled locally |
| Classifier | Custom geometric (`aslClassifier.ts`) | — | ✅ interim; replace in Phase 4 |
| Fonts | @fontsource (Inter, Sora, Geist Sans) | 5.x | ✅ self-hosted |
| Unit tests | Vitest | 4.1 | ✅ 19 tests, `npm test` |
| Lint | oxlint | 1.71 | ✅ |
| CI | GitHub Actions | — | ✅ lint→test→build→bundle-budget gate |
| Security | CSP (meta tag) | — | ✅ move to HTTP header on Vercel (§6) |

### Required before/at production (not yet in repo)

| Need | Recommended tech | Phase | Why |
|---|---|---|---|
| Hosting + CDN + previews | **Vercel** (Vite preset) | Deploy | SPA fallback, per-PR previews (OPS-3), instant rollback (OPS-6) |
| E2E tests | Playwright (`@playwright/test`) + fake-camera y4m fixture | 4 | TEST-4/5 — the detection flow has only manual browser verification today |
| Trained model | MediaPipe Model Maker → `asl.task` | 4 | ML-1/ML-3 — replaces heuristic; trained in Colab on Kaggle ASL Alphabet |
| Schema validation | zod | 5 | FR-3 — validate/migrate the localStorage blob |
| Managed auth | Clerk / Auth.js / Supabase Auth (pick one) | 5 | BE-1 — real credentials; drops into the `signIn()` seam |
| API + DB | Vercel Functions (`/api`) + Neon/Vercel Postgres | 5 | BE-2/3/4 — profiles, history sync, error reports |
| Error tracking | Sentry (gated by `localOnly` pref) | 5 | OPS-5 — must never capture frames/landmarks/transcripts |
| Analytics | Vercel Analytics (cookieless) | 5 | OPS-5 — privacy-safe, consent-gated |
| Speech-to-text | Web Speech API | 6 | FR-5 — mic is currently a disabled "coming soon" control |
| Signing avatar | Sprite/clip library or 3D rig | 6 | FR-6/ML-6 — Text→Sign direction |

---

## 4. Migration tracker

Legend: ✅ done (verified) · 🔶 partial · ⬜ not started · 🔒 blocked on external decision

### Phase 1 — Foundation ✅ COMPLETE (commit `5a723f4`)

| Item | Req IDs | Status | Evidence |
|---|---|---|---|
| Vitest + classifier unit suite (19 tests) | TEST-1 | ✅ | `npm test` green |
| Route code-splitting (all 14 pages lazy) | FR-7, PERF-1 | ✅ | entry 660→81 KB gzip |
| MediaPipe isolated to Workspace chunk | PERF-2 | ✅ | zero model fetches on Landing (browser-verified) |
| Self-hosted fonts, CDN links removed | SEC-5 | ✅ | zero external requests |
| Strict CSP (meta tag) | SEC-5 | ✅ | zero violations; detector works under `wasm-unsafe-eval` |
| GitHub Actions CI + bundle budget gate | TEST-7, OPS-2 | ✅ | `.github/workflows/ci.yml` |

### Phase 2 — Honesty pass ✅ COMPLETE (commit `9039b25`)

| Item | Req IDs | Status | Evidence |
|---|---|---|---|
| ISL/BSL gated "coming soon"; fake engine versions removed; history refuses unavailable languages | ML-5 | ✅ | dropdown disabled state browser-verified |
| Real sign-out (wipes storage + state) | FR-10 | ✅ | storage → null verified |
| Reduce Motion functional (CSS + MotionConfig + OS pref) | UX-6 | ✅ | root class verified |
| High Contrast functional (token overrides, surfaced in Settings) | UX-2 | ✅ | black-bg screenshot verified |
| Accuracy disclosure popover (weak letters, no J/Z) | DOC-2 | ✅ | popover content verified |
| Mic disabled ("coming soon"), Text→Sign badged + input disabled, fake messages removed | FR-5, FR-6 | ✅ | browser-verified |

### Phase 3 — Access control & data rights ✅ COMPLETE (client-side; commit `869b54d`)

| Item | Req IDs | Status | Evidence |
|---|---|---|---|
| Client session + `signIn()` backend seam + onboarding tracking | FR-1 (seam) | ✅ | signup flow verified |
| RequireAuth guards, `?redirect=` return, onboarding guard | FR-2 | ✅ | `/dashboard` → `/auth?redirect=%2Fdashboard` verified |
| Export My Data (JSON download) | SEC-3 | ✅ | download verified |
| Delete Account actually deletes (confirm + wipe + sign out) | SEC-3 | ✅ | storage null verified |
| First-run consent banner (local-first guarantee) | SEC-3 | ✅ | banner verified |
| Real managed auth (hashing, tokens) | BE-1, FR-1 | 🔒 | deferred by decision — needs provider choice (§7) |

### Phase 4 — Real model & test depth ⬜ NEXT

| Item | Req IDs | Status | Notes |
|---|---|---|---|
| Train gesture recognizer (Model Maker, Kaggle ASL Alphabet) | ML-1 | 🔒 | needs Colab GPU + Kaggle creds; notebook can be authored on request |
| Per-class accuracy floors (≥95% reliable set, ≥85% weak set) | ML-3 | ⬜ | publish confusion matrix with the model |
| Swap `classifyASL()` → GestureRecognizer in `useSignDetector` | ML-1 | ⬜ | same FilesetResolver pattern; small diff |
| Versioned model artifacts (hash surfaced in-app) | OPS-4 | ⬜ | replaces removed fake engineVersion strings |
| Detection loop throttle (15–20 fps cap) + `visibilitychange` pause | ML-7, PERF-4 | ⬜ | currently unthrottled rAF |
| Playwright E2E: fake-camera detection flow, guard flow, y4m "B" fixture | TEST-4, TEST-5 | ⬜ | Chromium `--use-file-for-fake-video-capture` |
| Visual regression snapshots (both themes) | TEST-6 | ⬜ | Playwright screenshots in CI |

### Phase 5 — Backend & sync 🔒 BLOCKED on infra decisions

| Item | Req IDs | Status | Notes |
|---|---|---|---|
| Managed auth provider into `signIn()` seam | BE-1 | 🔒 | §7 decision table |
| `/api` functions + Postgres (profiles, history, phrasebook, reports) | BE-2/3/4, BE-6 | 🔒 | API contract sketch in §7 |
| zod schema + versioned localStorage migration (`v1`→`v2`) | FR-3 | ⬜ | do together with sync |
| GDPR server-side (export/delete purge server copies, consent records) | SEC-3 | ⬜ | extends existing client controls |
| Sentry + Vercel Analytics, both consent/`localOnly`-gated | OPS-5 | ⬜ | never capture frames/landmarks/text |
| Encrypted sync (TLS + at-rest; client-side crypto optional) | SEC-4 | ⬜ | |

### Phase 6 — Roadmap ⬜

| Item | Req IDs | Notes |
|---|---|---|
| J/Z temporal model (landmark sequence over N frames) | ML-4 | requires trained pipeline first |
| Text→Sign avatar (fingerspelling first) | ML-6, FR-6 | un-hide the gated UI when real |
| Web Speech API mic | FR-5 | re-enable the disabled control |
| PWA/offline (manifest + SW caching WASM/model) | FR-11 | natural fit: app is already local-first |
| ISL/BSL models | ML-5 | flip `available: true` per language when trained |
| WCAG 2.1 AA formal audit + statement | UX-1, DOC-1 | axe-core in CI + manual pass |
| OSS licenses/attribution page | DOC-3 | MediaPipe Apache-2.0 + upstream Python project credit |

---

## 5. Cross-cutting invariants (never regress these)

1. **No frame egress** — camera frames/landmarks never leave the device. CSP `connect-src` stays locked; any future telemetry must be provably free of detection data.
2. **Entry chunk ≤200 KB gzip** — CI gate fails the build otherwise; MediaPipe must never re-enter the entry chunk.
3. **Honest UI** — nothing pretends to work: unavailable languages, mic, and Text→Sign stay visibly gated until real.
4. **Model limitations disclosed** — the Accuracy popover ships in every release; update it when the trained model changes the weak-letter set.
5. **localStorage key is versioned** (`signbridge.appData.v1`) — never change shape without a migration path.

---

## 6. Vercel deployment guide (do this now — app is deployable today)

### 6.1 One-time setup

1. Push/merge PR #1, connect the GitHub repo at vercel.com → **Add New Project**.
2. Vercel auto-detects **Vite**: build `npm run build`, output `dist`, install `npm ci`. Node 22.x (matches CI).
3. Every PR gets a preview URL automatically (**satisfies OPS-3**); production deploys on merge to `main`.
4. Rollback = "Promote previous deployment" in the dashboard, instant (**satisfies OPS-6**).

### 6.2 `vercel.json` (add at repo root when deploying)

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
    {
      "source": "/(wasm|models)/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

Notes:
- The SPA rewrite makes deep links (`/workspace` refresh) return 200 (**OPS-1**).
- CSP moves from the `<meta>` tag to an **HTTP header** (stronger: supports `frame-ancestors`). When `vercel.json` lands, delete the meta tag from `index.html` to avoid double-maintenance, and add `frame-ancestors 'none'` only in the header (meta CSP ignores it anyway).
- `/wasm` and `/models` are immutable-cached for a year. **Consequence:** a model update MUST ship under a new filename (e.g. `asl-v2.task`) — this is exactly OPS-4's versioned-artifact requirement.
- `Permissions-Policy` allows camera for self only and hard-disables mic until FR-5 ships (update it then).

### 6.3 Deployment sanity checklist (run on the preview URL)

- [ ] `/` loads, fonts render (Sora headline), zero console CSP violations
- [ ] Refresh `/workspace` directly → 200 (rewrite works)
- [ ] Unauthenticated `/dashboard` → redirected to `/auth?redirect=%2Fdashboard`
- [ ] Workspace: camera prompt → "Live Studio" badge (model + WASM served with correct MIME `application/wasm`)
- [ ] Network tab: zero third-party requests; `/wasm`, `/models` return `Cache-Control: immutable`
- [ ] Consent banner appears once; Export downloads JSON; Delete wipes and signs out
- [ ] Lighthouse on `/`: LCP ≤2.5 s, CLS ≤0.1 (PERF-3)

### 6.4 Size/limits check

Deployment payload ≈ 32 MB (22 MB WASM + 7.5 MB model + 2.4 MB app) — well
inside Vercel's limits on all plans. The browser only downloads one WASM
variant (~11 MB) plus the 7.5 MB model, and only on `/workspace`, cached
immutably afterward.

---

## 7. Future migration plans (pre-decided so execution is mechanical)

### 7.1 Backend (Phase 5) — decision table

| Concern | Option A (fastest) | Option B (most control) |
|---|---|---|
| Auth | Clerk (drop-in React components) | Auth.js v5 on Vercel Functions |
| DB | Vercel Postgres / Neon | Supabase (auth + DB together) |
| API | Vercel Functions in `/api` | same |

**Integration seam (already built):** `AppDataContext.signIn()` is the single
point where a credential exchange lands; `RequireAuth` reads
`isAuthenticated`. Swapping the local session for a provider session touches
those two files plus Auth.tsx — no page rewiring.

**API contract sketch** (BE-2/3/4):

```
POST   /api/reports          { text, letter?, confidence?, language, appVersion }   ← BE-4 (no frames, ever)
GET    /api/profile          → UserProfile                                          ← BE-2
PUT    /api/profile          Partial<UserProfile>
GET    /api/history?cursor=  → HistoryEntry[]                                       ← BE-3
POST   /api/history          HistoryEntry (client-generated id, last-write-wins)
DELETE /api/history/:id
GET    /api/export           → full JSON dump (SEC-3)
DELETE /api/account          → purge everything (SEC-3)
```

CSP change required: `connect-src 'self'` already covers same-origin `/api` —
no loosening needed if the API lives on the same Vercel deployment. That is a
strong reason to prefer Vercel Functions over a separate API host.

### 7.2 ML model (Phase 4) — execution plan

1. Colab notebook: download Kaggle "ASL Alphabet" (~87k images) → `mediapipe-model-maker` gesture recognizer → export `asl-fingerspelling-v1.task` (needs your Kaggle credentials + Colab GPU, ~15–30 min).
2. Drop the file in `public/models/`, load with `GestureRecognizer` (sibling API of the current `HandLandmarker` in `useSignDetector.ts`); keep `classifyASL` as offline fallback behind a flag.
3. Publish the confusion matrix in `docs/`; update the in-app Accuracy popover if the weak-letter set changes (DOC-2).
4. Surface the model version/hash in the UI (OPS-4) — the slot exists since fake `engineVersion` strings were removed.
5. Add the y4m fake-video Playwright E2E so the model swap is regression-tested (TEST-4).

---

## 8. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| CSP meta vs header drift | policy silently weaker on one path | delete meta tag when `vercel.json` header lands (§6.2) |
| Immutable-cached model updated in place | users stuck on old model for a year | version filenames (`-v2.task`), never overwrite (OPS-4) |
| localStorage schema change without migration | user data silently dropped | zod + versioned key migration before any shape change (FR-3) |
| Heuristic classifier oversold | user trust damage | Accuracy popover + Uncertain flags already shipped; keep until trained model lands |
| Unthrottled rAF loop on low-end devices | battery drain, jank | Phase 4 throttle + `visibilitychange` pause (PERF-4) |
| Telemetry added later captures detection data | breaks core privacy guarantee | OPS-5 requires scrub + consent gate + `localOnly` kill-switch |
| E2E gap: detection verified manually only | regressions ship undetected | TEST-4 Playwright fake-camera suite in Phase 4 |

---

## 9. Runbook (once on Vercel)

- **Deploy:** merge to `main` → production. PRs → preview URLs.
- **Verify:** run §6.3 checklist on every production deploy (automate as a post-deploy Playwright job later).
- **Rollback:** Vercel dashboard → Deployments → promote previous. Model rollback = revert the model file commit (separate from app rollback by design).
- **CI gate:** lint → 19 unit tests → typecheck+build → entry-chunk ≤200 KB gzip + MediaPipe-leak check. A red gate blocks merge; do not bypass.
- **Local commands:** `npm run dev` · `npm test` · `npm run lint` · `npm run build` · `npm run preview`.
