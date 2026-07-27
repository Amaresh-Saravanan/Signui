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
      .filter((key) => this.manifest[key]?.keyframes.length > 0)
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
    () =>
      new SignPlaybackController(manifest, (pose) => {
        vrm?.humanoid?.resetNormalizedPose();
        vrm?.humanoid?.setNormalizedPose(pose);
      }),
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
