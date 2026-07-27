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
