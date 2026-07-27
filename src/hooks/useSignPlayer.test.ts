import { describe, it, expect, vi } from 'vitest';
import { SignPlaybackController } from './useSignPlayer';
import type { SignManifest } from '../data/signManifest';
import type { VRMPose } from '@pixiv/three-vrm';

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

  it('play() skips a clip with zero keyframes and leaves state at idle (regression: used to throw)', () => {
    const applyPose = vi.fn();
    const manifest: SignManifest = { EMPTY: { duration: 0, keyframes: [] } };
    const controller = new SignPlaybackController(manifest, applyPose);
    expect(() => controller.play(['EMPTY'])).not.toThrow();
    expect(controller.state).toBe('idle');
  });

  it('interpolates a genuinely blended pose between two keyframes mid-clip', () => {
    const applyPose = vi.fn();
    const poseStart: VRMPose = { rightHand: { rotation: [0, 0, 0, 1] } };
    const poseEnd: VRMPose = { rightHand: { rotation: [0, 0, 0.7071068, 0.7071068] } };
    const manifest: SignManifest = {
      A: {
        duration: 1,
        keyframes: [
          { time: 0, pose: poseStart },
          { time: 1, pose: poseEnd },
        ],
      },
    };
    const controller = new SignPlaybackController(manifest, applyPose);
    controller.play(['A']);
    controller.tick(0.5); // no previousPose yet, so no crossfade — pure segment interpolation

    const applied = applyPose.mock.calls[applyPose.mock.calls.length - 1][0] as VRMPose;
    expect(applied.rightHand?.rotation).not.toEqual(poseStart.rightHand?.rotation);
    expect(applied.rightHand?.rotation).not.toEqual(poseEnd.rightHand?.rotation);
  });

  it('advances playing (mid clip A) -> playing (clip B after crossfade) -> done', () => {
    const applyPose = vi.fn();
    const manifest: SignManifest = {
      A: { duration: 1, keyframes: [{ time: 0, pose: {} }] },
      B: { duration: 1, keyframes: [{ time: 0, pose: {} }] },
    };
    const controller = new SignPlaybackController(manifest, applyPose);

    controller.play(['A', 'B']);
    expect(controller.state).toBe('playing');

    controller.tick(0.5); // mid clip A
    expect(controller.state).toBe('playing');

    controller.tick(0.6); // total elapsed 1.1s >= A's 1s duration -> advances to clip B
    expect(controller.state).toBe('playing');

    controller.tick(1.5); // clip B's 1s duration elapsed -> queue exhausted
    expect(controller.state).toBe('done');
  });
});
