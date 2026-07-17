# SignBridge — Product Requirements Document (PRD)

> **Version:** 1.0 (standalone) · **Status:** Active · **Last updated:** 2026-07-16
> **Product:** SignBridge — privacy-first, browser-native sign-language translator
> **Companion docs:** [`TDD.md`](./TDD.md) (technical design) · [`MIGRATION_TRACKER.md`](./MIGRATION_TRACKER.md) (execution to deployment)

---

## 1. Vision & Problem

Deaf and hard-of-hearing (HoH) people navigate a hearing-default world where
everyday interactions — a ticket counter, a clinic, a coffee order — require an
interpreter who is rarely present. Existing translation apps upload camera video
to the cloud, which is both a privacy risk and unusable offline.

**SignBridge** translates sign language to text (and, later, text to sign)
**entirely in the browser**. Camera frames never leave the device. It is fast,
free to start, works offline after first load, and is honest about what it can
and cannot do.

**One-line pitch:** *Real-time sign-language translation that runs on your
device and never uploads your camera.*

---

## 2. Goals & Non-Goals

### Goals (v1.0)
- **G1** — Ship a trustworthy **ASL fingerspelling → text** experience with a
  trained model and published accuracy.
- **G2** — Be **honest**: never present a mocked/unavailable capability as working.
- **G3** — Be **accessible**: meet WCAG 2.1 AA for a deaf/HoH-first audience.
- **G4** — Be **private by construction**: no frame/landmark egress, enforced by CSP + CI.
- **G5** — Ship **real accounts** (auth, cross-device sync, data export/delete).
- **G6** — Be **deployable and operable**: CDN hosting, CI gate, rollback, observability.

### Non-Goals (v1.0 — explicitly deferred)
- **NG1** — Full lexical (word-level) sign translation. v1.0 is fingerspelling-first.
- **NG2** — ISL and BSL detection. Gated "coming soon" until models exist.
- **NG3** — Speech-to-sign / mic input. Control stays disabled until built.
- **NG4** — Text-to-sign signing avatar. Placeholder stays gated until built.
- **NG5** — Native mobile apps. Web (responsive PWA) only.

---

## 3. Target Users & Personas

| Persona | Who | Primary need | Key scenario |
|---|---|---|---|
| **Priya — Deaf primary user** | Fluent ASL signer, deaf since birth | Be understood by hearing people without an interpreter | Signs at a pharmacy counter; hearing staff reads the transcript |
| **Marcus — Hearing counterpart** | Family member / clinician / clerk | Read what the signer means; be announced changes via SR | Reads live transcript; screen reader announces new lines |
| **Aisha — Interpreter / learner** | ASL student or working interpreter | Practice fingerspelling, review accuracy, save phrases | Practices letters, checks confidence, saves phrasebook entries |

Design bias: **the deaf/HoH user is the primary audience.** Visual-first,
captions permanent, accessibility is a floor not a feature.

---

## 4. Product Pillars (non-negotiable invariants)

1. **Privacy-first** — camera frames processed on-device, never uploaded by default.
2. **Accessibility-native** — WCAG 2.1 AA is the floor.
3. **Honest AI** — confidence surfaced; limitations disclosed in-product.
4. **Offline-capable** — core translation works with no network after first load.

Any feature that violates a pillar is a launch blocker, not a trade-off.

---

## 5. Features & Requirements

Priority: **P0** = launch blocker · **P1** = credible v1.0 · **P2** = post-launch.

### 5.1 Core translation (the differentiator)

| ID | Requirement | Priority |
|---|---|---|
| F-1 | ASL fingerspelling A–Z detection from webcam, on-device (MediaPipe hand landmarks) | P0 ✅ (heuristic) |
| F-2 | Replace geometric heuristic with a **trained** gesture model; publish per-letter accuracy | P0 |
| F-3 | Per-letter confidence surfaced in UI (color + non-color signal) | P0 ✅ |
| F-4 | Word builder + running transcript with timestamps | P0 ✅ |
| F-5 | In-product disclosure of weak letters (E,S,T,M,N,P,Q) and unsupported motion letters (J,Z) | P0 ✅ |
| F-6 | Detection loop capped (15–20 fps) and paused on tab-hidden / paused | P0 |
| F-7 | J/Z motion-letter recognition via temporal model | P1 |
| F-8 | ISL/BSL gated "coming soon"; no history recorded for unavailable languages | P0 ✅ |
| F-9 | Speech-to-text (mic) → transcript | P2 |
| F-10 | Text-to-sign fingerspelling avatar | P2 |

### 5.2 Accounts, data & sync

| ID | Requirement | Priority |
|---|---|---|
| F-11 | Real authentication (managed provider): signup, login, password reset, session token | P0 |
| F-12 | Route guards: unauthenticated → `/auth?redirect=`; incomplete onboarding → wizard | P0 ✅ |
| F-13 | Sign-out fully clears session + local state | P0 ✅ |
| F-14 | Translation history CRUD (search, filter, save, delete) | P0 ✅ (local) |
| F-15 | Phrasebook add/remove/save; wire up Play/Edit controls (currently dead) | P1 |
| F-16 | Cross-device sync of profile, history, phrasebook | P1 |
| F-17 | Analytics: real latency + engagement metrics (currently stubbed) | P1 |
| F-18 | Error-report submission persisted server-side (text discarded today) | P1 |
| F-19 | GDPR: consent capture, data export, permanent delete (incl. server copies) | P0 (client ✅ / server ⬜) |

### 5.3 Accessibility & UX

| ID | Requirement | Priority |
|---|---|---|
| F-20 | WCAG 2.1 AA color contrast across all routes, both themes | P0 |
| F-21 | `aria-live` announcements for transcript + detection/camera state | P0 |
| F-22 | `prefers-reduced-motion` + app toggle suppress all animation | P0 ✅ |
| F-23 | Functional high-contrast mode, surfaced in Settings | P1 ✅ |
| F-24 | Keyboard operability for all custom widgets (dropdown, modals) + focus traps | P1 |
| F-25 | Focus reset to page heading on route change | P1 |
| F-26 | Responsive Workspace down to 360px; mobile nav exposes all routes | P1 |
| F-27 | Form validation (Auth, Contact, Settings, Onboarding) with field-level errors | P1 |
| F-28 | Global error boundary + loading skeletons for async data | P1 |

### 5.4 Platform, privacy & ops

| ID | Requirement | Priority |
|---|---|---|
| F-29 | No frame/landmark egress — enforced by CSP `connect-src 'self'` + CI check | P0 ✅ (CSP meta) |
| F-30 | Self-hosted fonts; strict CSP as HTTP header | P0 (fonts ✅ / header ⬜) |
| F-31 | Explicit camera-permission rationale + guaranteed track teardown + in-use indicator | P0 |
| F-32 | Entry chunk ≤200 KB gzip; MediaPipe lazy-loaded on `/workspace` only | P0 ✅ (81 KB) |
| F-33 | CDN static hosting with SPA fallback; immutable caching for WASM/model | P0 |
| F-34 | CI: lint + typecheck + unit + build + bundle budget on every PR | P0 ✅ |
| F-35 | E2E: fake-camera detection flow + onboarding/guard journey | P0 |
| F-36 | PWA: manifest + service worker caching app shell + WASM/model for offline | P1 |
| F-37 | Versioned model artifacts; version/hash surfaced in-app | P1 |
| F-38 | Error tracking + privacy-safe analytics, consent/`localOnly`-gated | P1 |
| F-39 | Rollback: app bundle and model independently revertible in minutes | P0 |
| F-40 | Open-source licenses/attribution page (MediaPipe Apache-2.0 + upstream) | P0 |

---

## 6. User Stories (acceptance-oriented)

- **US-1** *As Priya,* I sign "H-E-L-L-O" and see it appear as text within a few
  seconds, with a visible confidence level, so I trust the output.
- **US-2** *As Marcus (screen-reader user),* new transcript lines and camera
  errors are announced aloud, so I don't have to watch the screen.
- **US-3** *As Aisha,* I pick a language and immediately see that ISL/BSL are
  "coming soon," so I'm never misled into practicing an unsupported dialect.
- **US-4** *As any user,* when I sign out, my history and profile are gone from
  this device, so a shared computer doesn't leak my data.
- **US-5** *As a privacy-conscious user,* I can confirm in DevTools that zero
  network requests carry my video, so the privacy promise is verifiable.
- **US-6** *As a returning user,* the Workspace loads and detects offline after
  my first visit, so I'm not blocked without a connection.
- **US-7** *As a data subject,* I can export all my data as JSON and permanently
  delete my account, and the server copy is purged too.

---

## 7. Success Metrics

| Metric | Target (v1.0) |
|---|---|
| Model top-1 accuracy (reliable letters) | ≥95% |
| Model top-1 accuracy (weak-family letters) | ≥85%, none below 80% |
| Detection frame rate | ≥15 fps laptop / ≥10 fps mobile |
| Entry chunk size | ≤200 KB gzip |
| LCP / CLS / INP (Landing, p75 mobile) | ≤2.5 s / ≤0.1 / ≤200 ms |
| WCAG audit | AA pass (axe + manual) |
| Frame egress | 0 bytes (CI-enforced) |
| CI pass rate required to merge | 100% (lint+type+test+build+budget) |

---

## 8. Scope by Milestone (path to deployment)

| Milestone | Theme | Ships |
|---|---|---|
| **M0 — Foundation** ✅ | Safe iteration | CI, unit tests, code-splitting, self-hosted fonts, CSP meta |
| **M1 — Honesty** ✅ | No misrepresentation | Language gating, real sign-out, reduce-motion, high-contrast, disclosure, mic/avatar gated |
| **M2 — Access control** ✅ (client) | Data rights | Client session + seam, guards, export, delete, consent banner |
| **M3 — Deploy** | Ship it | `vercel.json`, CSP header, deploy runbook, rollback verified |
| **M4 — Real model + E2E** | ML quality + safety net | Trained `.task`, accuracy floors, fps cap, Playwright fake-camera E2E, model versioning |
| **M5 — Backend & sync** | Real accounts | Managed auth into `signIn()` seam, `/api` + Postgres, sync, server GDPR, observability |
| **M6 — Roadmap** | Differentiators | J/Z temporal model, signing avatar, mic, PWA/offline, ISL/BSL, WCAG statement, licenses page |

**Deployment can happen at M3** — the product is an honest, local-first,
sign-to-text tool. M4+ raise quality and add accounts.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Heuristic classifier oversold | User trust damage | Confidence flags + disclosure shipped; replace with trained model (M4) |
| Backend scope creep delays launch | Slips deployment | Ship M3 static first; accounts are M5, not a launch blocker |
| Accessibility gaps for primary audience | Product fails its users | AA audit gated in CI; `aria-live` + contrast are P0 |
| Privacy regression via future telemetry | Breaks core pillar | CSP lock + CI egress check + `localOnly` kill-switch |
| Immutable-cached model updated in place | Users stuck on old model | Version model filenames; never overwrite |

---

## 10. Open Decisions

| # | Decision | Owner | Needed by |
|---|---|---|---|
| D-1 | Auth provider: Clerk vs. Auth.js vs. Supabase | Eng lead | M5 start |
| D-2 | DB/host: Vercel Postgres/Neon vs. Supabase | Eng lead | M5 start |
| D-3 | Training data source + license for ASL model | ML owner | M4 start |
| D-4 | Marketing/auth pages permanently dark, or theme-aware? | Design | M3 |

*See [`TDD.md`](./TDD.md) for how each requirement is implemented and
[`MIGRATION_TRACKER.md`](./MIGRATION_TRACKER.md) for task-level status.*
