import { describe, it, expect } from 'vitest';
import { classifyASL, type Landmark } from './aslClassifier';

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic-hand fixture builder.
//
// Produces 21 MediaPipe-style normalized landmarks for an upright hand
// (y decreases upward). The base pose is a closed fist; options extend
// individual fingers or reposition the thumb to sculpt each letter shape.
// Geometry mirrors what the classifier measures: curl ratios against the
// wrist, thumb distance from the index MCP, and index/middle tip spread.
// ─────────────────────────────────────────────────────────────────────────────

interface HandOpts {
  index?: boolean;
  middle?: boolean;
  ring?: boolean;
  pinky?: boolean;
  thumbOut?: boolean;
  spread?: boolean;
}

function hand(opts: HandOpts = {}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.9 }));
  lm[0] = { x: 0.5, y: 0.95 }; // wrist
  lm[9] = { x: 0.5, y: 0.75 }; // middle MCP → hand scale 0.2, orientation "up"
  lm[17] = { x: 0.6, y: 0.8 }; // pinky MCP

  // Closed finger: tip folds back below its PIP (curl ratio < 0.9).
  const curl = (mcp: number, pip: number, tip: number, baseX: number) => {
    lm[mcp] = { x: baseX, y: 0.78 };
    lm[pip] = { x: baseX, y: 0.72 };
    lm[tip] = { x: baseX, y: 0.8 };
  };
  curl(5, 6, 8, 0.44); // index
  curl(9, 10, 12, 0.5); // middle
  curl(13, 14, 16, 0.56); // ring
  curl(17, 18, 20, 0.62); // pinky

  // Extended finger: tip pushed far above its PIP (curl ratio > 1.1).
  const extend = (pip: number, tip: number, baseX: number, tipX = baseX) => {
    lm[pip] = { x: baseX, y: 0.6 };
    lm[tip] = { x: tipX, y: 0.4 };
  };
  if (opts.index) extend(6, 8, 0.44, opts.spread ? 0.38 : 0.44);
  if (opts.middle) extend(10, 12, 0.5, opts.spread ? 0.58 : 0.5);
  if (opts.ring) extend(14, 16, 0.56);
  if (opts.pinky) extend(18, 20, 0.62);

  // Thumb: tucked against the palm by default, or held out + up.
  lm[3] = { x: 0.4, y: 0.8 };
  lm[4] = opts.thumbOut ? { x: 0.28, y: 0.62 } : { x: 0.48, y: 0.78 };

  return lm;
}

// Half-curled finger: tip distance from wrist ≈ PIP distance (ratio ~0.98).
function halfCurl(lm: Landmark[], pip: number, tip: number, baseX: number) {
  lm[pip] = { x: baseX, y: 0.72 };
  lm[tip] = { x: baseX + 0.02, y: 0.72 };
}

describe('classifyASL — extended-finger letters', () => {
  it('recognizes B (four fingers extended, thumb tucked)', () => {
    const r = classifyASL(hand({ index: true, middle: true, ring: true, pinky: true }));
    expect(r.letter).toBe('B');
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('recognizes W (index/middle/ring extended)', () => {
    expect(classifyASL(hand({ index: true, middle: true, ring: true })).letter).toBe('W');
  });

  it('recognizes V (index+middle spread apart)', () => {
    expect(classifyASL(hand({ index: true, middle: true, spread: true })).letter).toBe('V');
  });

  it('recognizes U (index+middle together)', () => {
    expect(classifyASL(hand({ index: true, middle: true })).letter).toBe('U');
  });

  it('recognizes D (index only, thumb tucked)', () => {
    expect(classifyASL(hand({ index: true })).letter).toBe('D');
  });

  it('recognizes I (pinky only, thumb tucked)', () => {
    expect(classifyASL(hand({ pinky: true })).letter).toBe('I');
  });

  it('recognizes L (index + thumb out)', () => {
    const r = classifyASL(hand({ index: true, thumbOut: true }));
    expect(r.letter).toBe('L');
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('recognizes Y (pinky + thumb out)', () => {
    expect(classifyASL(hand({ pinky: true, thumbOut: true })).letter).toBe('Y');
  });
});

describe('classifyASL — pinch and curved letters', () => {
  it('recognizes F (thumb–index pinch, other three extended)', () => {
    const lm = hand({ middle: true, ring: true, pinky: true });
    lm[8] = { x: 0.48, y: 0.8 }; // index tip folded onto the thumb tip
    const r = classifyASL(lm);
    expect(r.letter).toBe('F');
  });

  it('recognizes O (all fingers half-curled onto the thumb)', () => {
    const lm = hand();
    halfCurl(lm, 6, 8, 0.44);
    halfCurl(lm, 10, 12, 0.5);
    halfCurl(lm, 14, 16, 0.56);
    halfCurl(lm, 18, 20, 0.62);
    lm[4] = { x: 0.44, y: 0.7 }; // thumb tip meets the curved index tip
    const r = classifyASL(lm);
    expect(r.letter).toBe('O');
  });

  it('recognizes C (all fingers half-curled, no pinch)', () => {
    const lm = hand();
    halfCurl(lm, 6, 8, 0.44);
    halfCurl(lm, 10, 12, 0.5);
    halfCurl(lm, 14, 16, 0.56);
    halfCurl(lm, 18, 20, 0.62);
    lm[4] = { x: 0.3, y: 0.6 }; // thumb held away — open curve
    const r = classifyASL(lm);
    expect(r.letter).toBe('C');
  });

  it('recognizes X (hooked index, fist otherwise, no pinch)', () => {
    const lm = hand();
    halfCurl(lm, 6, 8, 0.44);
    lm[4] = { x: 0.52, y: 0.82 }; // thumb tucked but clear of the index tip
    const r = classifyASL(lm);
    expect(r.letter).toBe('X');
  });
});

describe('classifyASL — closed-fist family', () => {
  it('resolves a plain fist to the A/S/E/T family, never O', () => {
    const r = classifyASL(hand());
    expect(['A', 'S', 'E', 'T']).toContain(r.letter);
  });

  it('flags fist-family letters as low confidence (≤0.65)', () => {
    const r = classifyASL(hand());
    expect(r.confidence).toBeLessThanOrEqual(0.65);
  });

  it('resolves fist with thumb up (not across) toward A', () => {
    const lm = hand();
    lm[4] = { x: 0.38, y: 0.62 }; // thumb up alongside the fist, outside finger span
    lm[3] = { x: 0.39, y: 0.78 };
    const r = classifyASL(lm);
    expect(['A', 'L']).toContain(r.letter); // A expected; L only if thumbOut+index misread
    expect(r.letter).toBe('A');
  });
});

describe('classifyASL — edge cases', () => {
  it('returns empty result for an empty array', () => {
    expect(classifyASL([])).toEqual({ letter: '', confidence: 0 });
  });

  it('returns empty result for fewer than 21 landmarks', () => {
    const short = Array.from({ length: 20 }, () => ({ x: 0.5, y: 0.5 }));
    expect(classifyASL(short)).toEqual({ letter: '', confidence: 0 });
  });

  it('does not crash on degenerate all-identical landmarks', () => {
    const degenerate = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    const r = classifyASL(degenerate);
    expect(r.confidence).toBeLessThanOrEqual(0.65); // never a confident guess
  });

  it('confidence is always within [0, 1]', () => {
    const shapes = [
      hand(),
      hand({ index: true }),
      hand({ index: true, middle: true, ring: true, pinky: true, thumbOut: true }),
    ];
    for (const lm of shapes) {
      const r = classifyASL(lm);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    }
  });
});
