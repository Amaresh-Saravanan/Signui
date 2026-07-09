// ─────────────────────────────────────────────────────────────────────────────
// Browser-native ASL alphabet classifier
//
// Replaces the original Python scikit-learn RandomForest with a fully client-side
// geometric classifier that maps MediaPipe hand landmarks → an ASL letter.
//
// The original pipeline fed 21 (x, y) landmark pairs into a RandomForest. That
// model file (`model.p`) was never committed (gitignored) and requires a webcam
// dataset to train. This module reproduces the *inference* step in the browser
// without any external model by deriving geometric features from the landmarks:
//   • per-finger curl state (extended / half / closed)
//   • hand orientation (pointing up / down / sideways)
//   • index–middle spread and crossing
//   • thumb position (out / up / across the palm / between fingers)
// and matching them against the ASL alphabet.
//
// Coordinates are MediaPipe normalized landmarks (x, y in [0, 1], origin
// top-left). Only x/y are used, matching the 42-feature original pipeline.
//
// Coverage note: static hand-shape letters are supported. J and Z are motion
// gestures and cannot be recognized from a single frame. The closed-fist family
// (M, N, T, and to a degree A/S/E) is inherently ambiguous from landmarks alone,
// so those are returned with lower confidence. Thresholds below are reasonable
// defaults and may need on-device tuning.
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

// MediaPipe hand landmark indices (grouped so unused entries don't trip lint).
const L = {
  WRIST: 0,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;

type Curl = 'ext' | 'half' | 'closed';

const dist = (a: Landmark, b: Landmark): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// A finger's curl is inferred from how far its tip sits from the wrist relative
// to its PIP joint — orientation-independent (works for any hand rotation).
function curlOf(lm: Landmark[], tip: number, pip: number): Curl {
  const r = dist(lm[tip], lm[L.WRIST]) / (dist(lm[pip], lm[L.WRIST]) || 1);
  if (r > 1.1) return 'ext';
  if (r < 0.9) return 'closed';
  return 'half';
}

interface Features {
  idx: Curl;
  mid: Curl;
  rng: Curl;
  pky: Curl;
  thumbOut: boolean; // thumb held away from the palm (L, Y, ...)
  thumbUp: boolean; // thumb tip points up past its own IP joint
  thumbBetween: boolean; // thumb wedged between index & middle (T)
  thumbAcross: boolean; // thumb laid across the front of the fist (S/E)
  tipsCurled: boolean; // all four fingertips folded toward the palm (E)
  spread: boolean; // index & middle splayed apart (V vs U)
  crossIM: boolean; // index & middle crossed (R)
  pinch: boolean; // thumb tip touching index tip (F/O)
  orient: 'up' | 'down' | 'side';
  scale: number;
}

function extract(lm: Landmark[]): Features {
  const scale = dist(lm[L.WRIST], lm[L.MIDDLE_MCP]) || 1;

  const idx = curlOf(lm, L.INDEX_TIP, L.INDEX_PIP);
  const mid = curlOf(lm, L.MIDDLE_TIP, L.MIDDLE_PIP);
  const rng = curlOf(lm, L.RING_TIP, L.RING_PIP);
  const pky = curlOf(lm, L.PINKY_TIP, L.PINKY_PIP);

  const thumbOut = dist(lm[L.THUMB_TIP], lm[L.INDEX_MCP]) > scale * 0.9;
  const thumbUp = lm[L.THUMB_TIP].y < lm[L.THUMB_IP].y - scale * 0.1;

  const loX = Math.min(lm[L.INDEX_MCP].x, lm[L.MIDDLE_MCP].x);
  const hiX = Math.max(lm[L.INDEX_MCP].x, lm[L.MIDDLE_MCP].x);
  const thumbBetween =
    lm[L.THUMB_TIP].x > loX && lm[L.THUMB_TIP].x < hiX && lm[L.THUMB_TIP].y < lm[L.INDEX_PIP].y;

  const fMinX = Math.min(lm[L.INDEX_MCP].x, lm[L.PINKY_MCP].x);
  const fMaxX = Math.max(lm[L.INDEX_MCP].x, lm[L.PINKY_MCP].x);
  const thumbAcross =
    lm[L.THUMB_TIP].x > fMinX &&
    lm[L.THUMB_TIP].x < fMaxX &&
    lm[L.THUMB_TIP].y > lm[L.INDEX_MCP].y - scale * 0.2;

  const tipsCurled =
    lm[L.INDEX_TIP].y > lm[L.INDEX_PIP].y &&
    lm[L.MIDDLE_TIP].y > lm[L.MIDDLE_PIP].y &&
    lm[L.RING_TIP].y > lm[L.RING_PIP].y &&
    lm[L.PINKY_TIP].y > lm[L.PINKY_PIP].y;

  const spread = dist(lm[L.INDEX_TIP], lm[L.MIDDLE_TIP]) > scale * 0.55;

  const crossIM =
    idx === 'ext' &&
    mid === 'ext' &&
    Math.sign(lm[L.INDEX_TIP].x - lm[L.MIDDLE_TIP].x) !==
      Math.sign(lm[L.INDEX_MCP].x - lm[L.MIDDLE_MCP].x);

  const pinch = dist(lm[L.THUMB_TIP], lm[L.INDEX_TIP]) < scale * 0.5;

  const dx = lm[L.MIDDLE_MCP].x - lm[L.WRIST].x;
  const dy = lm[L.MIDDLE_MCP].y - lm[L.WRIST].y;
  const orient: Features['orient'] =
    Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : 'side';

  return {
    idx, mid, rng, pky,
    thumbOut, thumbUp, thumbBetween, thumbAcross, tipsCurled,
    spread, crossIM, pinch, orient, scale,
  };
}

/**
 * Classify a single MediaPipe hand (21 landmarks) into an ASL letter.
 * Returns the best match with a confidence score. Callers should apply
 * temporal smoothing (see useSignDetector) to stabilize the output.
 */
export function classifyASL(lm: Landmark[]): ClassificationResult {
  if (!lm || lm.length < 21) return { letter: '', confidence: 0 };

  const f = extract(lm);
  const ext = (c: Curl) => c === 'ext';
  const closed = (c: Curl) => c === 'closed';

  const candidates: ClassificationResult[] = [];
  const add = (letter: string, confidence: number) =>
    candidates.push({ letter, confidence });

  // ── All four fingers extended: B (or open hand) ──
  if (ext(f.idx) && ext(f.mid) && ext(f.rng) && ext(f.pky)) {
    add('B', f.thumbOut ? 0.72 : 0.9);
  }

  // ── Three fingers (index/middle/ring): W ──
  if (ext(f.idx) && ext(f.mid) && ext(f.rng) && closed(f.pky)) {
    add('W', 0.85);
  }

  // ── Thumb–index pinch with three fingers out: F ──
  if (f.pinch && ext(f.mid) && ext(f.rng) && ext(f.pky)) {
    add('F', 0.85);
  }

  // ── Thumb + one finger shapes: L, Y, I ──
  if (f.thumbOut && f.thumbUp && ext(f.idx) && closed(f.mid) && closed(f.rng) && closed(f.pky)) {
    add('L', 0.9);
  }
  if (f.thumbOut && ext(f.pky) && closed(f.idx) && closed(f.mid) && closed(f.rng)) {
    add('Y', 0.88);
  }
  if (!f.thumbOut && ext(f.pky) && closed(f.idx) && closed(f.mid) && closed(f.rng)) {
    add('I', 0.85);
  }

  // ── Index + middle pair: R, H, P, K, V, U ──
  if (ext(f.idx) && ext(f.mid) && closed(f.rng) && closed(f.pky)) {
    if (f.crossIM) add('R', 0.72);
    else if (f.orient === 'side') add('H', 0.68);
    else if (f.orient === 'down') add('P', 0.55);
    else if (f.thumbUp && f.thumbBetween) add('K', 0.68);
    else if (f.spread) add('V', 0.82);
    else add('U', 0.78);
  }

  // ── Index only: G, Q, D ──
  if (ext(f.idx) && closed(f.mid) && closed(f.rng) && closed(f.pky)) {
    if (f.orient === 'side') add('G', 0.7);
    else if (f.orient === 'down') add('Q', 0.55);
    else add('D', 0.75);
  }

  // ── Index hooked (half-curl): X ──
  if (f.idx === 'half' && closed(f.mid) && closed(f.rng) && closed(f.pky) && !f.thumbOut) {
    add('X', 0.6);
  }

  // ── Curved open hand (all half, no pinch): C ──
  if (f.idx === 'half' && f.mid === 'half' && f.rng === 'half' && f.pky === 'half' && !f.pinch) {
    add('C', 0.6);
  }

  // ── Fingers curved to thumb (pinch with rounded, not tightly-closed, hand): O ──
  // Requires at least one finger in the 'half' (curved) state so a tight fist
  // with the thumb resting near the index tip is not misread as O.
  if (f.pinch && !ext(f.mid) && !ext(f.rng) && (f.idx === 'half' || f.mid === 'half')) {
    add('O', 0.72);
  }

  // ── Closed fist family: T, A, E, S (+ low-confidence M/N) ──
  if (closed(f.idx) && closed(f.mid) && closed(f.rng) && closed(f.pky)) {
    if (f.thumbBetween) add('T', 0.55);
    else if (f.thumbUp && !f.thumbAcross) add('A', 0.62);
    else if (f.thumbAcross && f.tipsCurled) add('E', 0.5);
    else if (f.thumbAcross) add('S', 0.58);
    else add('S', 0.45);

    if (f.thumbAcross && !f.thumbUp) {
      add('M', 0.35);
      add('N', 0.33);
    }
  }

  if (candidates.length === 0) return { letter: '', confidence: 0 };
  return candidates.reduce((best, c) => (c.confidence > best.confidence ? c : best));
}
