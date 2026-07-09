// ─────────────────────────────────────────────────────────────────────────────
// Browser-native ASL alphabet classifier
//
// Replaces the original Python scikit-learn RandomForest with a fully client-side
// geometric classifier that maps MediaPipe hand landmarks → an ASL letter.
//
// The original pipeline fed 21 (x, y) landmark pairs into a RandomForest. That
// model file (`model.p`) was never committed (gitignored) and requires a webcam
// dataset to train. This module reproduces the *inference* step in the browser
// without any external model: it derives finger extension / spread / contact
// states from the landmark geometry and matches them against the ASL alphabet.
//
// Coordinates are MediaPipe normalized landmarks (x, y in [0, 1], origin
// top-left). Only x/y are used, matching the 42-feature original pipeline.
// ─────────────────────────────────────────────────────────────────────────────

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface ClassificationResult {
  letter: string;
  confidence: number; // 0..1
}

// MediaPipe hand landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const dist = (a: Landmark, b: Landmark): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

interface HandState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  indexMiddleSpread: boolean; // V vs U
  thumbIndexPinch: boolean; // F / O
  handScale: number;
}

// A four-finger is "extended" when its tip is farther from the wrist than its
// PIP joint — orientation-independent (works for upright and sideways hands).
function fingerExtended(lm: Landmark[], tip: number, pip: number): boolean {
  return dist(lm[tip], lm[WRIST]) > dist(lm[pip], lm[WRIST]) * 1.05;
}

function computeState(lm: Landmark[]): HandState {
  const handScale = dist(lm[WRIST], lm[MIDDLE_MCP]) || 1;

  const index = fingerExtended(lm, INDEX_TIP, INDEX_PIP);
  const middle = fingerExtended(lm, MIDDLE_TIP, MIDDLE_PIP);
  const ring = fingerExtended(lm, RING_TIP, RING_PIP);
  const pinky = fingerExtended(lm, PINKY_TIP, PINKY_PIP);

  // Thumb is "out" when its tip sits laterally far from the index MCP.
  const thumb = dist(lm[THUMB_TIP], lm[INDEX_MCP]) > handScale * 0.9;

  const indexMiddleSpread =
    dist(lm[INDEX_TIP], lm[MIDDLE_TIP]) > handScale * 0.55;

  const thumbIndexPinch =
    dist(lm[THUMB_TIP], lm[INDEX_TIP]) < handScale * 0.45;

  return {
    thumb,
    index,
    middle,
    ring,
    pinky,
    indexMiddleSpread,
    thumbIndexPinch,
    handScale,
  };
}

// Each template is a finger pattern [thumb, index, middle, ring, pinky].
// `null` = don't-care. Extra predicates refine ambiguous fist/pair shapes.
interface Template {
  letter: string;
  pattern: (boolean | null)[];
  refine?: (s: HandState, lm: Landmark[]) => boolean;
  bonus?: number;
}

const TEMPLATES: Template[] = [
  // Open / distinct silhouettes first
  { letter: 'B', pattern: [false, true, true, true, true] },
  { letter: 'W', pattern: [null, true, true, true, false] },
  {
    letter: 'F',
    pattern: [null, false, true, true, true],
    refine: (s) => s.thumbIndexPinch,
    bonus: 0.15,
  },
  { letter: 'L', pattern: [true, true, false, false, false] },
  {
    letter: 'V',
    pattern: [false, true, true, false, false],
    refine: (s) => s.indexMiddleSpread,
    bonus: 0.1,
  },
  {
    letter: 'U',
    pattern: [false, true, true, false, false],
    refine: (s) => !s.indexMiddleSpread,
    bonus: 0.1,
  },
  {
    letter: 'K',
    pattern: [true, true, true, false, false],
    refine: (s) => s.indexMiddleSpread,
  },
  { letter: 'D', pattern: [null, true, false, false, false] },
  {
    letter: 'Y',
    pattern: [true, false, false, false, true],
    bonus: 0.1,
  },
  { letter: 'I', pattern: [false, false, false, false, true], bonus: 0.05 },
  // Fist-like shapes — separated by thumb placement
  {
    letter: 'A',
    pattern: [true, false, false, false, false],
    refine: (_s, lm) => lm[THUMB_TIP].y < lm[INDEX_PIP].y,
  },
  {
    letter: 'S',
    pattern: [false, false, false, false, false],
    refine: (s, lm) =>
      dist(lm[THUMB_TIP], lm[MIDDLE_MCP]) < s.handScale * 0.7,
  },
  {
    letter: 'E',
    pattern: [false, false, false, false, false],
  },
  {
    letter: 'O',
    pattern: [false, false, false, false, false],
    refine: (s) => s.thumbIndexPinch,
    bonus: 0.15,
  },
];

/**
 * Classify a single MediaPipe hand (21 landmarks) into an ASL letter.
 * Returns the best match with a confidence score. Callers should apply
 * temporal smoothing (see useSignDetector) to stabilize the output.
 */
export function classifyASL(lm: Landmark[]): ClassificationResult {
  if (!lm || lm.length < 21) {
    return { letter: '', confidence: 0 };
  }

  const s = computeState(lm);
  const observed = [s.thumb, s.index, s.middle, s.ring, s.pinky];

  let best: ClassificationResult = { letter: '', confidence: 0 };

  for (const t of TEMPLATES) {
    let matches = 0;
    let considered = 0;
    for (let i = 0; i < 5; i++) {
      if (t.pattern[i] === null) continue;
      considered++;
      if (t.pattern[i] === observed[i]) matches++;
    }
    if (considered === 0) continue;

    let score = matches / considered;
    if (t.refine) {
      if (t.refine(s, lm)) score += t.bonus ?? 0.1;
      else score -= 0.2; // refine predicate failed → weaker candidate
    }
    score = Math.max(0, Math.min(1, score));

    if (score > best.confidence) {
      best = { letter: t.letter, confidence: score };
    }
  }

  return best;
}
