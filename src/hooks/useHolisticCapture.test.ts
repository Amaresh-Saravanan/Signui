import { describe, it, expect } from 'vitest';
import { findPoseWorldLandmarks } from './useHolisticCapture';

// ponytail: one runnable check for findPoseWorldLandmarks (pure object introspection,
// no camera/WASM/WebGL) — verifies it correctly identifies the mangled-key 33-length
// world landmarks array and excludes known arrays (poseLandmarks, faceLandmarks,
// hand landmarks). Rest of useHolisticCapture (rAF/MediaPipe/video integration) is
// covered by E2E tests with real camera.

describe('findPoseWorldLandmarks', () => {
  // Build a synthetic landmark object
  const makeLandmark = (x: number, y: number, z: number) => ({ x, y, z });

  // Build 33-element landmark array for pose
  const make33Array = () =>
    Array.from({ length: 33 }, (_, i) => makeLandmark(i * 0.01, i * 0.02, i * 0.03));

  // Build 468-element landmark array for face
  const make468Array = () =>
    Array.from({ length: 468 }, (_, i) => makeLandmark(i * 0.001, i * 0.002, i * 0.003));

  // Build 21-element landmark array for hands
  const make21Array = () =>
    Array.from({ length: 21 }, (_, i) => makeLandmark(i * 0.05, i * 0.06, i * 0.07));

  it('finds the 33-length world landmarks array under a mangled key', () => {
    const worldLandmarks = make33Array();
    const poseLandmarks = make33Array();
    const faceLandmarks = make468Array();
    const leftHandLandmarks = make21Array();
    const rightHandLandmarks = make21Array();

    // Synthetic Results with mangled key 'za' holding world landmarks
    const results = {
      poseLandmarks,
      faceLandmarks,
      leftHandLandmarks,
      rightHandLandmarks,
      za: worldLandmarks, // mangled key with 33-length array (the world landmarks)
    } as any;

    const found = findPoseWorldLandmarks(results);
    expect(found).toBe(worldLandmarks); // exact reference match
    expect(found).not.toBe(poseLandmarks); // definitely not the pose landmarks
  });

  it('returns null when no 33-length mystery array exists', () => {
    const results = {
      poseLandmarks: make33Array(),
      faceLandmarks: make468Array(),
      leftHandLandmarks: make21Array(),
      rightHandLandmarks: make21Array(),
      // no extra 33-length array under a mangled key
    } as any;

    const found = findPoseWorldLandmarks(results);
    expect(found).toBeNull();
  });

  it('skips arrays that are not exactly 33 elements or lack landmark shape', () => {
    const results = {
      poseLandmarks: make33Array(),
      faceLandmarks: make468Array(),
      leftHandLandmarks: make21Array(),
      rightHandLandmarks: make21Array(),
      wrongLength: Array.from({ length: 32 }, () => makeLandmark(0, 0, 0)), // 32, not 33
      wrongShape: Array.from({ length: 33 }, () => ({ a: 1, b: 2 })), // missing x,y,z
    } as any;

    const found = findPoseWorldLandmarks(results);
    expect(found).toBeNull(); // no valid 33-length landmark array found
  });

  it('handles edge case where the only extra property is a valid 33-length array', () => {
    const worldLandmarks = make33Array();
    const results = {
      poseLandmarks: make33Array(),
      w: worldLandmarks, // mangled key 'w'
    } as any;

    const found = findPoseWorldLandmarks(results);
    expect(found).toBe(worldLandmarks);
  });
});
