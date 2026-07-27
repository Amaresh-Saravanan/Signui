# Sign-Animation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the plumbing that turns typed text into VRM avatar sign-language movement — `resolveText`, a JSON keyframe clip format, a `useSignPlayer` playback hook, and a dev-only Pose Editor — with zero shipped content and zero new dependencies.

**Architecture:** `resolveText(text, manifest)` is a pure function mapping text to an ordered list of clip keys. `useSignPlayer(vrm, manifest)` is an R3F hook that steps a framework-independent `SignPlaybackController` every frame via `useFrame`, slerping (`lerpPose`) between each clip's keyframe poses and applying them with `vrm.humanoid.setNormalizedPose()` + `vrm.update(delta)`. `Avatar3D` gets two new optional props (`playRequest`, `onPlaybackStateChange`) that wire `resolveText` + `useSignPlayer` together; all existing usages are unaffected. A dev-only `/dev/pose-editor` route reuses the extracted `useVRMAvatar` hook to hand-author clips via bone-rotation sliders and export them as JSON.

**Tech Stack:** React 19, TypeScript, Vite, `@react-three/fiber`/`@react-three/drei`, `@pixiv/three-vrm` (already installed — no `@pixiv/three-vrm-animation`, no new packages), Vitest.

**Source spec:** `docs/superpowers/specs/2026-07-27-sign-animation-engine-design.md`

## Global Constraints

- **Zero new dependencies.** Everything is built on `@pixiv/three-vrm`'s existing `VRMPose`/`VRMHumanoid.getNormalizedPose()`/`setNormalizedPose()` API, `three`'s `Quaternion`/`Euler` math, and native browser APIs (`Blob`, `URL.createObjectURL`) — no `@pixiv/three-vrm-animation`, no new slider/UI library.
- **Content ships empty.** `signManifest` starts as `{}`. No `.json` clip files are authored in this plan — that's separate, later, human-driven work using the Pose Editor this plan builds.
- **ASL only.** No multi-language manifest structure.
- **Custom JSON keyframe format, not `.vrma`.** No glTF export/import code.
- **`/dev/pose-editor` is registered only under `import.meta.env.DEV`** — must be verifiably absent from the production bundle, not just hidden behind a runtime check.
- **Tests are Vitest, pure-function-only.** No `@testing-library/react`, no jsdom, no React Three Fiber rendering tests — matches the existing convention (`Avatar3D.tsx` itself has no test file; `src/hooks/useSignDetector.ts` tests only its extracted pure `frameIsDue` helper). Anything that needs a live `Canvas`/`vrm` is verified by running the dev server, not by an automated test.
- **`erasableSyntaxOnly: true` is set in `tsconfig.app.json`.** No TypeScript constructor parameter-property shorthand (`constructor(private x: T)`), no `enum`. Declare class fields explicitly and assign in the constructor body instead.
- **`verbatimModuleSyntax: true`.** Every type-only import must use `import type` (or an inline `type` modifier on a named import), matching the existing pattern in `src/components/Avatar3D.tsx`.
- **`Avatar3D`'s two new props are additive and optional.** `src/pages/Workspace.tsx` is not touched by this plan — it already renders `<Avatar3D />` with no `playRequest`, so behavior there is unchanged.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/signManifest.ts` | `SignKeyframe`/`SignClip`/`SignManifest` types + the (empty) `signManifest` singleton |
| `src/lib/resolveText.ts` | Pure: text → ordered clip keys |
| `src/lib/resolveText.test.ts` | Unit tests |
| `src/lib/lerpPose.ts` | Pure: slerp two `VRMPose`s |
| `src/lib/lerpPose.test.ts` | Unit tests |
| `src/hooks/useVRMAvatar.ts` | VRM loading + box-centering/camera-framing, extracted unchanged from `Avatar3D.tsx` |
| `src/components/Avatar3D.tsx` | Modified: `VRMAvatar` now calls `useVRMAvatar`; new `playRequest`/`onPlaybackStateChange` props |
| `src/hooks/useSignPlayer.ts` | `SignPlaybackController` (pure, testable) + `useSignPlayer` (thin `useFrame` wrapper) |
| `src/hooks/useSignPlayer.test.ts` | Unit tests against `SignPlaybackController` directly |
| `src/lib/poseEditorMath.ts` | Pure: Euler-degrees ⇄ quaternion, for the slider UI |
| `src/lib/poseEditorMath.test.ts` | Unit tests |
| `src/components/BoneSlider.tsx` | One labeled `<input type="range">`, degrees |
| `src/pages/PoseEditor.tsx` | Dev-only authoring page: sliders, keyframe list, preview, export |
| `src/App.tsx` | Modified: dev-only `/dev/pose-editor` route |

---

### Task 1: Sign data model + empty manifest

**Files:**
- Create: `src/data/signManifest.ts`
- Test: none (pure data/type declarations — nothing to assert beyond what the type checker already verifies)

**Interfaces:**
- Produces: `SignKeyframe { time: number; pose: VRMPose }`, `SignClip { duration: number; keyframes: SignKeyframe[] }`, `SignManifest = Record<string, SignClip>`, `signManifest: SignManifest`

- [ ] **Step 1: Create the file**

```ts
// src/data/signManifest.ts
import type { VRMPose } from '@pixiv/three-vrm';

export interface SignKeyframe {
  /** Seconds from the start of this clip. */
  time: number;
  /** Snapshot from humanoid.getNormalizedPose() — rotation-only quaternions. */
  pose: VRMPose;
}

export interface SignClip {
  /** Total clip duration in seconds. */
  duration: number;
  /** 1 keyframe = a static held pose (a letter). 2+ = motion (J, Z, phrases). */
  keyframes: SignKeyframe[];
}

/** Key = 'A'..'Z' or a lowercase phrase like 'hello'. */
export type SignManifest = Record<string, SignClip>;

// No content authored yet. To add a sign: drop a clip JSON file under
// src/data/signs/, import it above, and add it to this object — no engine
// code changes needed.
export const signManifest: SignManifest = {};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/signManifest.ts
git commit -m "feat(sign-engine): add sign clip data model and empty manifest"
```

---

### Task 2: `resolveText`

**Files:**
- Create: `src/lib/resolveText.ts`
- Test: `src/lib/resolveText.test.ts`

**Interfaces:**
- Consumes: `SignManifest` from Task 1 (`src/data/signManifest.ts`)
- Produces: `resolveText(text: string, manifest: SignManifest): string[]`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/resolveText.test.ts
import { describe, it, expect } from 'vitest';
import { resolveText } from './resolveText';
import type { SignManifest } from '../data/signManifest';

const clip = { duration: 1, keyframes: [{ time: 0, pose: {} }] };

describe('resolveText', () => {
  it('matches a whole phrase before falling back to letters', () => {
    const manifest: SignManifest = { hello: clip, H: clip, E: clip };
    expect(resolveText('Hello', manifest)).toEqual(['hello']);
  });

  it('falls back to per-letter fingerspelling when no phrase matches', () => {
    const manifest: SignManifest = { A: clip, B: clip, C: clip };
    expect(resolveText('cab', manifest)).toEqual(['C', 'A', 'B']);
  });

  it('is case-insensitive for both phrase and letter lookup', () => {
    const manifest: SignManifest = { hello: clip };
    expect(resolveText('HELLO', manifest)).toEqual(['hello']);
  });

  it('skips spaces, digits, and punctuation', () => {
    const manifest: SignManifest = { A: clip, B: clip };
    expect(resolveText('a1 b!', manifest)).toEqual(['A', 'B']);
  });

  it('skips letters with no manifest entry', () => {
    const manifest: SignManifest = { A: clip };
    expect(resolveText('ab', manifest)).toEqual(['A']);
  });

  it('returns [] for empty or whitespace-only input', () => {
    expect(resolveText('', { A: clip })).toEqual([]);
    expect(resolveText('   ', { A: clip })).toEqual([]);
  });

  it('returns [] for an empty manifest', () => {
    expect(resolveText('hello', {})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/resolveText.test.ts`
Expected: FAIL — `Cannot find module './resolveText'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/resolveText.ts
import type { SignManifest } from '../data/signManifest';

/**
 * Resolve typed text into an ordered list of clip keys to play.
 *
 * Whole-phrase lookup first (case-insensitive, exact match against a
 * manifest key), then falls back to per-character fingerspelling — each
 * letter becomes its own uppercase clip key. Spaces, digits, and
 * punctuation are skipped, as are letters with no manifest entry. Returns
 * [] when nothing in the text resolves (including against an empty
 * manifest).
 */
export function resolveText(text: string, manifest: SignManifest): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const phraseKey = Object.keys(manifest).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase(),
  );
  if (phraseKey) return [phraseKey];

  const keys: string[] = [];
  for (const char of trimmed) {
    if (!/[a-zA-Z]/.test(char)) continue; // digits, spaces, punctuation
    const letterKey = char.toUpperCase();
    if (manifest[letterKey]) keys.push(letterKey);
  }
  return keys;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/resolveText.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/resolveText.ts src/lib/resolveText.test.ts
git commit -m "feat(sign-engine): add resolveText for phrase/letter clip resolution"
```

---

### Task 3: `lerpPose`

**Files:**
- Create: `src/lib/lerpPose.ts`
- Test: `src/lib/lerpPose.test.ts`

**Interfaces:**
- Produces: `lerpPose(a: VRMPose, b: VRMPose, t: number): VRMPose`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/lerpPose.test.ts
import { describe, it, expect } from 'vitest';
import { lerpPose } from './lerpPose';
import type { VRMPose } from '@pixiv/three-vrm';

const poseA: VRMPose = { leftHand: { rotation: [0, 0, 0, 1] } };
const poseB: VRMPose = { leftHand: { rotation: [0, 0.7071068, 0, 0.7071068] } }; // 90° around Y

describe('lerpPose', () => {
  it('returns pose a at t=0', () => {
    const out = lerpPose(poseA, poseB, 0);
    expect(out.leftHand?.rotation?.[0]).toBeCloseTo(0);
    expect(out.leftHand?.rotation?.[1]).toBeCloseTo(0);
    expect(out.leftHand?.rotation?.[3]).toBeCloseTo(1);
  });

  it('returns pose b at t=1', () => {
    const out = lerpPose(poseA, poseB, 1);
    expect(out.leftHand?.rotation?.[1]).toBeCloseTo(0.7071068, 4);
    expect(out.leftHand?.rotation?.[3]).toBeCloseTo(0.7071068, 4);
  });

  it('returns the slerped midpoint at t=0.5', () => {
    const out = lerpPose(poseA, poseB, 0.5);
    // Midpoint of a 0->90° slerp around Y is a 45° rotation around Y.
    expect(out.leftHand?.rotation?.[1]).toBeCloseTo(Math.sin(Math.PI / 8), 4);
    expect(out.leftHand?.rotation?.[3]).toBeCloseTo(Math.cos(Math.PI / 8), 4);
  });

  it('passes through bones present in only one of the two poses', () => {
    const a: VRMPose = { leftHand: { rotation: [0, 0, 0, 1] } };
    const b: VRMPose = { rightHand: { rotation: [0, 0, 0, 1] } };
    const out = lerpPose(a, b, 0.5);
    expect(out.leftHand).toEqual(a.leftHand);
    expect(out.rightHand).toEqual(b.rightHand);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/lerpPose.test.ts`
Expected: FAIL — `Cannot find module './lerpPose'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/lerpPose.ts
import * as THREE from 'three';
import type { VRMPose } from '@pixiv/three-vrm';

/**
 * Slerps each bone's rotation between two poses. Position is ignored — this
 * engine only drives rotation. A bone present in only one of the two poses
 * passes through unchanged (there's no partner to blend with).
 */
export function lerpPose(a: VRMPose, b: VRMPose, t: number): VRMPose {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof VRMPose>;
  const out: VRMPose = {};
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();

  for (const key of keys) {
    const ta = a[key];
    const tb = b[key];
    if (ta && tb) {
      const ra = ta.rotation ?? [0, 0, 0, 1];
      const rb = tb.rotation ?? [0, 0, 0, 1];
      qa.set(ra[0], ra[1], ra[2], ra[3]);
      qb.set(rb[0], rb[1], rb[2], rb[3]);
      qa.slerp(qb, t);
      out[key] = { rotation: [qa.x, qa.y, qa.z, qa.w] };
    } else {
      out[key] = ta ?? tb;
    }
  }

  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/lerpPose.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lerpPose.ts src/lib/lerpPose.test.ts
git commit -m "feat(sign-engine): add lerpPose for VRMPose quaternion interpolation"
```

---

### Task 4: Extract `useVRMAvatar` from `Avatar3D`

This is a **behavior-preserving refactor**, not new functionality — verified by typecheck/build/manual run, not a new test (matches the existing codebase convention: `Avatar3D.tsx` has no test file today).

**Files:**
- Create: `src/hooks/useVRMAvatar.ts`
- Modify: `src/components/Avatar3D.tsx` (currently 204 lines)

**Interfaces:**
- Produces: `useVRMAvatar(path: string, controlsRef?: React.RefObject<OrbitControlsImpl | null>, defaultViewRef?: React.RefObject<DefaultView | null>): { vrm: VRM | null; scene: THREE.Group }`, and the `DefaultView` type.
- Note: the spec's shorthand signature is `useVRMAvatar(path, controlsRef?)`. The current `VRMAvatar` also captures a `defaultViewRef` snapshot (for `Avatar3D`'s reset-view button) as part of the same framing effect — extracting that "unchanged" means carrying `defaultViewRef` along as a third *optional* param, so the Pose Editor (Task 9, no reset button) can simply omit it.

- [ ] **Step 1: Create the hook, moving the box-centering/camera-framing logic out of `Avatar3D.tsx` unchanged**

```ts
// src/hooks/useVRMAvatar.ts
import { useEffect, useState } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// Fraction of the avatar's total height (feet at y=0) used as the vertical
// look-at point — lands roughly on the chest/upper torso for a standing
// humanoid, regardless of the model's actual proportions.
const CHEST_HEIGHT_RATIO = 0.6;
// Extra headroom multiplier on top of the tight vertical-fit distance so the
// head and feet stay clear of the viewport edges while orbiting.
const FRAMING_PADDING = 1.6;
// Zoom clamps as a ratio of the framing distance, so they scale with any
// model's own size instead of a fixed world-unit constant.
const MIN_ZOOM_RATIO = 0.4;
const MAX_ZOOM_RATIO = 2;

/** Camera position + OrbitControls target the view resets to. Captured once, when the model first frames itself. */
export interface DefaultView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface UseVRMAvatarResult {
  vrm: VRM | null;
  scene: THREE.Group;
}

/**
 * Loads a VRM at `path`, recenters it on its own bounding box, and frames
 * the camera/OrbitControls around its chest height. Shared by `Avatar3D`
 * and the dev-only Pose Editor so both reuse identical loading/framing
 * behavior. `controlsRef`/`defaultViewRef` are optional — the Pose Editor
 * has no OrbitControls clamping or reset-view button to wire up.
 */
export function useVRMAvatar(
  path: string,
  controlsRef?: React.RefObject<OrbitControlsImpl | null>,
  defaultViewRef?: React.RefObject<DefaultView | null>,
): UseVRMAvatarResult {
  const { camera } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);
  const gltf = useLoader(GLTFLoader, path, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (gltf.userData.vrm) {
      gltf.scene.add(gltf.userData.vrm.scene);
      setVrm(gltf.userData.vrm as VRM);
    }

    // Recenter on the model's own bounding box so this works for any GLB/VRM,
    // not just this specific avatar's authored pivot. Feet land on y=0 and
    // the horizontal center lands on the rotation axis (x=0, z=0), which is
    // what makes the idle spin read as turning around the body, not the feet.
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    gltf.scene.position.x -= center.x;
    gltf.scene.position.z -= center.z;
    gltf.scene.position.y -= box.min.y;

    const height = size.y;
    const chestHeight = height * CHEST_HEIGHT_RATIO;

    const perspCamera = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCamera.fov * Math.PI) / 180;
    const distance = (height / 2 / Math.tan(fovRad / 2)) * FRAMING_PADDING;

    perspCamera.position.set(0, chestHeight, distance);
    perspCamera.near = Math.max(distance / 100, 0.01);
    perspCamera.far = distance * 10;
    perspCamera.updateProjectionMatrix();

    const target = new THREE.Vector3(0, chestHeight, 0);
    if (controlsRef?.current) {
      controlsRef.current.target.copy(target);
      // Same `distance` used to frame the shot, so clamping scales with the model.
      controlsRef.current.minDistance = distance * MIN_ZOOM_RATIO;
      controlsRef.current.maxDistance = distance * MAX_ZOOM_RATIO;
      controlsRef.current.update();
    }

    // Captured once — the reset button snaps back to this, not to whatever
    // the camera happens to be at when clicked.
    if (defaultViewRef) {
      defaultViewRef.current = { position: perspCamera.position.clone(), target: target.clone() };
    }
  }, [gltf, camera, controlsRef, defaultViewRef]);

  return { vrm, scene: gltf.scene };
}
```

- [ ] **Step 2: Update `Avatar3D.tsx` to use the hook**

Replace the full current contents of `src/components/Avatar3D.tsx` with:

```tsx
// src/components/Avatar3D.tsx
import { Suspense, useCallback, useEffect, useRef, useState, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { useVRMAvatar, type DefaultView } from '../hooks/useVRMAvatar';

// Fallback background if the theme token can't be read (e.g. before mount).
const FALLBACK_SURFACE_COLOR = '#0f1419';

function readSurfaceColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
  return value || FALLBACK_SURFACE_COLOR;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-secondary font-mono">{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

/** Catches VRM load/parse failures so a broken model shows a message instead of a stuck spinner or a blank canvas. */
class AvatarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Avatar3D] Failed to load avatar model', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <span className="text-xs font-medium text-text-secondary">Couldn't load avatar</span>
        </Html>
      );
    }
    return this.props.children;
  }
}

interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
}

function VRMAvatar({ controlsRef, defaultViewRef }: VRMAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useVRMAvatar('/avatar/malesign.vrm', controlsRef, defaultViewRef);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

/** Keeps the canvas background in sync with the live --color-surface theme token. */
function ThemeBackground({ color }: { color: string }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [scene, color]);
  return null;
}

interface Avatar3DProps {
  className?: string;
}

export function Avatar3D({ className }: Avatar3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const defaultViewRef = useRef<DefaultView | null>(null);
  const [surfaceColor, setSurfaceColor] = useState(readSurfaceColor);

  useEffect(() => {
    // Theme switches in this app via a class swap on <html> (see ThemeContext),
    // not the OS prefers-color-scheme media query, so a MutationObserver on
    // that class attribute is what actually catches a live toggle.
    const root = document.documentElement;
    const observer = new MutationObserver(() => setSurfaceColor(readSurfaceColor()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleReset = useCallback(() => {
    const controls = controlsRef.current;
    const view = defaultViewRef.current;
    if (!controls || !view) return;
    controls.object.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  }, []);

  return (
    <div className={cn('relative w-full h-full min-h-80 rounded-2xl overflow-hidden', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        aria-label="Reset avatar view"
        className="glass absolute right-3 top-3 z-10 h-9 w-9 rounded-xl p-0"
      >
        <RotateCcw size={15} />
      </Button>
      <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
        <ThemeBackground color={surfaceColor} />
        <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} />
        <directionalLight position={[-3, 3, -3]} intensity={0.35} />
        <AvatarErrorBoundary>
          <Suspense fallback={<Loader />}>
            <VRMAvatar controlsRef={controlsRef} defaultViewRef={defaultViewRef} />
          </Suspense>
        </AvatarErrorBoundary>
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc -b && npm run build`
Expected: both succeed with no errors (confirms `useLoader`/`VRMLoaderPlugin`/`GLTFLoader` are no longer imported in `Avatar3D.tsx` — they moved to the hook — and nothing is left unused, since `noUnusedLocals`/`noUnusedParameters` are on).

- [ ] **Step 4: Manually verify no behavior regression**

Run: `npm run dev`, open the app, sign in, go to `/workspace`, click the "Text → Sign" mode button (the composer being disabled doesn't block the mode switch).
Expected: the avatar canvas renders exactly as before — model loads, is centered/framed on first load, orbit-drag rotates it, scroll zooms with the same clamps, the reset-view button (top-right circular arrow icon) snaps the camera back, and the canvas background still matches the current theme.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useVRMAvatar.ts src/components/Avatar3D.tsx
git commit -m "refactor(sign-engine): extract useVRMAvatar hook from Avatar3D"
```

---

### Task 5: `useSignPlayer` + `SignPlaybackController`

**Files:**
- Create: `src/hooks/useSignPlayer.ts`
- Test: `src/hooks/useSignPlayer.test.ts`

**Interfaces:**
- Consumes: `SignManifest`/`SignClip` (Task 1), `lerpPose` (Task 3)
- Produces: `SignPlaybackController` class (`play(clipKeys: string[])`, `stop()`, `tick(delta: number)`, `.state: 'idle' | 'playing' | 'done'`) and `useSignPlayer(vrm: VRM | null, manifest: SignManifest): { state: SignPlayerState; play: (clipKeys: string[]) => void; stop: () => void }`. Both are exported from the same file — `SignPlaybackController` is the framework-independent piece the tests exercise directly; `useSignPlayer` is a thin `useFrame` wrapper around it, consumed by `Avatar3D` (Task 6) and `PoseEditor` (Task 9).

- [ ] **Step 1: Write the failing tests**

```ts
// src/hooks/useSignPlayer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SignPlaybackController } from './useSignPlayer';
import type { SignManifest } from '../data/signManifest';

describe('SignPlaybackController', () => {
  it('play([]) leaves state at idle', () => {
    const applyPose = vi.fn();
    const controller = new SignPlaybackController({}, applyPose);
    controller.play([]);
    expect(controller.state).toBe('idle');
  });

  it('play() with all-missing keys leaves state at idle', () => {
    const applyPose = vi.fn();
    const controller = new SignPlaybackController({}, applyPose);
    controller.play(['A', 'B']);
    expect(controller.state).toBe('idle');
  });

  it('play() with a resolvable key transitions to playing, then done once the sequence finishes', () => {
    const applyPose = vi.fn();
    const manifest: SignManifest = {
      A: { duration: 1, keyframes: [{ time: 0, pose: { leftHand: { rotation: [0, 0, 0, 1] } } }] },
    };
    const controller = new SignPlaybackController(manifest, applyPose);
    controller.play(['A']);
    expect(controller.state).toBe('playing');

    controller.tick(1.5); // past the 1s clip duration
    expect(controller.state).toBe('done');
    expect(applyPose).toHaveBeenCalled();
  });

  it('skips clip keys with no manifest entry mid-sequence', () => {
    const applyPose = vi.fn();
    const manifest: SignManifest = {
      A: { duration: 0.1, keyframes: [{ time: 0, pose: {} }] },
    };
    const controller = new SignPlaybackController(manifest, applyPose);
    controller.play(['A', 'ZZZ']); // 'ZZZ' isn't in the manifest
    controller.tick(0.2); // finishes 'A'
    expect(controller.state).toBe('done'); // no second clip to play
  });

  it('stop() resets state to idle', () => {
    const applyPose = vi.fn();
    const manifest: SignManifest = { A: { duration: 1, keyframes: [{ time: 0, pose: {} }] } };
    const controller = new SignPlaybackController(manifest, applyPose);
    controller.play(['A']);
    controller.stop();
    expect(controller.state).toBe('idle');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/useSignPlayer.test.ts`
Expected: FAIL — `Cannot find module './useSignPlayer'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useSignPlayer.ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { VRM, VRMPose } from '@pixiv/three-vrm';
import type { SignManifest, SignClip } from '../data/signManifest';
import { lerpPose } from '../lib/lerpPose';

export type SignPlayerState = 'idle' | 'playing' | 'done';

// Blend time between the end of one clip and the start of the next so
// consecutive signs don't visibly snap.
const CROSSFADE_SECONDS = 0.15;

interface QueuedClip {
  key: string;
  clip: SignClip;
}

function poseAtLocalTime(clip: SignClip, t: number): VRMPose {
  const kfs = clip.keyframes;
  if (kfs.length === 1) return kfs[0].pose;
  if (t <= kfs[0].time) return kfs[0].pose;
  const last = kfs[kfs.length - 1];
  if (t >= last.time) return last.pose;
  for (let i = 0; i < kfs.length - 1; i++) {
    const from = kfs[i];
    const to = kfs[i + 1];
    if (t >= from.time && t <= to.time) {
      const localT = (t - from.time) / (to.time - from.time);
      return lerpPose(from.pose, to.pose, localT);
    }
  }
  return last.pose;
}

/**
 * Framework-independent playback state machine — no useFrame/Canvas
 * dependency, so it's unit-testable directly (unlike the hook below, which
 * requires a live R3F render tree).
 */
export class SignPlaybackController {
  state: SignPlayerState = 'idle';
  private manifest: SignManifest;
  private onApplyPose: (pose: VRMPose) => void;
  private queue: QueuedClip[] = [];
  private index = 0;
  private clipElapsed = 0;
  private previousPose: VRMPose | null = null;

  constructor(manifest: SignManifest, onApplyPose: (pose: VRMPose) => void) {
    this.manifest = manifest;
    this.onApplyPose = onApplyPose;
  }

  play(clipKeys: string[]) {
    this.queue = clipKeys
      .filter((key) => this.manifest[key])
      .map((key) => ({ key, clip: this.manifest[key] }));
    this.index = 0;
    this.clipElapsed = 0;
    this.previousPose = null;
    this.state = this.queue.length > 0 ? 'playing' : 'idle';
  }

  stop() {
    this.queue = [];
    this.index = 0;
    this.clipElapsed = 0;
    this.previousPose = null;
    this.state = 'idle';
  }

  tick(delta: number) {
    if (this.state !== 'playing') return;
    const current = this.queue[this.index];
    this.clipElapsed += delta;

    let pose = poseAtLocalTime(current.clip, this.clipElapsed);
    if (this.previousPose && this.clipElapsed < CROSSFADE_SECONDS) {
      pose = lerpPose(this.previousPose, pose, this.clipElapsed / CROSSFADE_SECONDS);
    }
    this.onApplyPose(pose);

    if (this.clipElapsed >= current.clip.duration) {
      this.previousPose = poseAtLocalTime(current.clip, current.clip.duration);
      this.index += 1;
      this.clipElapsed = 0;
      this.state = this.index >= this.queue.length ? 'done' : 'playing';
    }
  }
}

interface UseSignPlayerResult {
  state: SignPlayerState;
  play: (clipKeys: string[]) => void;
  stop: () => void;
}

/**
 * Steps through a resolved sequence of clips inside the R3F render loop.
 * Must call `vrm.update(delta)` every frame the VRM exists — with
 * `autoUpdateHumanBones` on (the default), the skinned mesh's raw skeleton
 * only picks up a normalized pose inside `vrm.update()`; skipping it applies
 * the pose with no error and no visible movement.
 */
export function useSignPlayer(vrm: VRM | null, manifest: SignManifest): UseSignPlayerResult {
  const [state, setState] = useState<SignPlayerState>('idle');
  const controllerRef = useRef<SignPlaybackController | null>(null);

  const controller = useMemo(
    () => new SignPlaybackController(manifest, (pose) => vrm?.humanoid?.setNormalizedPose(pose)),
    [manifest, vrm],
  );
  controllerRef.current = controller;

  useFrame((_, delta) => {
    if (!vrm) return;
    controller.tick(delta);
    vrm.update(delta);
    if (controller.state !== state) setState(controller.state);
  });

  const play = useCallback((clipKeys: string[]) => {
    controllerRef.current?.play(clipKeys);
    setState(controllerRef.current?.state ?? 'idle');
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
    setState('idle');
  }, []);

  return { state, play, stop };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/useSignPlayer.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSignPlayer.ts src/hooks/useSignPlayer.test.ts
git commit -m "feat(sign-engine): add useSignPlayer and SignPlaybackController"
```

---

### Task 6: Wire `playRequest`/`onPlaybackStateChange` into `Avatar3D`

**Files:**
- Modify: `src/components/Avatar3D.tsx`

**Interfaces:**
- Consumes: `resolveText` (Task 2), `useSignPlayer`/`SignPlayerState` (Task 5), `signManifest` (Task 1)
- Produces: `Avatar3DProps` gains `playRequest?: { text: string; id: number } | null` and `onPlaybackStateChange?: (state: SignPlayerState) => void`

- [ ] **Step 1: Add the imports**

In `src/components/Avatar3D.tsx`, add alongside the existing imports:

```tsx
import { useSignPlayer, type SignPlayerState } from '../hooks/useSignPlayer';
import { resolveText } from '../lib/resolveText';
import { signManifest } from '../data/signManifest';
```

- [ ] **Step 2: Thread the new props through `VRMAvatarProps` and `VRMAvatar`**

Replace:

```tsx
interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
}

function VRMAvatar({ controlsRef, defaultViewRef }: VRMAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useVRMAvatar('/avatar/malesign.vrm', controlsRef, defaultViewRef);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
```

with:

```tsx
interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
  playRequest?: { text: string; id: number } | null;
  onPlaybackStateChange?: (state: SignPlayerState) => void;
}

function VRMAvatar({ controlsRef, defaultViewRef, playRequest, onPlaybackStateChange }: VRMAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm', controlsRef, defaultViewRef);
  const { state, play } = useSignPlayer(vrm, signManifest);

  useEffect(() => {
    onPlaybackStateChange?.(state);
  }, [state, onPlaybackStateChange]);

  useEffect(() => {
    if (!playRequest) return;
    if (!vrm) return; // dropped — no VRM to animate yet; not retried once it loads
    play(resolveText(playRequest.text, signManifest));
    // Intentionally keyed on `playRequest.id` alone, not `.text` — resubmitting
    // identical text (same string, new id) must still retrigger playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playRequest?.id]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
```

- [ ] **Step 3: Thread the new props through `Avatar3D`**

Replace:

```tsx
interface Avatar3DProps {
  className?: string;
}

export function Avatar3D({ className }: Avatar3DProps) {
```

with:

```tsx
interface Avatar3DProps {
  className?: string;
  playRequest?: { text: string; id: number } | null;
  onPlaybackStateChange?: (state: SignPlayerState) => void;
}

export function Avatar3D({ className, playRequest, onPlaybackStateChange }: Avatar3DProps) {
```

And replace the `<VRMAvatar controlsRef={controlsRef} defaultViewRef={defaultViewRef} />` render with:

```tsx
<VRMAvatar
  controlsRef={controlsRef}
  defaultViewRef={defaultViewRef}
  playRequest={playRequest}
  onPlaybackStateChange={onPlaybackStateChange}
/>
```

- [ ] **Step 4: Typecheck, build, and run the full test suite**

Run: `npx tsc -b && npm run build && npx vitest run`
Expected: all succeed; every existing test still passes (this task adds no new pure logic beyond what Tasks 2 and 5 already cover).

- [ ] **Step 5: Manually verify no regression**

Run: `npm run dev`, go to `/workspace` → "Text → Sign" mode.
Expected: identical to Task 4's manual check — `Workspace.tsx` still renders `<Avatar3D />` with no `playRequest`, so nothing new is exercised yet, but nothing is broken either.

- [ ] **Step 6: Commit**

```bash
git add src/components/Avatar3D.tsx
git commit -m "feat(sign-engine): wire playRequest/onPlaybackStateChange into Avatar3D"
```

---

### Task 7: Pose-editor math helpers

**Files:**
- Create: `src/lib/poseEditorMath.ts`
- Test: `src/lib/poseEditorMath.test.ts`

**Interfaces:**
- Produces: `EulerDegrees { x: number; y: number; z: number }`, `eulerDegreesToQuaternion(euler: EulerDegrees): [number, number, number, number]`, `quaternionToEulerDegrees(rotation: [number, number, number, number]): EulerDegrees`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/poseEditorMath.test.ts
import { describe, it, expect } from 'vitest';
import { eulerDegreesToQuaternion, quaternionToEulerDegrees } from './poseEditorMath';

describe('eulerDegreesToQuaternion', () => {
  it('returns the identity quaternion for zero rotation', () => {
    const [x, y, z, w] = eulerDegreesToQuaternion({ x: 0, y: 0, z: 0 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
    expect(w).toBeCloseTo(1);
  });

  it('encodes a 90° rotation around Y', () => {
    const [x, y, z, w] = eulerDegreesToQuaternion({ x: 0, y: 90, z: 0 });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(Math.SQRT1_2, 4);
    expect(z).toBeCloseTo(0);
    expect(w).toBeCloseTo(Math.SQRT1_2, 4);
  });
});

describe('quaternionToEulerDegrees', () => {
  it('round-trips through eulerDegreesToQuaternion', () => {
    const original = { x: 15, y: -30, z: 45 };
    const rotation = eulerDegreesToQuaternion(original);
    const back = quaternionToEulerDegrees(rotation);
    expect(back.x).toBeCloseTo(original.x, 2);
    expect(back.y).toBeCloseTo(original.y, 2);
    expect(back.z).toBeCloseTo(original.z, 2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/poseEditorMath.test.ts`
Expected: FAIL — `Cannot find module './poseEditorMath'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/poseEditorMath.ts
import * as THREE from 'three';

export interface EulerDegrees {
  x: number;
  y: number;
  z: number;
}

/** Bone-slider degrees (XYZ Euler) → a VRMPoseTransform-style quaternion [x,y,z,w]. */
export function eulerDegreesToQuaternion(euler: EulerDegrees): [number, number, number, number] {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rad(euler.x), rad(euler.y), rad(euler.z), 'XYZ'),
  );
  return [q.x, q.y, q.z, q.w];
}

/** Inverse of eulerDegreesToQuaternion — used to re-populate sliders when loading an existing pose into the editor. */
export function quaternionToEulerDegrees(rotation: [number, number, number, number]): EulerDegrees {
  const [x, y, z, w] = rotation;
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(x, y, z, w), 'XYZ');
  const deg = (rad: number) => (rad * 180) / Math.PI;
  return { x: deg(euler.x), y: deg(euler.y), z: deg(euler.z) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/poseEditorMath.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/poseEditorMath.ts src/lib/poseEditorMath.test.ts
git commit -m "feat(sign-engine): add pose-editor Euler/quaternion conversion helpers"
```

---

### Task 8: `BoneSlider` component

Purely presentational — a labeled native `<input type="range">`. No branching logic worth a unit test.

**Files:**
- Create: `src/components/BoneSlider.tsx`

**Interfaces:**
- Produces: `<BoneSlider label value onChange min? max? className? />`

- [ ] **Step 1: Create the component**

```tsx
// src/components/BoneSlider.tsx
import { cn } from '../utils/cn';

interface BoneSliderProps {
  label: string;
  value: number; // degrees
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/** A single-axis bone-rotation slider (degrees) for the dev-only Pose Editor. */
export function BoneSlider({ label, value, onChange, min = -180, max = 180, className }: BoneSliderProps) {
  return (
    <label className={cn('flex flex-col gap-1 text-xs', className)}>
      <span className="flex items-center justify-between font-mono text-text-secondary">
        <span>{label}</span>
        <span>{value.toFixed(0)}°</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </label>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/BoneSlider.tsx
git commit -m "feat(sign-engine): add BoneSlider component"
```

---

### Task 9: Pose Editor page + dev-only route

**Files:**
- Create: `src/pages/PoseEditor.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVRMAvatar` (Task 4), `useSignPlayer` (Task 5), `eulerDegreesToQuaternion`/`EulerDegrees` (Task 7), `BoneSlider` (Task 8), `SignClip`/`SignKeyframe`/`SignManifest` (Task 1)
- Produces: `PoseEditor` page component, route `/dev/pose-editor`

- [ ] **Step 1: Create the Pose Editor page**

```tsx
// src/pages/PoseEditor.tsx
import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { useVRMAvatar } from '../hooks/useVRMAvatar';
import { useSignPlayer } from '../hooks/useSignPlayer';
import { eulerDegreesToQuaternion, type EulerDegrees } from '../lib/poseEditorMath';
import { BoneSlider } from '../components/BoneSlider';
import { Button } from '../components/Button';
import type { SignClip, SignKeyframe, SignManifest } from '../data/signManifest';

const BONE_GROUPS: { label: string; bones: VRMHumanBoneName[] }[] = [
  { label: 'Spine', bones: ['spine', 'chest', 'neck', 'head'] },
  { label: 'Shoulder', bones: ['leftShoulder', 'rightShoulder'] },
  {
    label: 'Arm',
    bones: ['leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
  },
  {
    label: 'Fingers',
    bones: [
      'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
    ],
  },
];

const ALL_BONES = BONE_GROUPS.flatMap((g) => g.bones);
const ZERO: EulerDegrees = { x: 0, y: 0, z: 0 };

function anglesToPose(angles: Record<string, EulerDegrees>): VRMPose {
  const pose: VRMPose = {};
  for (const bone of ALL_BONES) {
    const a = angles[bone];
    if (!a || (a.x === 0 && a.y === 0 && a.z === 0)) continue;
    pose[bone] = { rotation: eulerDegreesToQuaternion(a) };
  }
  return pose;
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PoseEditorSceneProps {
  angles: Record<string, EulerDegrees>;
  previewManifest: SignManifest;
  previewKey: string;
  previewRequestId: number;
}

function PoseEditorScene({ angles, previewManifest, previewKey, previewRequestId }: PoseEditorSceneProps) {
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm');
  const { state, play } = useSignPlayer(vrm, previewManifest);
  const lastPreviewId = useRef(0);

  useEffect(() => {
    if (previewRequestId !== lastPreviewId.current) {
      lastPreviewId.current = previewRequestId;
      play([previewKey]);
    }
  }, [previewRequestId, previewKey, play]);

  useFrame(() => {
    if (!vrm) return;
    // Live slider feedback: drive the pose from the current slider angles
    // every frame, except mid-preview — otherwise this would fight
    // useSignPlayer's own per-frame pose application.
    if (state !== 'playing') {
      vrm.humanoid?.setNormalizedPose(anglesToPose(angles));
      vrm.update(0);
    }
  });

  return <primitive object={scene} />;
}

export function PoseEditor() {
  const [targetKey, setTargetKey] = useState('A');
  const [angles, setAngles] = useState<Record<string, EulerDegrees>>({});
  const [keyframes, setKeyframes] = useState<SignKeyframe[]>([]);
  const [offsetSeconds, setOffsetSeconds] = useState(0.5);
  const [previewRequestId, setPreviewRequestId] = useState(0);

  const setAngle = (bone: string, axis: keyof EulerDegrees, value: number) => {
    setAngles((prev) => ({ ...prev, [bone]: { ...(prev[bone] ?? ZERO), [axis]: value } }));
  };

  const addKeyframe = () => {
    const time = keyframes.length === 0 ? 0 : keyframes[keyframes.length - 1].time + offsetSeconds;
    setKeyframes((prev) => [...prev, { time, pose: anglesToPose(angles) }]);
  };

  const removeKeyframe = (index: number) => {
    setKeyframes((prev) => prev.filter((_, i) => i !== index));
  };

  const clip: SignClip = useMemo(
    () => ({
      duration: keyframes.length > 0 ? keyframes[keyframes.length - 1].time + 0.5 : 0,
      keyframes,
    }),
    [keyframes],
  );

  const previewManifest: SignManifest = useMemo(() => ({ [targetKey]: clip }), [targetKey, clip]);

  const handleExport = () => {
    if (keyframes.length === 0) return;
    downloadJSON(`${targetKey}.json`, clip);
  };

  return (
    <div className="flex h-screen w-full bg-background text-text-primary">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-border p-4 space-y-4">
        <div>
          <label className="text-xs font-mono text-text-secondary">Target key</label>
          <input
            value={targetKey}
            onChange={(e) => setTargetKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
        </div>

        {BONE_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{group.label}</h3>
            {group.bones.map((bone) => (
              <div key={bone} className="mt-2 space-y-1">
                <p className="font-mono text-[10px] text-text-secondary">{bone}</p>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <BoneSlider
                    key={axis}
                    label={axis.toUpperCase()}
                    value={(angles[bone] ?? ZERO)[axis]}
                    onChange={(v) => setAngle(bone, axis, v)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}

        <div className="space-y-2 border-t border-border pt-4">
          <label className="text-xs font-mono text-text-secondary">Offset from previous keyframe (s)</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={offsetSeconds}
            onChange={(e) => setOffsetSeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={addKeyframe}>
            Add keyframe
          </Button>
          <ul className="text-xs font-mono text-text-secondary">
            {keyframes.map((kf, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>t={kf.time.toFixed(2)}s</span>
                <button onClick={() => removeKeyframe(i)} className="text-ember">
                  remove
                </button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewRequestId((id) => id + 1)}
            disabled={keyframes.length === 0}
          >
            Preview
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExport} disabled={keyframes.length === 0}>
            Export
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
          <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} />
          <Suspense fallback={null}>
            <PoseEditorScene
              angles={angles}
              previewManifest={previewManifest}
              previewKey={targetKey}
              previewRequestId={previewRequestId}
            />
          </Suspense>
          <OrbitControls enablePan enableZoom minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
        </Canvas>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register the dev-only route in `App.tsx`**

In `src/App.tsx`, add a dev-only lazy import alongside the existing page imports:

```tsx
const PoseEditor = import.meta.env.DEV
  ? lazy(() => import('./pages/PoseEditor').then((m) => ({ default: m.PoseEditor })))
  : null;
```

Then add a standalone route (no sidebar, no auth) inside `<Routes>`, before the closing `</Routes>` tag:

```tsx
{import.meta.env.DEV && PoseEditor && (
  <Route path="/dev/pose-editor" element={<PoseEditor />} />
)}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Build for production and confirm the route is excluded from the bundle**

Run: `npm run build`
Expected: succeeds. Then check the output:

Run (PowerShell): `Select-String -Path dist/assets/*.js -Pattern "pose-editor" -SimpleMatch`
Expected: no matches — confirms `import.meta.env.DEV` was replaced with `false` and the dead `lazy(() => import('./pages/PoseEditor'))` branch (and its chunk) were eliminated from the production build, not just hidden behind a runtime check.

- [ ] **Step 5: Manually verify the editor works in dev**

Run: `npm run dev`, navigate to `http://localhost:5173/dev/pose-editor` (adjust port if different).
Expected: the avatar loads in the canvas; dragging any bone slider visibly rotates that part of the model in real time; "Add keyframe" appends a `t=…s` row to the list; "Preview" (enabled once at least one keyframe exists) plays the accumulated pose(s) on the model; "Export" downloads a `<targetKey>.json` file whose contents match the `SignClip` shape (`{ duration, keyframes: [{ time, pose }] }`).

- [ ] **Step 6: Commit**

```bash
git add src/pages/PoseEditor.tsx src/App.tsx
git commit -m "feat(sign-engine): add dev-only Pose Editor at /dev/pose-editor"
```

---

### Task 10: Mark the two superseded draft plans

The approved spec (`docs/superpowers/specs/2026-07-27-sign-animation-engine-design.md`) states both prior draft plans conflict with this design and should be treated as superseded now that an implementation plan exists. Neither is deleted — one is already committed project history — just marked so nobody executes them by mistake.

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-text-to-sign-avatar-animation.md`
- Modify: `docs/superpowers/plans/2026-07-27-text-to-sign-redesign.md`

- [ ] **Step 1: Prepend a superseded notice to each file**

At the very top of `docs/superpowers/plans/2026-07-26-text-to-sign-avatar-animation.md`, before its existing first line, insert:

```markdown
> **Superseded.** This plan predates `docs/superpowers/specs/2026-07-27-sign-animation-engine-design.md`
> and conflicts with it (`sequence: VRMPose[]` prop vs. the approved `playRequest`/`onPlaybackStateChange`
> design; raw pose snapshots vs. this spec's JSON keyframe clips). Do not execute this plan — see
> `docs/superpowers/plans/2026-07-27-sign-animation-engine.md` instead.

---

```

Do the same at the top of `docs/superpowers/plans/2026-07-27-text-to-sign-redesign.md`, adjusting the second sentence to: "conflicts with it (`isAnimating: boolean` prop driven by a fake `setTimeout` vs. the approved `playRequest`/`onPlaybackStateChange` design)."

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-07-26-text-to-sign-avatar-animation.md docs/superpowers/plans/2026-07-27-text-to-sign-redesign.md
git commit -m "docs: mark pre-spec text-to-sign draft plans as superseded"
```

---

## Self-Review Notes

**Spec coverage:** `resolveText` (Task 2), JSON keyframe clip format + manifest (Task 1), `useSignPlayer`/crossfade/`vrm.update(delta)` (Task 5), `Avatar3D` integration additive/optional (Task 6), Pose Editor dev route + BoneSliders + Add/Preview/Export workflow (Tasks 7–9), `useVRMAvatar` extraction reused by both `Avatar3D` and `PoseEditor` (Task 4, consumed in Task 9), empty-manifest and partially-authored fallback behavior (covered by `resolveText`/`SignPlaybackController` tests in Tasks 2 and 5), testing scope matching the spec's Testing section exactly (Tasks 2, 3, 5, 7). Out-of-scope items (visual redesign, content authoring, multi-language, `.vrma` export) are correctly not addressed by any task.

**Type consistency:** `SignManifest`/`SignClip`/`SignKeyframe` (Task 1) are the same names/shapes used in `resolveText` (Task 2), `useSignPlayer`/`SignPlaybackController` (Task 5), and `PoseEditor` (Task 9). `DefaultView` (Task 4) is exported from the hook and imported by `Avatar3D.tsx`. `SignPlayerState` (Task 5) is imported by both `Avatar3D.tsx` (Task 6) and available to `PoseEditor.tsx` if needed. `EulerDegrees` (Task 7) is consumed by `BoneSlider`'s caller and `PoseEditor` (Tasks 8–9) consistently.
