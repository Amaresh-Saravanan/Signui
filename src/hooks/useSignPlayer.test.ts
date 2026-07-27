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
