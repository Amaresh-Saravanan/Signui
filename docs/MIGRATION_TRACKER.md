# SignBridge — Migration & Build Tracker (to Deployment)

> **Version:** 1.0 (standalone) · **Status:** Living · **Last updated:** 2026-07-16
> **Branch:** `main` · **Target host:** Vercel (static SPA → serverless API later)
> **Companion docs:** [`PRD.md`](./PRD.md) (what/why) · [`TDD.md`](./TDD.md) (how)

Legend: ✅ done · 🔶 partial · ⬜ not started · 🔒 blocked on decision

**Milestone status at a glance**

| Milestone | Theme | Status |
|---|---|---|
| M0 Foundation | Safe iteration | ✅ complete |
| M1 Honesty | No misrepresentation | ✅ complete |
| M2 Access control (client) | Data rights | ✅ complete |
| M2.5 Conversation UX | Counter-ready transcript | ✅ complete |
| **M3 Deploy** | **Ship the static SPA** | **⬜ NEXT — deployable now** |
| M4 Real model + E2E | ML quality + safety net | ⬜ |
| M5 Backend & sync | Real accounts | 🔒 needs D-1/D-2 |
| M6 Roadmap | Differentiators | ⬜ |

---

## M0 — Foundation ✅ COMPLETE

| # | Task | PRD | Evidence |
|---|---|---|---|
| 0.1 | Vitest + classifier unit suite (19 tests) | F-34 | `npm test` green; `src/lib/aslClassifier.test.ts` |
| 0.2 | Route code-splitting (all 14 pages lazy) | F-32 | entry 660→81 KB gzip |
| 0.3 | MediaPipe isolated to Workspace chunk | F-32 | no model fetch on Landing |
| 0.4 | Self-hosted fonts; CDN links removed | F-30 | zero external font requests |
| 0.5 | Strict CSP (meta tag) | F-29 | detector runs under `wasm-unsafe-eval` |
| 0.6 | GitHub Actions CI + bundle-budget gate | F-34 | `.github/workflows/ci.yml` |

## M1 — Honesty ✅ COMPLETE

| # | Task | PRD | Evidence |
|---|---|---|---|
| 1.1 | ISL/BSL gated "coming soon"; fake versions removed | F-8 | `languages.ts` `available:false` |
| 1.2 | Real sign-out (wipes storage + state) | F-13 | `signOut()` removes key + resets |
| 1.3 | Reduce Motion functional (CSS + MotionConfig + OS pref) | F-22 | root class + `AccessibilityEffects` |
| 1.4 | High Contrast functional, surfaced in Settings | F-23 | token overrides |
| 1.5 | Accuracy disclosure (weak letters, no J/Z) | F-5 | Workspace info popover |
| 1.6 | Mic disabled; Text→Sign gated; fake messages removed | F-9/F-10 | controls disabled |

## M2 — Access control (client) ✅ COMPLETE

| # | Task | PRD | Evidence |
|---|---|---|---|
| 2.1 | Client session + `signIn()` seam + onboarding tracking | F-11(seam) | `AppDataContext.session` |
| 2.2 | RequireAuth guards + `?redirect=` + onboarding guard | F-12 | `/dashboard`→`/auth?redirect=` |
| 2.3 | Export My Data (JSON) | F-19 | `exportData()` |
| 2.4 | Delete Account (confirm + wipe + sign out) | F-19 | storage null after |
| 2.5 | First-run consent banner | F-19 | `ConsentBanner.tsx` |

---

## M2.5 — Conversation UX (counter-ready) ✅ COMPLETE

> Client-side product features from `IDEAS.md` that make the transcript usable in
> a real counter interaction. **No backend, no ML retraining** — can ship before
> or alongside M3 deploy. Built via 3 parallel subagents (file-disjoint modules)
> + a single `Workspace.tsx` integration pass.
>
> **Verification scope (honest):** `tsc -b` + `vite build` green, 53 unit tests
> pass (pure logic: `predict`, `buildTranscriptText`, `lowLightFilter`,
> `edgeRisk`), entry chunk 200,323 B gzip (under 204,800 budget), no MediaPipe
> leak. The `Workspace.tsx`/`useSignDetector` wiring is **typechecked but not
> runtime-verified** — a manual camera + interaction pass is still owed (jsdom
> can't mount `getUserMedia`/WASM). Rows below are ✅ *built & integrated*, not
> ✅ *behaviorally confirmed*.

| # | Task | PRD | Definition of done | Status |
|---|---|---|---|---|
| 2.5.1 | Word auto-complete/prediction (top-3 chips, Phrasebook-weighted) | F-41 | pure `predict()` unit-tested; chip tap replaces word buffer | ✅ `lib/wordPredict.ts` (8 tests) + `PredictionChips`; `pickWord()` in Workspace |
| 2.5.2 | Counter Mode full-screen transcript (48px+, high-contrast) | F-42 | toggle from Workspace; `Esc`/tap exits; reduce-motion honored | ✅ `CounterMode.tsx`; "Staff" button in transcript header |
| 2.5.3 | Quick phrase shortcuts bar (default set + saved Phrasebook) | F-43 | one tap appends phrase to transcript + history | ✅ `QuickPhraseBar.tsx` + `constants/phrases.ts`; `insertPhrase()` |
| 2.5.4 | Undo last word (word-level stack) | F-44 | pops last word from transcript + history | ✅ `UndoButton.tsx`; `wordStackRef` + `undoLastWord()` (`addHistoryEntry` now returns id) |
| 2.5.5 | Confidence heatmap overlay (Settings toggle, off by default) | F-45 | canvas dots colored by confidence; respects high-contrast | ✅ `lib/heatmap.ts` (edge-risk coloring) in `drawOverlay`; Settings toggle |
| 2.5.6 | Session summary export (`.txt` / share) | F-46 | downloads current session transcript as text | ✅ `lib/sessionExport.ts` (5 tests) + `ExportButton` |
| 2.5.7 | Low-light preprocessing (Settings toggle, off by default) | F-47 | brightened canvas feeds detector; fps within F-6 budget | ✅ `lib/lowLight.ts` (4 tests) + `frameSource` seam in `useSignDetector`; Settings toggle |

**M2.5 exit criteria:** code-complete & integrated (compiles, pure logic
unit-tested, wiring typechecked). Intended outcome — a counter-usable transcript
(predictable input, readable at arm's length, one-tap phrases, single-word undo)
— is **pending a manual camera/interaction pass** before it can be marked
behaviorally met.

> **Follow-up (non-blocking):** transcript entry `id` uses `Date.now()`; two
> inserts in the same millisecond (likelier now with one-tap quick-phrase /
> prediction) would collide, tripping a React key warning and making `undoLastWord`
> remove both rows. History ids already use `Date.now() + random`; give transcript
> ids the same treatment when convenient.

---

## M3 — Deploy the static SPA ⬜ NEXT (no blockers)

> The product is honest and local-first today. This milestone puts it on the
> internet. **No backend required.**

| # | Task | PRD | Definition of done | Status |
|---|---|---|---|---|
| 3.1 | Add `vercel.json` (rewrites + CSP header + cache headers) | F-30/F-33 | file at repo root per [`TDD.md` §9.1](./TDD.md#91-verceljson-add-at-repo-root--not-present-yet) | ✅ `vercel.json` added at repo root |
| 3.2 | Delete CSP `<meta>` tag from `index.html` | F-30 | CSP only in header; no drift | ✅ meta tag removed; build verified (81.14 KB gzip entry, unchanged) |
| 3.3 | Connect repo to Vercel (Vite preset, Node 22) | F-33 | build `npm run build`, output `dist` | ⬜ _local build verified green: `dist` in 1.7s, entry 200,282 B gzip (under 204,800 budget), no MediaPipe leak. TODO: paste production URL + first deploy id._ |
| 3.4 | Verify SPA deep-link rewrite | F-33 | refresh `/workspace` → 200 | ⬜ _TODO: hard-refresh `<preview-url>/workspace` → paste HTTP status (expect 200)._ |
| 3.5 | Verify immutable caching on `/wasm` `/models` | F-33 | `Cache-Control: …immutable` | ⬜ _TODO: paste `Cache-Control` response header for a `/wasm` (or `/models`) asset (expect `public, max-age=31536000, immutable`)._ |
| 3.6 | Run deployment sanity checklist (below) on preview URL | — | all boxes checked | ⬜ _TODO: tick every box in the checklist below; note any CSP console violation + fix before promoting._ |
| 3.7 | Confirm rollback path (promote previous deploy) | F-39 | documented + tested once | ⬜ _TODO: Vercel → Deployments → Promote previous → paste promoted deploy id + confirm app served the older build._ |
| 3.8 | Add OSS licenses/attribution page (MediaPipe Apache-2.0 + upstream) | F-40 | in-app route/section | ✅ `/licenses` route (`src/pages/Licenses.tsx`), linked from About; MediaPipe + VAKULABHUSHAN/sign-language credited; full dependency table with real license fields |

### M3 deployment sanity checklist (run on the Vercel preview URL)
- [ ] `/` loads; Sora headline renders; **zero** console CSP violations
- [ ] Refresh `/workspace` directly → 200 (rewrite works)
- [ ] Unauthenticated `/dashboard` → `/auth?redirect=%2Fdashboard`
- [ ] Workspace: camera prompt → "Live Studio" badge (WASM served `application/wasm`)
- [ ] Network tab: **zero** third-party requests; `/wasm` `/models` `Cache-Control: immutable`
- [ ] Consent banner once; Export downloads JSON; Delete wipes + signs out
- [ ] Lighthouse `/`: LCP ≤2.5 s, CLS ≤0.1

**M3 exit criteria:** static SPA live on a public URL, privacy verified in the
network tab, deep links + rollback working, licenses page shipped.

---

## M4 — Real model + E2E safety net ⬜

| # | Task | PRD | Definition of done | Status |
|---|---|---|---|---|
| 4.1 | Train gesture recognizer (Model Maker, Kaggle ASL Alphabet) | F-2 | `asl-fingerspelling-v1.task` produced | 🔶 notebook authored (`docs/training/train_asl_gesture_model.ipynb`); actual run needs your Kaggle token + Colab GPU (D-3) |
| 4.2 | Publish per-class confusion matrix; meet floors | F-2 | ≥95% reliable / ≥85% weak / none <80% | ⬜ |
| 4.3 | Swap `classifyASL()` → `GestureRecognizer` in `useSignDetector` | F-2 | trained model primary; heuristic = flagged fallback | ⬜ |
| 4.4 | Versioned model artifact; version/hash surfaced in-app | F-37 | new filename on update; shown in UI | ⬜ |
| 4.5 | Detection loop fps cap (15–20) + `visibilitychange` pause | F-6 | measured cap; loop suspends when hidden | ✅ capped 18fps via `frameIsDue()` gate; rAF loop fully cancelled/restarted on `visibilitychange` (not just skipped); unit-tested (`useSignDetector.test.ts`) |
| 4.6 | Playwright config + fake-camera y4m "B" fixture | F-35 | Chromium `--use-file-for-fake-video-capture` | ⬜ |
| 4.7 | E2E: detection flow asserts badge + transcript | F-35 | passes in CI | ⬜ |
| 4.8 | E2E: onboarding→workspace journey + guard redirect + camera-denied | F-35 | passes in CI | ⬜ |
| 4.9 | Visual regression snapshots (both themes) | F-35 | pixel-diff gate in CI | ⬜ |
| 4.10 | Update accuracy disclosure if weak-letter set changes | F-5 | popover matches new matrix | ⬜ |

**M4 exit criteria:** trained model beats heuristic by ≥15 pts, floors met, the
detection flow is regression-tested end-to-end, fps capped.

---

## M5 — Backend & sync 🔒 (decide D-1/D-2 first)

| # | Task | PRD | Definition of done | Status |
|---|---|---|---|---|
| 5.1 | Pick auth provider + DB/host | — | D-1, D-2 resolved | 🔒 |
| 5.2 | Managed auth into `signIn()` seam (tokens, hashing) | F-11 | provider session replaces local; httpOnly | ⬜ |
| 5.3 | `/api` functions + Postgres (profile/history/phrasebook/reports) | F-16/F-18 | contract in [`TDD.md` §7.2](./TDD.md#72-proposed-api-contract) | ⬜ |
| 5.4 | zod schema + versioned localStorage migration (`v1`→`v2`) | F-14 | validate/migrate on load; safe reset | ⬜ |
| 5.5 | Debounced persistence writes | — | no per-keystroke `setItem` | ⬜ |
| 5.6 | Cross-device sync (optimistic + rollback) | F-16 | history/phrasebook round-trip API | ⬜ |
| 5.7 | Real Analytics latency/engagement metrics | F-17 | "Avg. latency" no longer stubbed | ⬜ |
| 5.8 | Error-report ingestion (persist text + minimal context, no frames) | F-18 | `POST /api/reports` | ⬜ |
| 5.9 | Server-side GDPR: export + delete purge server copies | F-19 | account delete purges DB | ⬜ |
| 5.10 | Sentry + privacy-safe analytics, `localOnly`/consent-gated | F-38 | never captures frames/landmarks/text | ⬜ |
| 5.11 | Update `Permissions-Policy` / CSP if provider needs it | F-30 | still no third-party frame egress | ⬜ |

**M5 exit criteria:** real accounts; data survives device loss; server honors
GDPR; telemetry provably free of detection data.

---

## M6 — Roadmap ⬜

| # | Task | PRD |
|---|---|---|
| 6.1 | J/Z temporal model (landmark sequence over N frames) | F-7 |
| 6.2 | Text→Sign fingerspelling avatar (un-gate when real) | F-10 |
| 6.3 | Web Speech API mic → transcript | F-9 |
| 6.4 | PWA: manifest + SW caching WASM/model for offline | F-36 |
| 6.5 | ISL/BSL models (flip `available:true`) | F-8 |
| 6.6 | WCAG 2.1 AA formal audit + statement (axe in CI + manual) | F-20/F-21 |
| 6.7 | Full form validation + error boundary + skeletons | F-27/F-28 |
| 6.8 | Keyboard/focus-trap pass; mobile Workspace + nav overflow | F-24/F-25/F-26 |

---

## Cross-cutting invariants (never regress)

1. **No frame egress** — CSP `connect-src 'self'` stays locked; telemetry must be provably free of detection data.
2. **Entry chunk ≤200 KB gzip** — CI gate; MediaPipe never re-enters the entry chunk.
3. **Honest UI** — unavailable languages, mic, and Text→Sign stay visibly gated until real.
4. **Model limitations disclosed** — accuracy popover ships every release; update when the model changes.
5. **localStorage key versioned** (`signbridge.appData.v1`) — never change shape without a migration path.
6. **Sentry CSP** — if `VITE_SENTRY_DSN` telemetry is enabled, `connect-src` in `vercel.json` must also allow the operator's Sentry ingest domain (e.g. `https://oXXXXXX.ingest.<region>.sentry.io`). Add it manually when enabling Sentry — vercel.json's schema rejects unknown top-level keys, so this can't live as a note field in that file.
6. **Immutable-cached assets get new filenames** — never overwrite `/wasm` or `/models` in place.

---

## Risk register

| Risk | Impact | Mitigation | Milestone |
|---|---|---|---|
| CSP meta vs header drift | policy silently weaker | delete meta when header lands (3.2) | M3 |
| Immutable model updated in place | users stuck a year on old model | version filenames (4.4) | M4 |
| localStorage shape change w/o migration | user data dropped | zod + versioned migration (5.4) | M5 |
| Heuristic classifier oversold | trust damage | disclosure shipped; replace at M4 | M4 |
| Unthrottled rAF on low-end | battery/jank | fps cap + visibility pause (4.5) | M4 |
| Later telemetry captures detection data | breaks privacy pillar | scrub + consent + `localOnly` kill-switch (5.10) | M5 |
| E2E gap: detection verified manually only | regressions ship | Playwright fake-camera (4.6–4.8) | M4 |

---

## Runbook (once on Vercel)

- **Deploy:** merge to `main` → production. PRs → preview URLs.
- **Verify:** run the M3 sanity checklist on every production deploy.
- **Rollback:** Vercel → Deployments → promote previous. Model rollback = revert the model-file commit (independent of app rollback by design).
- **CI gate:** lint → unit tests → typecheck+build → entry-chunk ≤200 KB gzip + MediaPipe-leak check. Red gate blocks merge; do not bypass.
- **Local commands:** `npm run dev` · `npm test` · `npm run lint` · `npm run build` · `npm run preview`.

---

## Immediate next actions (start M3)

1. **3.1** — create `vercel.json` at repo root (copy from [`TDD.md` §9.1](./TDD.md#91-verceljson-add-at-repo-root--not-present-yet)).
2. **3.2** — remove the CSP `<meta>` tag from `index.html`.
3. **3.3** — connect the repo on vercel.com, deploy a preview.
4. **3.6** — run the sanity checklist; fix any CSP violation before promoting.
5. **3.8** — add the OSS licenses/attribution page.

Then decide **D-3** (training data) to unblock M4, and **D-1/D-2** (auth + DB) to unblock M5.
