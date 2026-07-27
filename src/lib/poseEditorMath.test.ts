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
