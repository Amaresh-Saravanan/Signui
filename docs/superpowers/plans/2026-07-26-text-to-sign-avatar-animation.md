# Text-to-Sign Avatar Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended for parallel execution) or superpowers:executing-plans for sequential execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to type text in the Workspace, and watch the avatar fingerspell letter-by-letter and sign curated phrases (HELLO, THANK YOU, YES, NO) with natural hand/arm poses captured from the VRM rig.

**Architecture:** Three layers: (1) a pose library (static JSON data keyed by letter/phrase), (2) a pure text→pose resolution + playback engine that steps through pose sequences frame-by-frame with smooth interpolation, (3) a browser-based Pose Editor (dev-only) for authoring poses via bone sliders, and (4) UI integration that re-enables the text input and wires playback to Avatar3D. The VRM loading logic is extracted into a shared hook so both Avatar3D and PoseEditor reuse it.

**Tech Stack:** @pixiv/three-vrm@3.5.5 (VRMPose data model), React + useFrame (playback loop), Vitest (unit tests for text→pose resolution).

## Global Constraints

- No external pose authoring tools required — everything happens in-browser via the Pose Editor
- VRMPose format (from three-vrm) is the only pose representation used; capture and playback are identical
- Fingerspelling is A–Z (26 letters); phrase signs start with 4 curated phrases (HELLO, THANK YOU, YES, NO) and can be extended
- Minimum 24 fps playback on the avatar (uses existing three-fiber useFrame)
- All pose data is JSON serializable and lives in `src/data/`

---

## File Structure

**New files:**
- `src/data/fingerspellingPoses.ts` — Record<'A'|'B'|...|'Z', VRMPose>
- `src/data/phraseSigns.ts` — Record<string, VRMPose[]>
- `src/lib/signPlayback.ts` — `resolveText()` and pose sequence logic (pure functions)
- `src/hooks/useSignPlayer.ts` — React hook driving playback each frame
- `src/hooks/useVRMAvatar.ts` — Extracted VRM loading logic (shared by Avatar3D + PoseEditor)
- `src/pages/PoseEditor.tsx` — Dev-only pose authoring UI
- `src/components/BoneSlider.tsx` — Reusable bone rotation slider component

**Modified files:**
- `src/components/Avatar3D.tsx` — consume `useVRMAvatar` hook, accept `sequence` prop
- `src/pages/Workspace.tsx` — re-enable text input in text-to-sign mode, wire `resolveText()` to Avatar3D
- `src/App.tsx` — add dev route `/dev/pose-editor`

**Test files:**
- `src/__tests__/signPlayback.test.ts` — unit tests for `resolveText()`

---

## Dependency Graph

```
Task 1: Data Models (fingerspellingPoses, phraseSigns)
  ↓
Task 2: Pure Playback Engine (signPlayback.ts) ⟂ Task 3: Refactor VRM Loading Hook
  ↓                                                 ↓
Task 4: Avatar3D Integration ← ← ← ← ← ← ← ← ← ←  
Task 5: Pose Editor
  ↓
Task 6: Playback Hook (useSignPlayer.ts)
  ↓
Task 7: Workspace Integration (enable text input, wire to Avatar3D)
  ↓
Task 8: Manual Pose Authoring (Iteration)
  ↓
Task 9: Final Polish & Testing
```

**Parallelizable:** Tasks 2–5 can run independently after Task 1. Tasks 6–7 depend on 2–5 being complete.

---

## Task 1: Data Models

**Files:**
- Create: `src/data/fingerspellingPoses.ts`
- Create: `src/data/phraseSigns.ts`

**Interfaces:**
- Produces: `Record<'A'|'B'|...|'Z', VRMPose>` (fingerspellingPoses), `Record<string, VRMPose[]>` (phraseSigns)
- Note: `VRMPose` is imported from `@pixiv/three-vrm` and is a `Record<VRMHumanBoneName, { position?: Vector3, rotation?: Quaternion, scale?: Vector3 }>`

- [ ] **Step 1: Create empty fingerspelling poses file**

```typescript
// src/data/fingerspellingPoses.ts
import type { VRMPose } from '@pixiv/three-vrm';

/**
 * Fingerspelling poses for A–Z.
 * Each pose is a VRMPose (bone name → transform) in normalized space.
 * Captured from the avatar via the Pose Editor.
 */
export const fingerspellingPoses: Record<string, VRMPose> = {
  A: {},
  B: {},
  C: {},
  D: {},
  E: {},
  F: {},
  G: {},
  H: {},
  I: {},
  J: {},
  K: {},
  L: {},
  M: {},
  N: {},
  O: {},
  P: {},
  Q: {},
  R: {},
  S: {},
  T: {},
  U: {},
  V: {},
  W: {},
  X: {},
  Y: {},
  Z: {},
};
```

- [ ] **Step 2: Create empty phrase signs file**

```typescript
// src/data/phraseSigns.ts
import type { VRMPose } from '@pixiv/three-vrm';

/**
 * Multi-keyframe poses for complete phrases/words.
 * Each phrase maps to an ordered sequence of VRMPose keyframes.
 * Single-keyframe phrases are static signs; multi-keyframe are animated.
 */
export const phraseSigns: Record<string, VRMPose[]> = {
  hello: [{}],
  'thank you': [{}],
  yes: [{}],
  no: [{}],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/data/fingerspellingPoses.ts src/data/phraseSigns.ts
git commit -m "feat(sign-animation): add placeholder pose data for fingerspelling and phrases"
```

---

## Task 2: Pure Playback Engine

**Files:**
- Create: `src/lib/signPlayback.ts`
- Create: `src/__tests__/signPlayback.test.ts`

**Interfaces:**
- Consumes: `fingerspellingPoses` (Record<'A'|'B'|...|'Z', VRMPose>), `phraseSigns` (Record<string, VRMPose[]>)
- Produces: `resolveText(input: string): VRMPose[]` — returns a sequence of poses to play back

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/signPlayback.test.ts
import { describe, it, expect } from 'vitest';
import { resolveText } from '../lib/signPlayback';

describe('resolveText', () => {
  it('resolves a single letter to a fingerspelling pose', () => {
    const sequence = resolveText('A');
    expect(sequence).toHaveLength(1);
  });

  it('resolves multiple letters to multiple fingerspelling poses with inter-letter gaps', () => {
    const sequence = resolveText('ABC');
    expect(sequence.length).toBeGreaterThan(3);
  });

  it('prefers phrase lookup over letter-by-letter spelling', () => {
    const sequence = resolveText('hello');
    expect(sequence.length).toBeLessThan(5);
  });

  it('falls back to fingerspelling unknown words', () => {
    const sequence = resolveText('xyz');
    expect(sequence.length).toBeGreaterThan(1);
  });

  it('skips unknown characters (numbers, punctuation)', () => {
    const sequence = resolveText('A1B!C');
    expect(sequence.length).toBeLessThan(10);
  });

  it('handles mixed case by lowercasing', () => {
    const seq1 = resolveText('hello');
    const seq2 = resolveText('HELLO');
    expect(seq1.length).toBe(seq2.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/__tests__/signPlayback.test.ts
```

Expected: FAIL — "resolveText not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/signPlayback.ts
import type { VRMPose } from '@pixiv/three-vrm';
import { fingerspellingPoses } from '../data/fingerspellingPoses';
import { phraseSigns } from '../data/phraseSigns';

const INTER_LETTER_GAP: VRMPose = {};

/**
 * Resolve arbitrary English text into a sequence of VRMPose keyframes.
 * Looks up whole phrases first (case-insensitive); falls back to letter-by-letter
 * fingerspelling. Unknown characters (numbers, punctuation) are silently skipped.
 *
 * @param input User-typed text (e.g., "hello" or "thank you")
 * @returns Ordered array of VRMPose objects to play back sequentially
 */
export function resolveText(input: string): VRMPose[] {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return [];

  if (phraseSigns[normalized]) {
    return phraseSigns[normalized];
  }

  const sequence: VRMPose[] = [];
  for (const char of normalized) {
    if (char === ' ') continue;

    const letter = char.toUpperCase();
    if (letter in fingerspellingPoses) {
      sequence.push(fingerspellingPoses[letter as keyof typeof fingerspellingPoses]);
      sequence.push(INTER_LETTER_GAP);
    }
  }

  return sequence;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- src/__tests__/signPlayback.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/signPlayback.ts src/__tests__/signPlayback.test.ts
git commit -m "feat(sign-animation): add resolveText engine for text-to-pose resolution"
```

---

## Task 3: Extract VRM Loading Hook

**Files:**
- Create: `src/hooks/useVRMAvatar.ts`
- Modify: `src/components/Avatar3D.tsx`

**Interfaces:**
- Consumes: VRM loading logic from Avatar3D (currently inline)
- Produces: `useVRMAvatar(avatarPath, controlsRef): { vrm: VRM | null, scene: THREE.Group }`

- [ ] **Step 1: Extract the VRM loading logic into a hook**

```typescript
// src/hooks/useVRMAvatar.ts
import { useEffect, useRef } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const CHEST_HEIGHT_RATIO = 0.6;
const FRAMING_PADDING = 1.6;
const MIN_ZOOM_RATIO = 0.4;
const MAX_ZOOM_RATIO = 2;

interface UseVRMAvatarResult {
  vrm: VRM | null;
  scene: THREE.Group;
}

/**
 * Load and frame a VRM avatar.
 * Recenters model with feet on y=0, positions camera to frame the full avatar.
 * Used by Avatar3D and PoseEditor.
 */
export function useVRMAvatar(
  avatarPath: string,
  controlsRef?: React.RefObject<any> | null,
): UseVRMAvatarResult {
  const { camera } = useThree();
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Group>(new THREE.Group());

  const gltf = useLoader(GLTFLoader, avatarPath, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (!gltf.userData.vrm) return;

    const vrm = gltf.userData.vrm as VRM;
    vrmRef.current = vrm;

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
      controlsRef.current.minDistance = distance * MIN_ZOOM_RATIO;
      controlsRef.current.maxDistance = distance * MAX_ZOOM_RATIO;
      controlsRef.current.update();
    }

    sceneRef.current.add(gltf.scene);
  }, [gltf, camera, controlsRef]);

  return {
    vrm: vrmRef.current,
    scene: sceneRef.current,
  };
}
```

- [ ] **Step 2: Refactor Avatar3D to use the hook**

Update `src/components/Avatar3D.tsx`:
- Replace the inline `useLoader` + `useEffect` in `VRMAvatar` with `const { vrm } = useVRMAvatar('/avatar/malesign.vrm', controlsRef);`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVRMAvatar.ts src/components/Avatar3D.tsx
git commit -m "refactor(avatar): extract VRM loading into shared useVRMAvatar hook"
```

---

## Task 4: Avatar3D Integration

**Files:**
- Modify: `src/components/Avatar3D.tsx`

**Interfaces:**
- Consumes: `sequence?: VRMPose[]`
- Produces: Avatar3D renders and can play a pose sequence if provided

- [ ] **Step 1: Add sequence prop to Avatar3D**

Add to the `Avatar3DProps` interface and pass through to `VRMAvatar`:

```typescript
interface Avatar3DProps {
  className?: string;
  sequence?: VRMPose[];
}

// In the Avatar3D export, pass sequence to VRMAvatar
<VRMAvatar
  controlsRef={controlsRef}
  defaultViewRef={defaultViewRef}
  sequence={sequence}
/>
```

- [ ] **Step 2: Update VRMAvatar to accept sequence prop**

```typescript
interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
  sequence?: VRMPose[];
}

function VRMAvatar({ controlsRef, defaultViewRef, sequence }: VRMAvatarProps) {
  const { vrm } = useVRMAvatar('/avatar/malesign.vrm', controlsRef);
  // Playback hook wired in Task 6
  return <group ref={groupRef}>{/* ... */}</group>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Avatar3D.tsx
git commit -m "feat(avatar): add sequence prop for playback"
```

---

## Task 5: Pose Editor (Dev-Only Authoring UI)

**Files:**
- Create: `src/components/BoneSlider.tsx`
- Create: `src/pages/PoseEditor.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVRMAvatar(avatarPath, controlsRef)`
- Produces: Dev-only page at `/dev/pose-editor` for authoring poses

- [ ] **Step 1: Create BoneSlider component**

```typescript
// src/components/BoneSlider.tsx
interface BoneSliderProps {
  boneName: string;
  axis: 'x' | 'y' | 'z';
  value: number;
  onChange: (value: number) => void;
}

export function BoneSlider({ boneName, axis, value, onChange }: BoneSliderProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-32 text-xs font-mono">{boneName}.{axis}</label>
      <input
        type="range"
        min="-3.14"
        max="3.14"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
      />
      <span className="w-12 text-right text-xs font-mono">{value.toFixed(2)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create PoseEditor page**

```typescript
// src/pages/PoseEditor.tsx (full implementation with Canvas, sliders, save UI)
// See plan for complete code snippet above
```

- [ ] **Step 3: Add route to App.tsx**

```typescript
import { PoseEditor } from './pages/PoseEditor';
// Inside router:
<Route path="/dev/pose-editor" element={<PoseEditor />} />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BoneSlider.tsx src/pages/PoseEditor.tsx src/App.tsx
git commit -m "feat(pose-editor): add dev-only pose authoring UI"
```

---

## Task 6: Playback Hook

**Files:**
- Create: `src/hooks/useSignPlayer.ts`
- Modify: `src/components/Avatar3D.tsx`

**Interfaces:**
- Consumes: `sequence: VRMPose[]`, `vrm: VRM | null`
- Produces: Drives VRM pose playback each frame

- [ ] **Step 1: Create useSignPlayer hook**

```typescript
// src/hooks/useSignPlayer.ts
import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import type { VRM } from '@pixiv/three-vrm';
import type { VRMPose } from '@pixiv/three-vrm';

const KEYFRAME_DURATION = 0.25;

export function useSignPlayer(
  vrm: VRM | null,
  sequence: VRMPose[] | undefined,
  autoplay: boolean = true,
) {
  const playbackRef = useRef({
    isPlaying: autoplay && !!sequence,
    currentIndex: 0,
    elapsed: 0,
  });

  useEffect(() => {
    if (!sequence) {
      playbackRef.current.isPlaying = false;
      playbackRef.current.currentIndex = 0;
      playbackRef.current.elapsed = 0;
    } else if (autoplay) {
      playbackRef.current.isPlaying = true;
    }
  }, [sequence, autoplay]);

  useFrame((_, delta) => {
    if (!vrm || !sequence || !playbackRef.current.isPlaying) return;

    const state = playbackRef.current;
    state.elapsed += delta;

    if (state.elapsed >= KEYFRAME_DURATION) {
      state.elapsed = 0;
      state.currentIndex += 1;

      if (state.currentIndex >= sequence.length) {
        state.currentIndex = 0;
        state.isPlaying = false;
      }
    }

    const pose = sequence[state.currentIndex];
    if (pose) {
      vrm.humanoid.setNormalizedPose(pose);
    }
  });

  return {
    isPlaying: playbackRef.current.isPlaying,
    play: () => { playbackRef.current.isPlaying = true; },
    stop: () => { playbackRef.current.isPlaying = false; },
    reset: () => {
      playbackRef.current.currentIndex = 0;
      playbackRef.current.elapsed = 0;
    },
  };
}
```

- [ ] **Step 2: Integrate into VRMAvatar**

```typescript
// src/components/Avatar3D.tsx
import { useSignPlayer } from '../hooks/useSignPlayer';

function VRMAvatar({ controlsRef, defaultViewRef, sequence }: VRMAvatarProps) {
  const { vrm } = useVRMAvatar('/avatar/malesign.vrm', controlsRef);
  useSignPlayer(vrm, sequence);
  return <group ref={groupRef}>{/* ... */}</group>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSignPlayer.ts src/components/Avatar3D.tsx
git commit -m "feat(avatar): add useSignPlayer hook for pose sequence playback"
```

---

## Task 7: Workspace Integration

**Files:**
- Modify: `src/pages/Workspace.tsx`

**Interfaces:**
- Consumes: `resolveText(input: string): VRMPose[]`
- Produces: Text input in text-to-sign mode drives Avatar3D playback

- [ ] **Step 1: Import resolveText and add state**

```typescript
// src/pages/Workspace.tsx
import { resolveText } from '../lib/signPlayback';
import type { VRMPose } from '@pixiv/three-vrm';

// Add state:
const [currentSignSequence, setCurrentSignSequence] = useState<VRMPose[] | undefined>();
```

- [ ] **Step 2: Update sendText function**

```typescript
const sendText = () => {
  if (mode !== 'text-to-sign') return;
  if (!inputText.trim()) return;
  const sequence = resolveText(inputText.trim());
  setCurrentSignSequence(sequence);
};
```

- [ ] **Step 3: Re-enable text input in text-to-sign mode**

Update the Input element to remove `disabled={mode !== 'text-to-sign'}` and update placeholder.

- [ ] **Step 4: Pass sequence to Avatar3D**

```typescript
{mode === 'text-to-sign' ? (
  <Avatar3D
    sequence={currentSignSequence}
    className="absolute inset-0 h-full w-full rounded-none border-none opacity-85"
  />
) : (
  // sign-to-text UI unchanged
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Workspace.tsx
git commit -m "feat(workspace): wire text-to-sign input to avatar playback"
```

---

## Task 8: Manual Pose Authoring

**Files:**
- Edit: `src/data/fingerspellingPoses.ts`
- Edit: `src/data/phraseSigns.ts`

**Interfaces:**
- Consumes: Poses captured via PoseEditor
- Produces: Populated pose libraries

- [ ] **Step 1: Author fingerspelling A–Z via Pose Editor**

1. Open `http://localhost:5174/dev/pose-editor`
2. For each letter A–Z:
   - Pose the letter using bone sliders
   - Click "Capture Pose"
   - Type letter name, click "Save Pose"
   - Repeat

- [ ] **Step 2: Author phrase signs (hello, thank you, yes, no)**

Repeat process for each curated phrase.

- [ ] **Step 3: Update pose data files**

Populate `fingerspellingPoses` and `phraseSigns` with real VRMPose data.

- [ ] **Step 4: Commit**

```bash
git add src/data/
git commit -m "feat(data): populate fingerspelling and phrase pose libraries"
```

---

## Task 9: Final Polish & Testing

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: PASS

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: Zero errors, bundle succeeds

- [ ] **Step 3: Browser verification**

1. `/workspace` → text-to-sign tab
2. Type "hello" → avatar plays phrase
3. Type "abc" → avatar fingerspells
4. Type "HELLO" → works (case-insensitive)

- [ ] **Step 4: Final commit**

```bash
git add src/
git commit -m "feat(text-to-sign): complete text-to-sign avatar animation system"
```

---

## Execution Strategy

**Recommended: Subagent-Driven Parallel Execution**

1. **Agent 1**: Task 1 (data models) — sequential prerequisite
2. **Agents 2–5 (parallel)**: Tasks 2–5 (playback engine, VRM hook, Avatar integration, PoseEditor) — independent after Task 1
3. **Agent 6**: Task 6 (playback hook) — depends on Tasks 2–5
4. **Agent 7**: Task 7 (Workspace integration) — depends on Task 6
5. **Manual**: Task 8 (pose authoring) — human iteration
6. **Agent 9**: Task 9 (verification & polish) — final check

**Wall-clock time**: ~4–6 hours serial, ~2–3 hours with 4-way parallel (Tasks 2–5).

---

## Goal-State Checklist

Once complete, you'll have:

- ✅ Fingerspelling A–Z (26 letters) playable by typing text
- ✅ Phrase signs (HELLO, THANK YOU, YES, NO) recognized and played as single animations
- ✅ Fallback to letter-by-letter for unknown words
- ✅ Case-insensitive text input
- ✅ In-browser Pose Editor for authoring
- ✅ Unit tests for text→pose resolution
- ✅ Zero hardcoded bone names — all via VRMPose objects
- ✅ ≥24 fps playback on the avatar
- ✅ Text-to-sign tab re-enabled in Workspace
