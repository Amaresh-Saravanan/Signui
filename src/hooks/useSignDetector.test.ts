import { describe, it, expect } from 'vitest';
import { frameIsDue } from './useSignDetector';

// ponytail: one runnable check for the fps-cap gate (ML-7/PERF-4) — the rest
// of useSignDetector needs rAF/MediaPipe/getUserMedia and is covered by the
// Playwright fake-camera E2E planned in MIGRATION_TRACKER.md task 4.6-4.8.
describe('frameIsDue', () => {
  it('is false before the interval has elapsed', () => {
    expect(frameIsDue(1050, 1000, 55.56)).toBe(false);
  });

  it('is true once the interval has elapsed', () => {
    expect(frameIsDue(1056, 1000, 55.56)).toBe(true);
  });

  it('is true on the very first tick (lastTick=0)', () => {
    expect(frameIsDue(1000, 0, 55.56)).toBe(true);
  });
});
