# Live Webcam → VRM Pose Capture (Mapping Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture a live webcam pose via MediaPipe Holistic, map it onto the `/avatar/malesign.vrm` rig every frame using `kalidokit`, and render it with enough debug instrumentation (2D landmark overlay, bone-axis helpers, numeric palm-normal readout) to visually and numerically confirm the mapping is correct — before any recording/persistence/playback work is built on top of it.

**Architecture:** `useHolisticCapture` owns the MediaPipe Holistic pipeline and emits raw landmark frames; `holisticToVRMPose` is a pure adapter that turns a landmark frame into the same `VRMPose` shape the existing sign-animation engine already consumes; `PoseCapture.tsx` (new dev-only route `/dev/pose-capture`) wires them together inside a `<Canvas>`, alongside debug visualization, reusing `useVRMAvatar` from the existing engine.

**Tech Stack:** React 19, `@react-three/fiber` 9, `@pixiv/three-vrm` 3.5.5, `@mediapipe/holistic` 0.5.x, `kalidokit` 1.1.5, Vite 8, Vitest 4.

## Global Constraints

- Dev-only: the new route and its page chunk must be gated behind `import.meta.env.DEV`, exactly like `/dev/pose-editor` and `/dev/pose-spike` in `src/App.tsx` — absent from the production bundle, not just hidden.
- `@mediapipe/holistic`'s `holistic.js` ships as a Closure Compiler global-attaching script with **no CJS or ESM exports** (verified: no `module.exports`/`exports`/`export` anywhere in the built file) — it cannot be `import`ed as a value. Load it via a dynamically injected `<script>` tag and read `window.Holistic`; use `import type` only for its TypeScript types (erased at compile time, so it never generates a broken runtime `import`).
- Assets self-hosted under `public/mediapipe/holistic/` — the deployed CSP (`vercel.json`, `script-src 'self' ...`) has no third-party script allowance, so CDN loading (the pattern in most Holistic tutorials) is not an option here regardless of preference. This matches how `@mediapipe/tasks-vision` is already self-hosted under `public/wasm`/`public/models`.
- `Holistic.setOptions({ selfieMode: true, ... })` — the avatar mirrors the user (approved design decision), verified empirically in Task 1, not assumed.
- Mapped bones are scoped to arms + both hands' fingers only (`rightUpperArm`/`rightLowerArm`/`rightHand` + 15 finger joints per side, mirrored on the left) — no spine/hips/legs, matching the original request's bone list and keeping this slice focused. `Pose.solve` is called with `enableLegs: false`.
- `holisticToVRMPose` must stay a pure(-ish) function — landmarks + video element in, `VRMPose` out — no internal smoothing state, so it stays unit-testable with synthetic fixtures (matches `lerpPose.test.ts`'s existing pattern).
- No frame-to-frame smoothing in this first pass — `PoseCapture.tsx` applies each computed `VRMPose` directly. Smoothing via the existing `lerpPose` utility (already built for exactly this) is a one-line addition to reach for later *if* Task 4's live verification actually shows jitter — not built speculatively here, because a naive `lerpPose(previousApplied, target, t)` between frames with a *varying* bone set (a hand leaving frame drops all its finger keys from the target pose) makes untracked fingers freeze at their last shape instead of resetting, since `lerpPose` passes through any bone present in only one side unchanged. That failure mode isn't worth the complexity until proven necessary.
- No calibration/T-pose step — kalidokit computes rotations from landmark geometry per frame.
- No test file for `useHolisticCapture` or `PoseCapture.tsx` itself (camera/WASM/WebGL-dependent) — consistent with `useSignDetector`/`Avatar3D` having none. These get the manual verification pass in Task 4 instead.
- `kalidokit` (MIT) and `@mediapipe/holistic` (Apache-2.0) are already installed (`npm install kalidokit @mediapipe/holistic` has been run; `package.json`/`package-lock.json` already reflect it) — Task 1's install step is a no-op confirmation, not a fresh install.

---

### Task 1: Self-host Holistic assets + `useHolisticCapture` hook + minimal verification route

**Files:**
- Create: `public/mediapipe/holistic/` (copied binary assets)
- Create: `src/hooks/useHolisticCapture.ts`
- Create: `src/pages/PoseCapture.tsx` (minimal version — fleshed out further in Task 3)
- Modify: `src/App.tsx` (register `/dev/pose-capture`)

**Interfaces:**
- Produces: `useHolisticCapture({ videoRef, enabled, onFrame?, targetFps? }): { ready: boolean; error: string | null }`, and the `HolisticFrame`/`Landmark3D` types other tasks import.

- [ ] **Step 1: Confirm dependencies are installed**

Run: `npm ls kalidokit @mediapipe/holistic`
Expected: both listed with no `UNMET DEPENDENCY` (already installed during design de-risking; this just confirms the working tree has them).

- [ ] **Step 2: Self-host the Holistic assets**

Only `pose_landmark_full.tflite` is needed (matches `modelComplexity: 1` used below) — skip the `lite`/`heavy` variants to avoid ~30MB of unused public assets.

```bash
mkdir -p public/mediapipe/holistic
cp node_modules/@mediapipe/holistic/holistic.js public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic.binarypb public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_packed_assets.data public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_packed_assets_loader.js public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_simd_wasm_bin.js public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_simd_wasm_bin.wasm public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_simd_wasm_bin.data public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_wasm_bin.js public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/holistic_solution_wasm_bin.wasm public/mediapipe/holistic/
cp node_modules/@mediapipe/holistic/pose_landmark_full.tflite public/mediapipe/holistic/
```

Expected: `ls public/mediapipe/holistic` shows 10 files, ~40MB total.

- [ ] **Step 3: Write `useHolisticCapture`**

```ts
// src/hooks/useHolisticCapture.ts
import { useEffect, useRef, useState } from 'react';
import type { Holistic as HolisticClass, Results, Options } from '@mediapipe/holistic';
import { frameIsDue } from './useSignDetector';

declare global {
  interface Window {
    Holistic: typeof HolisticClass;
  }
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HolisticFrame {
  poseLandmarks: Landmark3D[] | null;
  poseWorldLandmarks: Landmark3D[] | null;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
}

interface UseHolisticCaptureOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onFrame?: (frame: HolisticFrame) => void;
  /** Detection rate cap, mirrors useSignDetector's ML-7/PERF-4 budget. */
  targetFps?: number;
}

interface UseHolisticCaptureReturn {
  ready: boolean;
  error: string | null;
}

const HOLISTIC_BASE_PATH = '/mediapipe/holistic';

let scriptLoadPromise: Promise<void> | null = null;

/** Injects the self-hosted Holistic script once; resolves once window.Holistic exists. */
function loadHolisticScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.Holistic) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `${HOLISTIC_BASE_PATH}/holistic.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load MediaPipe Holistic script'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * @mediapipe/holistic's public Results type has no poseWorldLandmarks field
 * (verified against the package's own index.d.ts: only poseLandmarks,
 * faceLandmarks, multiFaceGeometry, rightHandLandmarks, leftHandLandmarks,
 * segmentationMask, image are declared). The metric, hip-centered world
 * landmarks kalidokit's Pose.solve requires DO exist on the runtime result
 * object, but under an internal property name Closure Compiler assigns per
 * build — not guaranteed stable across versions (community demos have
 * observed different single-letter names on different builds). This scans
 * structurally instead of hardcoding a guessed name: the only other own
 * property that is an array of exactly 33 landmark-shaped objects is the
 * world landmarks (poseLandmarks is the known/typed one; faceLandmarks has
 * 468 points; hand landmarks have 21).
 */
function findPoseWorldLandmarks(results: Results): Landmark3D[] | null {
  const record = results as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'poseLandmarks') continue;
    if (!Array.isArray(value) || value.length !== 33) continue;
    const first = value[0] as Partial<Landmark3D> | undefined;
    if (first && typeof first.x === 'number' && typeof first.y === 'number' && typeof first.z === 'number') {
      return value as Landmark3D[];
    }
  }
  return null;
}

/**
 * Loads MediaPipe Holistic (self-hosted, script-tag injected) and runs it
 * against the caller-owned <video> element, fps-capped the same way
 * useSignDetector caps HandLandmarker. selfieMode mirrors the user so the
 * avatar acts as a performer reproducing your actual anatomy (approved
 * design decision) rather than a literal unmirrored frame copy.
 */
export function useHolisticCapture({
  videoRef,
  enabled,
  onFrame,
  targetFps = 18,
}: UseHolisticCaptureOptions): UseHolisticCaptureReturn {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holisticRef = useRef<HolisticClass | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    let cancelled = false;
    loadHolisticScript()
      .then(() => {
        if (cancelled) return;
        const holistic = new window.Holistic({
          locateFile: (file: string) => `${HOLISTIC_BASE_PATH}/${file}`,
        });
        const options: Options = {
          selfieMode: true,
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        };
        holistic.setOptions(options);
        holistic.onResults((results: Results) => {
          onFrameRef.current?.({
            poseLandmarks: (results.poseLandmarks as unknown as Landmark3D[] | undefined) ?? null,
            poseWorldLandmarks: findPoseWorldLandmarks(results),
            leftHandLandmarks: (results.leftHandLandmarks as unknown as Landmark3D[] | undefined) ?? null,
            rightHandLandmarks: (results.rightHandLandmarks as unknown as Landmark3D[] | undefined) ?? null,
          });
        });
        holisticRef.current = holistic;
        setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load MediaPipe Holistic');
      });
    return () => {
      cancelled = true;
      void holisticRef.current?.close();
      holisticRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ready) return;
    const intervalMs = 1000 / targetFps;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      if (frameIsDue(now, lastTickRef.current, intervalMs)) {
        lastTickRef.current = now;
        const video = videoRef.current;
        const holistic = holisticRef.current;
        if (video && holistic && video.readyState >= 2) {
          void holistic.send({ image: video });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const startLoop = () => {
      if (rafRef.current === null && !stopped) rafRef.current = requestAnimationFrame(tick);
    };
    const handleVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) startLoop();

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      stopLoop();
    };
  }, [enabled, ready, videoRef, targetFps]);

  return { ready, error };
}
```

- [ ] **Step 4: Write the minimal `/dev/pose-capture` verification page**

```tsx
// src/pages/PoseCapture.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHolisticCapture, type HolisticFrame } from '../hooks/useHolisticCapture';

export function PoseCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [frame, setFrame] = useState<HolisticFrame | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCamError(err instanceof Error ? err.message : 'Camera access denied');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFrame = useCallback((f: HolisticFrame) => setFrame(f), []);
  const { ready, error } = useHolisticCapture({ videoRef, enabled: true, onFrame: handleFrame });

  return (
    <div className="flex h-screen w-full gap-4 bg-neutral-900 p-4 text-white">
      <video ref={videoRef} autoPlay playsInline muted className="h-1/2 w-1/2 -scale-x-100 object-cover" />
      <pre className="flex-1 overflow-auto text-xs">
        {JSON.stringify(
          {
            camError,
            holisticReady: ready,
            holisticError: error,
            hasPoseLandmarks: !!frame?.poseLandmarks,
            hasPoseWorldLandmarks: !!frame?.poseWorldLandmarks,
            poseWorldLandmarkCount: frame?.poseWorldLandmarks?.length ?? 0,
            sampleWorldZ: frame?.poseWorldLandmarks?.[0]?.z ?? null,
            hasLeftHand: !!frame?.leftHandLandmarks,
            hasRightHand: !!frame?.rightHandLandmarks,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
```

Note the `-scale-x-100` on the `<video>` — this is a CSS *preview* mirror only (so what you see on screen matches how you're used to seeing yourself), independent of Holistic's `selfieMode` option, which mirrors the actual landmark coordinates. Both need to be checked against each other in Step 6.

- [ ] **Step 5: Register the dev-only route**

In `src/App.tsx`, add alongside the existing `PoseEditor`/`PoseSpike` lazy routes:

```ts
const PoseCapture = import.meta.env.DEV
  ? lazy(() => import('./pages/PoseCapture').then((m) => ({ default: m.PoseCapture })))
  : null;
```

And alongside the existing dev-only `<Route>` entries:

```tsx
{import.meta.env.DEV && PoseCapture && (
  <Route path="/dev/pose-capture" element={<PoseCapture />} />
)}
```

- [ ] **Step 6: Manually verify the spike — this is where the plan's unknowns get resolved as facts, not assumptions**

Run: `npm run dev`, open `/dev/pose-capture` in the browser, allow camera access.

Check, in order:
1. `holisticReady` becomes `true` within a few seconds and `holisticError` stays `null`. If it errors, check the browser console — a 404 on any `/mediapipe/holistic/*` file means Step 2's copy was incomplete; a script `onerror` means the self-hosted script itself failed to load.
2. `hasPoseLandmarks` becomes `true` once you're in frame.
3. `hasPoseWorldLandmarks` becomes `true` and `poseWorldLandmarkCount` reads `33`. This confirms `findPoseWorldLandmarks` found the undocumented property.
4. Move toward and away from the camera and watch `sampleWorldZ` — it should change noticeably (confirms the found array is genuinely metric depth data, not something else that happened to also be a 33-length array).
5. Raise **your right hand** only. Confirm `hasRightHand` becomes `true` and `hasLeftHand` stays `false`. This is the concrete check for the "mirror you" + `selfieMode` + hand-label interaction flagged as a risk in the design: with `selfieMode: true`, Holistic's hand-label assignment should already correspond to your actual anatomical side (raising your right hand populates `rightHandLandmarks`), because `selfieMode` flips the source image before detection, which is also what makes the avatar mirror you later in Task 3.
   - If instead `hasLeftHand` becomes `true` when you raise your *right* hand, the hand-label assignment is inverted relative to what's needed. Document this finding as a code comment above the `onResults` callback in `useHolisticCapture.ts` (e.g. `// VERIFIED <date>: selfieMode did not fix hand-label assignment; swapped explicitly below`) and swap the two fields when building the `HolisticFrame` (`leftHandLandmarks: results.rightHandLandmarks, rightHandLandmarks: results.leftHandLandmarks`) — a one-line, clearly-commented fix, not a redesign.

- [ ] **Step 7: Commit**

```bash
git add public/mediapipe/holistic src/hooks/useHolisticCapture.ts src/pages/PoseCapture.tsx src/App.tsx
git commit -m "feat(pose-capture): add Holistic capture hook and dev verification route"
```

---

### Task 2: `holisticToVRMPose` mapping adapter + unit tests

**Files:**
- Create: `src/lib/holisticToVRMPose.ts`
- Create: `src/lib/holisticToVRMPose.test.ts`

**Interfaces:**
- Consumes: `HolisticFrame` from `../hooks/useHolisticCapture` (Task 1).
- Produces: `holisticToVRMPose(frame: HolisticFrame, videoEl: HTMLVideoElement | null): VRMPose` — the same `VRMPose` type `SignClip`/`useSignPlayer` already consume (`src/data/signManifest.ts`), so `PoseCapture.tsx` (Task 3) and any future recorder can apply it directly via `vrm.humanoid.setNormalizedPose()`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/holisticToVRMPose.test.ts
import { describe, it, expect } from 'vitest';
import { holisticToVRMPose } from './holisticToVRMPose';
import type { HolisticFrame, Landmark3D } from '../hooks/useHolisticCapture';

// MediaPipe BlazePose landmark indices (stable, documented — not the
// undocumented world-landmarks property this module works around elsewhere).
const RIGHT_SHOULDER = 12;
const RIGHT_ELBOW = 14;
const RIGHT_WRIST = 16;
const LEFT_SHOULDER = 11;
const LEFT_ELBOW = 13;
const LEFT_WRIST = 15;

function lm(x: number, y: number, z: number): Landmark3D {
  return { x, y, z, visibility: 1 };
}

/** 33-point landmark array in a relaxed standing rest pose, arms at sides. */
function restPoseLandmarks(overrides: Partial<Record<number, Landmark3D>> = {}): Landmark3D[] {
  const base: Landmark3D[] = Array.from({ length: 33 }, () => lm(0, 0, 0));
  base[0] = lm(0, -0.5, 0); // nose
  base[LEFT_SHOULDER] = lm(-0.2, -0.3, 0);
  base[RIGHT_SHOULDER] = lm(0.2, -0.3, 0);
  base[LEFT_ELBOW] = lm(-0.25, 0, 0);
  base[RIGHT_ELBOW] = lm(0.25, 0, 0);
  base[LEFT_WRIST] = lm(-0.28, 0.3, 0);
  base[RIGHT_WRIST] = lm(0.28, 0.3, 0);
  base[23] = lm(-0.15, 0.3, 0); // left hip
  base[24] = lm(0.15, 0.3, 0); // right hip
  for (const [i, v] of Object.entries(overrides)) base[Number(i)] = v;
  return base;
}

/** Same shape, used as the "world" (metric) landmark set for these tests. */
function restPoseWorldLandmarks(overrides: Partial<Record<number, Landmark3D>> = {}): Landmark3D[] {
  return restPoseLandmarks(overrides);
}

const REST_FRAME: HolisticFrame = {
  poseLandmarks: restPoseLandmarks(),
  poseWorldLandmarks: restPoseWorldLandmarks(),
  leftHandLandmarks: null,
  rightHandLandmarks: null,
};

const ARM_RAISED_FRAME: HolisticFrame = {
  poseLandmarks: restPoseLandmarks({
    [RIGHT_ELBOW]: lm(0.25, -0.35, 0),
    [RIGHT_WRIST]: lm(0.25, -0.65, 0),
  }),
  poseWorldLandmarks: restPoseWorldLandmarks({
    [RIGHT_ELBOW]: lm(0.25, -0.35, 0),
    [RIGHT_WRIST]: lm(0.25, -0.65, 0),
  }),
  leftHandLandmarks: null,
  rightHandLandmarks: null,
};

/** 21-point hand landmarks, standard MediaPipe hand order, fingers spread open. */
function openHandLandmarks(): Landmark3D[] {
  const points: Landmark3D[] = [lm(0, 0, 0)]; // 0: wrist
  const fingers = [
    [0.05, -0.1], // thumb direction
    [0.02, -0.25], // index
    [0, -0.28], // middle
    [-0.02, -0.25], // ring
    [-0.05, -0.2], // little
  ];
  for (const [dx, dy] of fingers) {
    for (let joint = 1; joint <= 4; joint++) {
      points.push(lm(dx * joint * 0.25, dy * joint * 0.25, -0.01 * joint));
    }
  }
  return points; // length 1 + 5*4 = 21
}

const HAND_OPEN_FRAME: HolisticFrame = {
  ...REST_FRAME,
  rightHandLandmarks: openHandLandmarks(),
};

describe('holisticToVRMPose', () => {
  it('returns an empty pose when world landmarks are missing', () => {
    const pose = holisticToVRMPose({ ...REST_FRAME, poseWorldLandmarks: null }, null);
    expect(pose).toEqual({});
  });

  it('maps right arm bones with valid unit quaternions', () => {
    const pose = holisticToVRMPose(ARM_RAISED_FRAME, null);
    for (const bone of ['rightUpperArm', 'rightLowerArm'] as const) {
      const rotation = pose[bone]?.rotation;
      expect(rotation).toBeDefined();
      const [x, y, z, w] = rotation!;
      const length = Math.sqrt(x * x + y * y + z * z + w * w);
      expect(length).toBeCloseTo(1, 4);
    }
  });

  it('falls back to the Pose-derived hand rotation when no hand landmarks are present', () => {
    const pose = holisticToVRMPose(REST_FRAME, null);
    // No hand landmarks in REST_FRAME, but Pose.solve always returns a
    // RightHand/LeftHand estimate from the arm — the wrist bone should still
    // be set from that fallback rather than left empty.
    expect(pose.rightHand?.rotation).toBeDefined();
    expect(pose.leftHand?.rotation).toBeDefined();
  });

  it('maps finger joints, including the thumb metacarpal remap, when a hand is present', () => {
    const pose = holisticToVRMPose(HAND_OPEN_FRAME, null);
    expect(pose.rightThumbMetacarpal?.rotation).toBeDefined();
    expect(pose.rightThumbProximal?.rotation).toBeDefined();
    expect(pose.rightThumbDistal?.rotation).toBeDefined();
    expect(pose.rightIndexProximal?.rotation).toBeDefined();
    expect(pose.rightIndexIntermediate?.rotation).toBeDefined();
    expect(pose.rightIndexDistal?.rotation).toBeDefined();
    expect(pose.rightMiddleDistal?.rotation).toBeDefined();
    expect(pose.rightRingDistal?.rotation).toBeDefined();
    expect(pose.rightLittleDistal?.rotation).toBeDefined();
    // No left hand landmarks in this fixture — only the arm-derived wrist
    // fallback should be set, no left finger joints.
    expect(pose.leftIndexProximal).toBeUndefined();
  });

  it('does not map spine, hips, or legs (out of scope for this slice)', () => {
    const pose = holisticToVRMPose(ARM_RAISED_FRAME, null);
    expect(pose.spine).toBeUndefined();
    expect(pose.hips).toBeUndefined();
    expect(pose.rightUpperLeg).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/holisticToVRMPose.test.ts`
Expected: FAIL — `Cannot find module './holisticToVRMPose'` (the module doesn't exist yet).

- [ ] **Step 3: Write `holisticToVRMPose.ts`**

```ts
// src/lib/holisticToVRMPose.ts
import * as THREE from 'three';
import { Pose, Hand } from 'kalidokit';
import type { VRMPose } from '@pixiv/three-vrm';
import type { HolisticFrame, Landmark3D } from '../hooks/useHolisticCapture';

interface Rotation3 {
  x: number;
  y: number;
  z: number;
  rotationOrder?: string;
}

function toQuat(r: Rotation3): [number, number, number, number] {
  const order = (r.rotationOrder ?? 'XYZ') as THREE.EulerOrder;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x, r.y, r.z, order));
  return [q.x, q.y, q.z, q.w];
}

function setBone(pose: VRMPose, boneKey: string, rotation: Rotation3 | undefined) {
  if (!rotation) return;
  pose[boneKey as keyof VRMPose] = { rotation: toQuat(rotation) };
}

// kalidokit Hand.solve() finger field name -> VRM bone name suffix.
// Index/Middle/Ring/Little map 1:1 (both use Proximal/Intermediate/Distal).
// Thumb is shifted by one joint: kalidokit emits a generic three-segment
// Proximal/Intermediate/Distal for every finger, but VRM's actual thumb rig
// has no "Intermediate" phalanx — it's Metacarpal/Proximal/Distal instead.
const FINGER_JOINTS: { kalidokit: string; vrm: string }[] = [
  { kalidokit: 'ThumbProximal', vrm: 'ThumbMetacarpal' },
  { kalidokit: 'ThumbIntermediate', vrm: 'ThumbProximal' },
  { kalidokit: 'ThumbDistal', vrm: 'ThumbDistal' },
  { kalidokit: 'IndexProximal', vrm: 'IndexProximal' },
  { kalidokit: 'IndexIntermediate', vrm: 'IndexIntermediate' },
  { kalidokit: 'IndexDistal', vrm: 'IndexDistal' },
  { kalidokit: 'MiddleProximal', vrm: 'MiddleProximal' },
  { kalidokit: 'MiddleIntermediate', vrm: 'MiddleIntermediate' },
  { kalidokit: 'MiddleDistal', vrm: 'MiddleDistal' },
  { kalidokit: 'RingProximal', vrm: 'RingProximal' },
  { kalidokit: 'RingIntermediate', vrm: 'RingIntermediate' },
  { kalidokit: 'RingDistal', vrm: 'RingDistal' },
  { kalidokit: 'LittleProximal', vrm: 'LittleProximal' },
  { kalidokit: 'LittleIntermediate', vrm: 'LittleIntermediate' },
  { kalidokit: 'LittleDistal', vrm: 'LittleDistal' },
];

function applyHand(
  pose: VRMPose,
  side: 'Left' | 'Right',
  handRig: Record<string, Rotation3 | undefined> | undefined,
  poseArmHandFallback: Rotation3 | undefined,
) {
  const vrmSide = side.toLowerCase();
  // Prefer the hand-landmark-derived wrist rotation (more accurate — built
  // from the actual hand shape); fall back to Pose.solve's coarser
  // arm-based hand estimate when the hand is off-camera/occluded, so the
  // wrist doesn't freeze into the rest pose while the arm keeps moving.
  const wrist = handRig?.[`${side}Wrist`];
  setBone(pose, `${vrmSide}Hand`, wrist ?? poseArmHandFallback);

  if (!handRig) return;
  for (const { kalidokit, vrm } of FINGER_JOINTS) {
    setBone(pose, `${vrmSide}${vrm}`, handRig[`${side}${kalidokit}`]);
  }
}

/**
 * Maps one Holistic capture frame onto the VRM humanoid's arm and finger
 * bones via kalidokit, mirroring the sign-animation engine's VRMPose shape
 * (Record<boneName, {rotation:[x,y,z,w]}>) so playback/recording code can
 * consume it identically to a hand-authored SignClip keyframe. Pure
 * function: no internal smoothing state — frame-to-frame damping is the
 * caller's job (via the existing lerpPose utility).
 */
export function holisticToVRMPose(frame: HolisticFrame, videoEl: HTMLVideoElement | null): VRMPose {
  const pose: VRMPose = {};
  if (!frame.poseWorldLandmarks || !frame.poseLandmarks) return pose;

  const poseRig = Pose.solve(
    frame.poseWorldLandmarks as unknown as Parameters<typeof Pose.solve>[0],
    frame.poseLandmarks as unknown as Parameters<typeof Pose.solve>[1],
    { runtime: 'mediapipe', video: videoEl, enableLegs: false },
  ) as unknown as Record<string, Rotation3 | undefined> | undefined;

  if (poseRig) {
    setBone(pose, 'rightUpperArm', poseRig.RightUpperArm);
    setBone(pose, 'rightLowerArm', poseRig.RightLowerArm);
    setBone(pose, 'leftUpperArm', poseRig.LeftUpperArm);
    setBone(pose, 'leftLowerArm', poseRig.LeftLowerArm);
  }

  const leftHandRig = frame.leftHandLandmarks
    ? (Hand.solve(frame.leftHandLandmarks as Landmark3D[], 'Left') as unknown as
        | Record<string, Rotation3 | undefined>
        | undefined)
    : undefined;
  const rightHandRig = frame.rightHandLandmarks
    ? (Hand.solve(frame.rightHandLandmarks as Landmark3D[], 'Right') as unknown as
        | Record<string, Rotation3 | undefined>
        | undefined)
    : undefined;

  applyHand(pose, 'Left', leftHandRig, poseRig?.LeftHand);
  applyHand(pose, 'Right', rightHandRig, poseRig?.RightHand);

  return pose;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/holisticToVRMPose.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors. If `Pose.solve`/`Hand.solve`'s exact parameter types don't structurally match `Landmark3D[]` (e.g. a stricter tuple shape), fix with the minimal cast needed at the call site — the `as unknown as Parameters<...>` casts above are already a deliberate escape hatch for this; adjust only if `tsc` disagrees.

- [ ] **Step 6: Commit**

```bash
git add src/lib/holisticToVRMPose.ts src/lib/holisticToVRMPose.test.ts
git commit -m "feat(pose-capture): add kalidokit-based landmark-to-VRMPose adapter"
```

---

### Task 3: Flesh out `PoseCapture.tsx` — VRM avatar, live mapping, and debug view

**Files:**
- Modify: `src/pages/PoseCapture.tsx` (replaces Task 1's minimal JSON-dump body)

**Interfaces:**
- Consumes: `useVRMAvatar` (`src/hooks/useVRMAvatar.ts`), `useHolisticCapture` (Task 1), `holisticToVRMPose` (Task 2).

- [ ] **Step 1: Replace `PoseCapture.tsx` with the full harness**

```tsx
// src/pages/PoseCapture.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { useVRMAvatar } from '../hooks/useVRMAvatar';
import { useHolisticCapture, type HolisticFrame, type Landmark3D } from '../hooks/useHolisticCapture';
import { holisticToVRMPose } from '../lib/holisticToVRMPose';
import { Button } from '../components/Button';

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], [23, 24], // torso
];

function drawOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: HolisticFrame | null) {
  const w = video.videoWidth || canvas.width;
  const h = video.videoHeight || canvas.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!frame) return;

  const drawPoints = (landmarks: Landmark3D[] | null, color: string) => {
    if (!landmarks) return;
    ctx.fillStyle = color;
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  if (frame.poseLandmarks) {
    for (const [a, b] of POSE_CONNECTIONS) {
      const pa = frame.poseLandmarks[a];
      const pb = frame.poseLandmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }
  }
  drawPoints(frame.poseLandmarks, '#60a5fa');
  drawPoints(frame.leftHandLandmarks, '#34d399');
  drawPoints(frame.rightHandLandmarks, '#f87171');
}

// Bones the mapping actually drives (arms + hands, not fingers — 30 finger
// axis helpers would clutter the view; extend this list the same way if
// finger-level axis inspection is needed later).
const AXIS_HELPER_BONES: VRMHumanBoneName[] = [
  'rightUpperArm' as VRMHumanBoneName,
  'rightLowerArm' as VRMHumanBoneName,
  'rightHand' as VRMHumanBoneName,
  'leftUpperArm' as VRMHumanBoneName,
  'leftLowerArm' as VRMHumanBoneName,
  'leftHand' as VRMHumanBoneName,
];

function BoneAxesHelpers({ vrm, visible }: { vrm: VRM | null; visible: boolean }) {
  const helpersRef = useRef<THREE.AxesHelper[]>([]);

  useEffect(() => {
    if (!vrm) return;
    const helpers: THREE.AxesHelper[] = [];
    for (const boneName of AXIS_HELPER_BONES) {
      const bone = vrm.humanoid?.getRawBoneNode(boneName);
      if (!bone) continue;
      const helper = new THREE.AxesHelper(0.1);
      helper.visible = visible;
      bone.add(helper);
      helpers.push(helper);
    }
    helpersRef.current = helpers;
    return () => {
      for (const helper of helpers) {
        helper.parent?.remove(helper);
        helper.dispose();
      }
      helpersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm]);

  useEffect(() => {
    for (const helper of helpersRef.current) helper.visible = visible;
  }, [visible]);

  return null;
}

/**
 * Palm normal from bone world positions (wrist, index-proximal,
 * little-proximal), not finger curl — stays valid regardless of whether the
 * fingers are open or closed, unlike last session's curled-finger check
 * (which only worked for a static, fully-curled reference pose). The sign
 * of the resulting vector (which way it points relative to the camera) is
 * NOT asserted here — read the raw numbers against a known pose (e.g. palm
 * held flat toward the camera) during the Task 4 verification pass.
 */
function computePalmNormal(vrm: VRM, side: 'left' | 'right'): THREE.Vector3 | null {
  const wrist = vrm.humanoid?.getRawBoneNode(`${side}Hand` as VRMHumanBoneName);
  const index = vrm.humanoid?.getRawBoneNode(`${side}IndexProximal` as VRMHumanBoneName);
  const little = vrm.humanoid?.getRawBoneNode(`${side}LittleProximal` as VRMHumanBoneName);
  if (!wrist || !index || !little) return null;

  const wristPos = new THREE.Vector3();
  const indexPos = new THREE.Vector3();
  const littlePos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  index.getWorldPosition(indexPos);
  little.getWorldPosition(littlePos);

  const toIndex = indexPos.clone().sub(wristPos);
  const toLittle = littlePos.clone().sub(wristPos);
  if (toIndex.lengthSq() === 0 || toLittle.lengthSq() === 0) return null;
  return toIndex.cross(toLittle).normalize();
}

/** Wrist -> middle-finger-proximal direction — the hand's long axis, independent of curl or palm facing. */
function computeHandLongAxis(vrm: VRM, side: 'left' | 'right'): THREE.Vector3 | null {
  const wrist = vrm.humanoid?.getRawBoneNode(`${side}Hand` as VRMHumanBoneName);
  const middle = vrm.humanoid?.getRawBoneNode(`${side}MiddleProximal` as VRMHumanBoneName);
  if (!wrist || !middle) return null;

  const wristPos = new THREE.Vector3();
  const middlePos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  middle.getWorldPosition(middlePos);

  const axis = middlePos.clone().sub(wristPos);
  if (axis.lengthSq() === 0) return null;
  return axis.normalize();
}

interface ReadoutValues {
  rightPalmNormal: THREE.Vector3 | null;
  leftPalmNormal: THREE.Vector3 | null;
  rightHandAxis: THREE.Vector3 | null;
  leftHandAxis: THREE.Vector3 | null;
}

interface PoseCaptureSceneProps {
  latestFrameRef: React.RefObject<HolisticFrame | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showAxes: boolean;
  onReadout: (readout: ReadoutValues) => void;
}

function PoseCaptureScene({ latestFrameRef, videoRef, showAxes, onReadout }: PoseCaptureSceneProps) {
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm');
  const readoutTickRef = useRef(0);

  useFrame(() => {
    if (!vrm) return;
    const frame = latestFrameRef.current;
    if (frame) {
      // Applied directly, no frame-to-frame smoothing (see Global
      // Constraints) — avoids stale finger poses lingering when a hand
      // drops out of tracking.
      const targetPose = holisticToVRMPose(frame, videoRef.current);
      vrm.humanoid?.resetNormalizedPose();
      vrm.humanoid?.setNormalizedPose(targetPose);
    }
    vrm.update(0);

    // Numeric readout at ~6fps — every frame would be unreadable.
    readoutTickRef.current += 1;
    if (readoutTickRef.current % 10 === 0) {
      onReadout({
        rightPalmNormal: computePalmNormal(vrm, 'right'),
        leftPalmNormal: computePalmNormal(vrm, 'left'),
        rightHandAxis: computeHandLongAxis(vrm, 'right'),
        leftHandAxis: computeHandLongAxis(vrm, 'left'),
      });
    }
  });

  return (
    <>
      <primitive object={scene} />
      <BoneAxesHelpers vrm={vrm} visible={showAxes} />
    </>
  );
}

function formatVec(v: THREE.Vector3 | null): string {
  if (!v) return 'n/a';
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

export function PoseCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const latestFrameRef = useRef<HolisticFrame | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [showAxes, setShowAxes] = useState(true);
  const [readout, setReadout] = useState<ReadoutValues>({
    rightPalmNormal: null,
    leftPalmNormal: null,
    rightHandAxis: null,
    leftHandAxis: null,
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCamError(err instanceof Error ? err.message : 'Camera access denied');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFrame = useCallback((frame: HolisticFrame) => {
    latestFrameRef.current = frame;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (canvas && video) drawOverlay(canvas, video, frame);
  }, []);

  const { ready, error } = useHolisticCapture({ videoRef, enabled: true, onFrame: handleFrame });

  const readoutText = useMemo(
    () =>
      [
        `Holistic ready: ${ready}${error ? ` (error: ${error})` : ''}`,
        camError ? `Camera error: ${camError}` : null,
        `Right palm normal: ${formatVec(readout.rightPalmNormal)}`,
        `Left palm normal: ${formatVec(readout.leftPalmNormal)}`,
        `Right hand axis: ${formatVec(readout.rightHandAxis)}`,
        `Left hand axis: ${formatVec(readout.leftHandAxis)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    [ready, error, camError, readout],
  );

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-white">
      <div className="relative w-1/2 shrink-0">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 h-full w-full -scale-x-100" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-700 p-3">
          <Button size="sm" variant="outline" onClick={() => setShowAxes((v) => !v)}>
            {showAxes ? 'Hide' : 'Show'} bone axes
          </Button>
        </div>
        <div className="flex-1">
          <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
            <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 5, 5]} intensity={0.9} />
            <PoseCaptureScene
              latestFrameRef={latestFrameRef}
              videoRef={videoRef}
              showAxes={showAxes}
              onReadout={setReadout}
            />
            <OrbitControls enablePan enableZoom minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
          </Canvas>
        </div>
        <pre className="border-t border-neutral-700 p-3 text-xs">{readoutText}</pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.app.json && npm run lint`
Expected: no errors. Fix any flagged issues (e.g. the `react-hooks/exhaustive-deps` suppression above may need adjusting to this project's actual lint config — check `oxlint`'s output and follow its suggestion if the comment syntax differs).

- [ ] **Step 3: Commit**

```bash
git add src/pages/PoseCapture.tsx
git commit -m "feat(pose-capture): wire live VRM mapping, overlay, axes, and readout into PoseCapture"
```

---

### Task 4: Manual end-to-end verification pass

**Files:** none (verification only; may produce small follow-up commits if Task 3's hypotheses need correction)

- [ ] **Step 1: Run the harness**

Run: `npm run dev`, open `/dev/pose-capture`, allow camera access, confirm the readout shows `Holistic ready: true` with no errors.

- [ ] **Step 2: Verify "arm raised"**

Raise your right arm out to the side, then straight up. Confirm:
- The avatar's right arm (viewer's right, since the avatar faces the camera — double check against the 2D overlay which side is tracking) follows in real time with no more than a fraction of a second of lag.
- The bone-axis helper on `rightUpperArm`/`rightLowerArm` rotates smoothly with the arm, not snapping or jittering wildly between frames.
- Lower the arm back down; it should return to roughly the rest position, not drift.

If the arm is inverted or wildly wrong, check first whether `poseWorldLandmarks` are actually populated (Task 1 Step 6's check) — a null/degenerate world-landmark scan would make `Pose.solve` return `undefined`, silently leaving arm bones unset (visible as the avatar staying in the idle T-pose while only fingers move).

- [ ] **Step 3: Verify "hand open"**

Hold your right hand up, fingers spread open, facing the camera. Confirm:
- All five fingers on the avatar's mapped hand extend outward, not curled.
- The thumb specifically looks like a natural thumb bend, not doubled-back or flat against the palm — this is the concrete check for the `ThumbProximal→ThumbMetacarpal` remap hypothesis in `holisticToVRMPose.ts`. If it looks wrong, the fix is re-deriving which kalidokit thumb field maps to which VRM thumb bone (adjust the `FINGER_JOINTS` table's three `Thumb*` rows), not a structural change.
- Close your hand into a fist; fingers should curl inward, not outward or sideways.

- [ ] **Step 4: Verify palm orientation against the numeric readout**

Hold your right palm flat, facing directly toward the camera. Note the `Right palm normal` vector in the readout. Then turn your hand so the palm faces away from the camera (back of hand toward camera) and note how the vector changes — it should flip sign on at least one axis, not stay roughly the same (a readout that doesn't change between "palm toward camera" and "palm away" indicates `computePalmNormal`'s cross-product ordering or the underlying wrist rotation itself is wrong — this is exactly the class of bug fixed last session, now caught with a live number instead of a screenshot).

- [ ] **Step 5: Document findings and fix anything wrong, then commit**

For each hypothesis that needed correction (hand-label swap, thumb remap, palm-normal sign, or anything else), leave the fix with a short comment noting it was empirically verified, then:

```bash
git add -A
git commit -m "fix(pose-capture): correct mapping issues found during live verification"
```

If everything in Steps 2-4 looks correct with no changes needed, there's nothing to commit for this task — the mapping is confirmed and this slice is done. Recording, persistence, and playback UI (deferred pieces 3-5 from the original request) are a follow-up spec, to be brainstormed once you're ready to build on this confirmed-correct mapping.
