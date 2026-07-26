import { describe, it, expect } from 'vitest';
import { hexToRgb } from './color';

describe('hexToRgb', () => {
  it('converts a 6-digit hex color with # to an r,g,b string', () => {
    expect(hexToRgb('#0D9488')).toBe('13,148,136');
  });

  it('converts a 6-digit hex color without # to an r,g,b string', () => {
    expect(hexToRgb('A78BFA')).toBe('167,139,250');
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#a78bfa')).toBe('167,139,250');
  });

  it('trims surrounding whitespace', () => {
    expect(hexToRgb('  #0D9488  ')).toBe('13,148,136');
  });

  it('returns null for invalid input', () => {
    expect(hexToRgb('not-a-color')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});
