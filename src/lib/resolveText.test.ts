import { describe, it, expect } from 'vitest';
import { resolveText } from './resolveText';
import type { SignManifest } from '../data/signManifest';

const clip = { duration: 1, keyframes: [{ time: 0, pose: {} }] };

describe('resolveText', () => {
  it('matches a whole phrase before falling back to letters', () => {
    const manifest: SignManifest = { hello: clip, H: clip, E: clip };
    expect(resolveText('Hello', manifest)).toEqual(['hello']);
  });

  it('falls back to per-letter fingerspelling when no phrase matches', () => {
    const manifest: SignManifest = { A: clip, B: clip, C: clip };
    expect(resolveText('cab', manifest)).toEqual(['C', 'A', 'B']);
  });

  it('is case-insensitive for both phrase and letter lookup', () => {
    const manifest: SignManifest = { hello: clip };
    expect(resolveText('HELLO', manifest)).toEqual(['hello']);
  });

  it('skips spaces, digits, and punctuation', () => {
    const manifest: SignManifest = { A: clip, B: clip };
    expect(resolveText('a1 b!', manifest)).toEqual(['A', 'B']);
  });

  it('skips letters with no manifest entry', () => {
    const manifest: SignManifest = { A: clip };
    expect(resolveText('ab', manifest)).toEqual(['A']);
  });

  it('returns [] for empty or whitespace-only input', () => {
    expect(resolveText('', { A: clip })).toEqual([]);
    expect(resolveText('   ', { A: clip })).toEqual([]);
  });

  it('returns [] for an empty manifest', () => {
    expect(resolveText('hello', {})).toEqual([]);
  });
});
