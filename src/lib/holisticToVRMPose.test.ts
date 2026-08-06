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
  for (const [i, v] of Object.entries(overrides)) base[Number(i)] = v!;
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

/** True iff every quaternion component is a finite number (guards against NaN escaping normalization). */
function isFiniteQuat(rotation: readonly number[] | undefined): boolean {
  return !!rotation && rotation.length === 4 && rotation.every(Number.isFinite);
}

describe('holisticToVRMPose', () => {
  it('returns an empty pose when world landmarks are missing', () => {
    const pose = holisticToVRMPose({ ...REST_FRAME, poseWorldLandmarks: null }, null);
    expect(pose).toEqual({});
  });

  it('maps arm bones as finite unit quaternions that actually track arm movement', () => {
    const restPose = holisticToVRMPose(REST_FRAME, null);
    const raisedPose = holisticToVRMPose(ARM_RAISED_FRAME, null);
    const armBones = ['rightUpperArm', 'rightLowerArm', 'leftUpperArm', 'leftLowerArm'] as const;

    for (const bone of armBones) {
      const rotation = raisedPose[bone]?.rotation;
      expect(rotation).toBeDefined();
      expect(isFiniteQuat(rotation)).toBe(true);
      const [x, y, z, w] = rotation!;
      const length = Math.sqrt(x * x + y * y + z * z + w * w);
      expect(length).toBeCloseTo(1, 4);
    }

    // Moving an elbow/wrist away from the rest fixture must actually change
    // at least one arm bone's output — otherwise this "mapping" would pass
    // even if it silently returned static/offscreen-default rotations for
    // every input. This does NOT assert *which* side (kalidokit's raw
    // PoseSolver output is keyed to opposite MediaPipe landmark indices from
    // what its Right/Left field names suggest — verified directly against
    // node_modules/kalidokit's calcArms.js — so whether that lands on
    // rightUpperArm or leftUpperArm here depends on a mirroring convention
    // this slice deliberately does not resolve; see the task report).
    const changed = armBones.some((bone) => {
      const a = restPose[bone]?.rotation;
      const b = raisedPose[bone]?.rotation;
      return JSON.stringify(a) !== JSON.stringify(b);
    });
    expect(changed).toBe(true);
  });

  it('falls back to the Pose-derived hand rotation when no hand landmarks are present', () => {
    const pose = holisticToVRMPose(REST_FRAME, null);
    // No hand landmarks in REST_FRAME, but Pose.solve always returns a
    // RightHand/LeftHand estimate from the arm — the wrist bone should still
    // be set from that fallback rather than left empty.
    expect(pose.rightHand?.rotation).toBeDefined();
    expect(isFiniteQuat(pose.rightHand?.rotation)).toBe(true);
    expect(pose.leftHand?.rotation).toBeDefined();
    expect(isFiniteQuat(pose.leftHand?.rotation)).toBe(true);
  });

  it('maps finger joints, including the thumb metacarpal remap, when a hand is present', () => {
    const pose = holisticToVRMPose(HAND_OPEN_FRAME, null);
    const fingerBones = [
      'rightThumbMetacarpal',
      'rightThumbProximal',
      'rightThumbDistal',
      'rightIndexProximal',
      'rightIndexIntermediate',
      'rightIndexDistal',
      'rightMiddleDistal',
      'rightRingDistal',
      'rightLittleDistal',
    ] as const;
    for (const bone of fingerBones) {
      const rotation = pose[bone]?.rotation;
      expect(rotation).toBeDefined();
      expect(isFiniteQuat(rotation)).toBe(true);
    }
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
