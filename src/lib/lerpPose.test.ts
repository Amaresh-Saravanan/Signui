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
