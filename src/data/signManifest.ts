import type { VRMPose } from '@pixiv/three-vrm';
import { fingerspellingManifest } from './fingerspelling';

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

// ASL fingerspelling (A–Z) is generated from calibrated bone rotations in
// ./fingerspelling. The type-only import above and this value import form a
// one-way cycle that is erased at runtime (verbatimModuleSyntax), so there's
// no circular-dependency hazard. To add phrase clips later, spread more
// manifests in here.
export const signManifest: SignManifest = {
  ...fingerspellingManifest,
};
