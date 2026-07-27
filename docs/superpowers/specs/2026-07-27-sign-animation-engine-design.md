# Sign-Animation Engine — Design Spec

**Date:** 2026-07-27
**Status:** Approved, ready for implementation planning

## Problem

The Workspace's "Text → Sign" mode is a disabled stub today: a "Soon" badge, a disabled composer, and `Avatar3D` rendering nothing but an idle, static VRM model. `Avatar3D` itself has no animation system at all — it only loads, frames, and lets the user orbit/zoom a single VRM file (`public/avatar/malesign.vrm`). There is no pose or animation data anywhere in the repo.

Two draft implementation plans already exist in `docs/superpowers/plans/` (`2026-07-26-text-to-sign-avatar-animation.md`, `2026-07-27-text-to-sign-redesign.md`), both written without a preceding design spec, and they define incompatible integration surfaces for `Avatar3D` (a `sequence` prop driven by real pose data vs. an `isAnimating` boolean driven by a fake `setTimeout`). Neither should be treated as approved.

This spec covers **only the sign-animation engine** — the plumbing that turns typed text into avatar movement. It intentionally does not cover the Text → Sign visual/UX redesign (staging layout, input component, lighting/camera reactions); that is a separate follow-up design, planned to start once this engine's real interface exists. It also does not cover authoring the actual letter/phrase pose content — that is content work the project owner will do in a later session using the tool this spec produces.

No free, ready-to-use ASL fingerspelling animation source exists to import. The two real 3D sign-language research datasets found during investigation (SignAvatars, ECCV 2024; 3D-LEX v1.0) are in SMPL-X body-mesh format, not VRM humanoid rigs, and would require an uncertain-license, high-effort retargeting pipeline disproportionate to this project. Mixamo has no sign-language content at all — only generic body actions. Hand-authoring poses directly on this VRM rig is the only viable near-term path.

## Decision

Build a small, self-contained engine with four pieces, requiring **zero new dependencies**:

1. **`resolveText(text, manifest)`** — a pure function (no React/Three dependency) that resolves typed text into an ordered list of clip keys: whole-phrase lookup first (case-insensitive), then per-character fingerspelling fallback, skipping spaces/digits/punctuation. Returns `[]` when nothing in the text matches the manifest.
2. **A custom JSON keyframe clip format built on `@pixiv/three-vrm`'s own `VRMPose` type** — not the standard `.vrma` file format. `@pixiv/three-vrm-animation` is a *loader*, not an exporter; writing real `.vrma` files would require hand-building a custom glTF exporter that injects the `VRMC_vrm_animation` extension — real spec-conformance risk for no payoff, since nothing outside this app needs to open these clips in another tool. Instead, `@pixiv/three-vrm`'s `VRMHumanoid` already exposes `getNormalizedPose(): VRMPose` / `setNormalizedPose(pose: VRMPose): void` — `VRMPose` is a plain, JSON-serializable `Record<boneName, { rotation: [x,y,z,w] }>` (quaternion, position omitted — irrelevant for hand/arm signing). A clip is just an ordered list of `VRMPose` snapshots with timestamps; playback interpolates (slerps) each bone's quaternion between the two surrounding keyframes and calls `setNormalizedPose()` every frame. This is genuinely interpolated, uses only what's already installed, and needs no hand-built `AnimationClip`/`AnimationMixer` plumbing.
3. **`useSignPlayer(vrm, manifest)`** — a hook that steps through a resolved sequence of clips, slerping between each clip's keyframe poses and calling `setNormalizedPose()` every frame (short crossfade between clips), exposing `{ state: 'idle' | 'playing' | 'done', play(clipKeys), stop() }`. The pose-interpolation math itself (`lerpPose(a, b, t)`) is a pure function independent of Three/React, so it's unit-testable without a live VRM or Canvas.
4. **A dev-only Pose Editor** (`/dev/pose-editor`) for hand-authoring clips via bone-rotation sliders, reusing the same VRM-loading logic as `Avatar3D`.

Content ships **empty** in this pass — the manifest has no clips. The engine must behave correctly with zero, or only partially, authored content (see Fallback Behavior below).

Scoped to **ASL only** for now. The app's language switcher already has ISL/BSL marked "Soon" with no shipped detection model; extending the manifest to other languages later is additive (a language key), not a redesign.

### Architecture & data flow

```
resolveText(text: string, manifest): string[]     ← pure, unit-testable, no Canvas dependency
                    │
                    ▼
useSignPlayer(vrm, manifest)                       ← lives INSIDE <Canvas> (needs useFrame)
        { state: 'idle'|'playing'|'done', play(clipKeys), stop() }
                    │
                    ▼
Avatar3D  (rendering component, inside Canvas)
        props: playRequest?: { text: string; id: number } | null
               onPlaybackStateChange?: (state) => void
```

`useSignPlayer` must call `useFrame` every frame to step the `AnimationMixer`, and `useFrame` only works inside the `<Canvas>` tree — so the frame-stepping loop necessarily lives inside `Avatar3D`'s internal `VRMAvatar` component, not in `Workspace.tsx`. What stays decoupled: `resolveText` is a plain importable function with no Three/React dependency, and `useVRMAvatar`/`useSignPlayer` are hooks independent of `Avatar3D` itself, so the Pose Editor's own `<Canvas>` can reuse them without touching `Avatar3D`.

`Avatar3D`'s two new props are additive and optional — with no `playRequest` passed (as in all current usages), it behaves exactly as it does today.

### Data model

```ts
// src/data/signs/<key>.json
import type { VRMPose } from '@pixiv/three-vrm';

interface SignKeyframe {
  time: number;        // seconds from clip start
  pose: VRMPose;       // from humanoid.getNormalizedPose() — rotation-only quaternions
}

interface SignClip {
  duration: number;                 // seconds
  keyframes: SignKeyframe[];        // 1 keyframe = static held pose; 2+ = motion (J, Z, phrases)
}

type SignManifest = Record<string, SignClip>;         // key = 'A'..'Z' or a phrase like 'hello'
```

- Clip files live at `src/data/signs/<KEY>.json`, one per letter/phrase, loaded via static `import` (Vite bundles JSON natively).
- `src/data/signManifest.ts` imports and re-exports every clip file as one `SignManifest`. Adding new content later is: drop a JSON file, add one import line — no engine changes.

### Components & hooks

- **`useVRMAvatar(path, controlsRef?)`** — the existing box-centering/camera-framing logic in today's `Avatar3D`/`VRMAvatar`, extracted unchanged so `PoseEditor` can reuse it. Returns `{ vrm, scene }`.
- **`useSignPlayer(vrm, manifest)`** — each frame (via `useFrame`), advances through the resolved clip sequence, slerps each bone's quaternion between the current clip's surrounding keyframe poses, and calls `vrm.humanoid.setNormalizedPose(pose)` followed by `vrm.update(delta)` (mandatory — with `autoUpdateHumanBones` true by default, the raw skeleton driving the skinned mesh only updates inside `vrm.update()`; skipping it means poses apply with no error and no visible movement). `play(clipKeys)` queues clips back-to-back (~150ms crossfade between them), setting `state: 'playing'` then `'done'` after the last clip. A clip key with no manifest entry is skipped silently within the sequence; an entirely empty resolved sequence makes `play()` a no-op and `state` stays `'idle'`.
- **`Avatar3D`** — adds `playRequest?: { text: string; id: number } | null` and `onPlaybackStateChange?: (state) => void`. Internally calls `resolveText` + `useSignPlayer`, keyed on `id` so resubmitting identical text still retriggers playback. All existing behavior (orbit controls, reset view, theme-synced background) is unchanged.

### Pose Editor (dev-only authoring tool)

- Route `/dev/pose-editor`, registered only under `import.meta.env.DEV` — absent from the production bundle, not just hidden.
- Own `<Canvas>`, reusing `useVRMAvatar` directly (no duplicated VRM-loading code).
- Workflow: pick a target key → adjust `BoneSlider`s (grouped by region — fingers/hand, arm, shoulder, spine — using VRM humanoid bone names) → "Add keyframe" (captures current slider values + a time offset) → repeat for motion signs → "Preview" plays the in-progress clip through `useSignPlayer` in the editor itself → "Export" downloads the `SignClip` as JSON, to be dropped into `src/data/signs/` with one manifest import line added by hand.
- No server-side save step — local file download only, matching that content authoring happens in a separate session.

### Fallback behavior

- Empty manifest (no clips authored yet) → `resolveText` returns `[]` for any input → `play()` no-ops → `Avatar3D` stays idle. Nothing gets stuck in a "processing" state.
- Partially-authored manifest → unresolvable characters are skipped mid-sequence; the avatar signs whatever it can.
- `playRequest` changes before the VRM has finished loading → `useSignPlayer` ignores the request; deciding whether to disable input until `vrm` is ready is left to the future redesign's UI layer.

### Testing

- `resolveText()`: unit tests covering phrase-first lookup, letter fallback, unresolvable/empty input, mixed case, punctuation/digit skipping, and an empty manifest.
- `lerpPose(a, b, t)`: pure function, unit-testable without a live VRM or Canvas — covers t=0 (returns a), t=1 (returns b), t=0.5 (slerped midpoint), and bones present in only one of the two poses.
- `useSignPlayer`: a lightweight test asserting `play([])` and `play()` with all-missing keys leave `state` at `'idle'`. No React Three Fiber rendering test — consistent with `Avatar3D` itself having no existing test file.

## Out of scope

- The Text → Sign visual/UX redesign (staging layout, hero avatar sizing, input component, lighting/camera reactions, mode cross-fade transitions) — separate follow-up design, to be brainstormed once this engine's real interface (`playRequest`/`onPlaybackStateChange`, real clip durations) exists to design against.
- Authoring the actual letter/phrase pose content — deferred to a later session using the Pose Editor this spec produces.
- Multi-language (ISL/BSL) sign content or manifest structure — ASL only for now.
- Real `.vrma` file export/import, or any external sign-language dataset retargeting (SignAvatars, 3D-LEX, Mixamo) — investigated and rejected for this pass; see Problem/Decision above.
- Non-manual ASL markers (facial expression, mouth morphemes) — this engine only drives body/hand bone rotation.

## Two existing draft plans are superseded

`docs/superpowers/plans/2026-07-26-text-to-sign-avatar-animation.md` and `docs/superpowers/plans/2026-07-27-text-to-sign-redesign.md` were written without this spec and conflict with it (`sequence` prop vs. `isAnimating` boolean; VRMPose snapshots vs. this spec's JSON keyframe clips; real `.vrma` export vs. this spec's decision against it). Both should be treated as superseded once an implementation plan is generated from this spec.
