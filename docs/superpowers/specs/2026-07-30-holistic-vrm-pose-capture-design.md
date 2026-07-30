# Live Webcam → VRM Pose Capture (Mapping Slice) — Design Spec

**Date:** 2026-07-30
**Status:** Approved, ready for implementation planning

## Problem

Every sign pose the avatar currently knows (`src/data/fingerspelling.ts`, via the sign-animation engine from `docs/superpowers/specs/2026-07-27-sign-animation-engine-design.md`) is hand-authored: someone drags Euler-angle sliders in `/dev/pose-editor` per bone until it looks right. This is slow and error-prone — the previous session spent significant effort tracking down and fixing an inverted right-hand palm orientation that hand-tuning had gotten wrong, only caught by measuring bone math (world palm normals via a curled-finger ground-truth test), not by eyeballing the render.

The goal is a faster, more accurate authoring path: capture a real person's pose live from a webcam via MediaPipe Holistic, map it onto the VRM humanoid rig automatically, and (in a later pass) record it into the same clip format the sign-animation engine already plays back.

## Decision

Build the **capture + mapping + visual verification** slice only. Recording, pose-library persistence, and playback/selection UI are a deferred follow-up spec, unblocked once this mapping is visually and numerically confirmed correct on real poses (arm raised, hand open, etc.) — mirroring how the sign-animation engine itself was hand-content-authored only after its plumbing was proven.

### Why this scope cut

The full original ask (capture, mapping, recording, a pose library with localStorage + import/export, playback, debug view) bundles a well-understood problem (recording/playback — the sign-animation engine already has working playback machinery in `useSignPlayer`) with the one genuinely uncertain problem (does the live mapping actually produce correct rotations on this specific rig). Building recording/persistence on top of an unverified mapping risks repeating last session's bug, but continuously and across many poses instead of one static hand. The debug/QA view is **not** deferred with the rest, because it's the instrument the verification checkpoint depends on — without it there's no way to confirm the mapping beyond guessing from the render, which is exactly what went wrong last time.

### Library choice: `@mediapipe/holistic` + `kalidokit`

The project already uses `@mediapipe/tasks-vision` (`HandLandmarker`/`GestureRecognizer`, in `useSignDetector.ts`) for the opposite direction — classifying what letter the *user* is signing. `@mediapipe/holistic` is a separate, legacy/maintenance-mode package, chosen deliberately here over reusing `tasks-vision`'s separate `PoseLandmarker`+`HandLandmarker` because Holistic's pose and hand landmarks come from one integrated pipeline with guaranteed alignment at the wrist, rather than two independently-run models that would need to be stitched together.

`kalidokit` (MIT-licensed) is a small library purpose-built for `@mediapipe/holistic` output → VRM-style bone rotations, already used in browser VTuber apps. It's adopted here specifically because it already solves swing **and** twist/roll disambiguation for arms and hands — the exact class of problem (palm orientation / forearm roll) that caused last session's bug. Re-deriving that math by hand for continuous, per-frame capture (rather than one static hand-tuned pose) carries real first-pass risk that a hand-rolled `setFromUnitVectors`-per-bone approach (swing only, no twist) would not adequately cover. Its coupling to `three-vrm` is loose: it emits plain per-bone rotations that get adapted into our own `VRMPose` shape, not direct manipulation of `three-vrm` internals — so it doesn't lock us to a specific `@pixiv/three-vrm` version.

**Handedness/mirroring:** the avatar mirrors the user (avatar's right hand = user's right hand), matching how signing avatars are normally captured — you're directing a performer who reproduces your actual anatomy, not producing a flipped image. Legacy Holistic labels `leftHandLandmarks`/`rightHandLandmarks` by body side in the *unmirrored* image, so combined with this mirroring decision, the hand assignment is easy to get backwards on the first pass. The mapping code applies an explicit, commented flip, but gets verified empirically against the landmark overlay during the visual checkpoint — not just reasoned about on paper.

### Architecture & data flow

```
useHolisticCapture(videoRef)                         ← owns Camera + Holistic instances, fps-capped
        { poseLandmarks, poseWorldLandmarks, leftHandLandmarks, rightHandLandmarks }
                    │
                    ▼
holisticToVRMPose(results, vrm): VRMPose              ← pure-ish; wraps kalidokit Pose.solve/Hand.solve,
                    │                                    applies mirror flip, adapts to VRMPose shape
                    ▼
PoseCapture page (dev-only, /dev/pose-capture)
        - applies pose via vrm.humanoid.setNormalizedPose() + vrm.update() each frame
        - renders debug overlay + bone-axis helpers + numeric readout
```

`holisticToVRMPose`'s output is the same `VRMPose` type (`Record<boneName, {rotation:[x,y,z,w]}>`) that `SignClip`/`useSignPlayer` already consume (`src/data/signManifest.ts`). This is what makes the later recorder a thin wrapper: it just snapshots whatever this function already produces on a `requestAnimationFrame` tick, exactly like `PoseEditor` already snapshots slider-driven `VRMPose`s into keyframes.

### New/changed files

- **`src/hooks/useHolisticCapture.ts`** — owns the webcam `<video>` element and the `Holistic` + `Camera` instances (mirrors `useSignDetector`'s fps-gate pattern via `frameIsDue`). No VRM/Three knowledge — landmarks in via MediaPipe callback, landmarks out via a callback prop.
- **`src/lib/holisticToVRMPose.ts`** — pure function `holisticToVRMPose(results, vrm): VRMPose`, wrapping `kalidokit`. Unit-testable with synthetic landmark fixtures (arms down, arm raised, hand open/closed) without a live camera or WebGL, same pattern as `lerpPose.test.ts`.
- **`src/pages/PoseCapture.tsx`** — dev-only harness page, registered as `/dev/pose-capture` in `App.tsx` behind the same `import.meta.env.DEV` lazy-route gate as `PoseSpike`/`PoseEditor` (absent from the production bundle). Reuses `useVRMAvatar('/avatar/malesign.vrm')` for VRM loading/framing, matching every other avatar surface in the app.
- **`public/mediapipe/holistic/`** (new) — Holistic's model/WASM assets self-hosted here, the same way `tasks-vision`'s assets are already self-hosted under `/public/wasm` and `/public/models` for `useSignDetector`, rather than pulled from a CDN via `locateFile`. Avoids a runtime dependency on a third-party CDN being reachable.

### Debug/QA view (minimal, non-deferred)

- **2D landmark overlay** — canvas drawn over the `<video>`, plotting pose + both hands' landmarks each frame. Confirms Holistic is tracking what's expected, independent of any VRM mapping.
- **Bone-axis helpers** — `THREE.AxesHelper` attached to the bones the mapping drives (upper arm, lower arm, hand, per-finger segments), toggleable. Rotations get inspected as axes in the 3D scene, not eyeballed from render shading — same principle as last session's move away from trusting the raw WebGL render.
- **Numeric readout** — palm normal and hand long-axis vectors printed as text, reusing the curled-finger ground-truth check from last session, so the visual checkpoint has numbers to confirm against, not just a screenshot.

### Coordinate/data limitations (bounding expectations)

Legacy Holistic gives pose landmarks in both normalized-image and metric world (`poseWorldLandmarks`) coordinates, but hand landmarks (`leftHandLandmarks`/`rightHandLandmarks`) **only** in normalized image coordinates — there is no metric/world variant for hands. Kalidokit's hand solving is built around this (finger curl uses relative hand-local geometry, which doesn't need absolute depth), so finger shapes should stay reliable; absolute hand position/depth and forearm roll — stitched from pose-world plus hand-normalized data — are the fragile parts. This is exactly what the debug view exists to catch early.

### Known integration risk

`@mediapipe/holistic` is in maintenance mode and has known ESM/Vite bundling friction (historically distributed as a UMD/global-style script loaded via CDN `locateFile` rather than a clean ES module). The implementation plan needs an explicit early step to verify it loads and runs through Vite's dev server and production build before any mapping work is built on top of it, with a fallback noted if it doesn't (e.g. self-hosted script-tag loading instead of a bundled import).

No calibration/T-pose step is planned — kalidokit computes rotations directly from landmark geometry per frame, not from a per-session calibration capture.

### Testing

- `holisticToVRMPose`: unit tests with synthetic landmark fixtures covering a few canonical poses (arms down/rest, one arm raised, hand open, hand closed) — pure function, no live camera or WebGL needed.
- No test for `useHolisticCapture` itself (camera/WASM-dependent), consistent with `Avatar3D` and `useSignDetector`'s live-pipeline code having no test file.

## Out of scope (deferred to a follow-up spec)

- Recording: start/stop capture into a keyframe array tied to a label.
- Pose-library persistence: localStorage-backed library, JSON file export/import.
- Playback/selection UI for recorded clips (distinct from `useSignPlayer`, which already plays hand-authored clips and will very likely be reused as-is).
- Any UI for browsing, renaming, or deleting recorded poses.
- Multi-language (ISL/BSL) capture — ASL only, consistent with the sign-animation engine's existing scope.
