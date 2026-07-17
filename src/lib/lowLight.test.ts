import { describe, it, expect } from 'vitest';
import { lowLightFilter } from './lowLight';

// Parse the first number out of "brightness(X) ..." to compare boost strength.
function brightness(filter: string): number {
  return Number(filter.match(/brightness\(([\d.]+)\)/)![1]);
}

describe('lowLightFilter', () => {
  it('default amount gives a real boost', () => {
    expect(brightness(lowLightFilter())).toBeGreaterThan(1);
  });

  it('amount 0 is near-neutral', () => {
    expect(lowLightFilter(0)).toBe('brightness(1.00) contrast(1.00) saturate(1.00)');
  });

  it('amount 1 is stronger than the default', () => {
    expect(brightness(lowLightFilter(1))).toBeGreaterThan(brightness(lowLightFilter(0.5)));
  });

  it('clamps out-of-range input to [0,1]', () => {
    expect(lowLightFilter(5)).toBe(lowLightFilter(1));
    expect(lowLightFilter(-3)).toBe(lowLightFilter(0));
  });
});
