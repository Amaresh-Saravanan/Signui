import * as THREE from 'three';
import type { VRMPose } from '@pixiv/three-vrm';
import type { SignClip, SignManifest } from './signManifest';

// ---------------------------------------------------------------------------
// ASL fingerspelling handshapes for the right hand of /avatar/malesign.vrm.
//
// Every value here was calibrated live against this specific VRM rig (its bone
// rest orientations are what make "curl = +Z", not a general VRM convention),
// using the dev-only /dev/pose-spike harness. Poses are authored as XYZ-Euler
// degrees per humanoid bone and converted to the quaternion `VRMPose` the
// engine applies via humanoid.setNormalizedPose().
//
// To retune a letter: adjust its entry below and reload /workspace → Text→Sign.
// Finger curl is +Z on each joint; higher = more closed. Base arm pose is
// shared by every letter so only the handshape changes between letters.
// ---------------------------------------------------------------------------

type Deg3 = [number, number, number];

/**
 * Shared arm pose. The right arm is the signing hand (forearm vertical, hand at
 * shoulder height, palm to camera); the left arm rests down at the side so the
 * character doesn't hold a T-pose on the non-signing side (setNormalizedPose
 * resets every unlisted bone to the rest T-pose).
 */
const BASE_ARM: Record<string, Deg3> = {
  rightUpperArm: [0, -28, 78],
  rightLowerArm: [0, 0, -140],
  leftUpperArm: [0, 0, -72],
  leftLowerArm: [0, 0, 12],
};

// Finger curl presets — [proximal, intermediate, distal], curl axis is +Z.
const EXT: Deg3[] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];        // straight up
const CURL: Deg3[] = [[0, 0, 80], [0, 0, 95], [0, 0, 45]];    // closed into palm
const HALF: Deg3[] = [[0, 0, 42], [0, 0, 52], [0, 0, 28]];    // curved (C/O)
const HOOK: Deg3[] = [[0, 0, 22], [0, 0, 88], [0, 0, 55]];    // bent knuckle (X)

/** A uniform partial curl to `z` degrees at the base knuckle (proximal). */
const bend = (z: number): Deg3[] => [[0, 0, z], [0, 0, Math.min(z + 15, 95)], [0, 0, z * 0.55]];

// Thumb presets — [metacarpal, proximal, distal].
const THUMB_SIDE: { metacarpal: Deg3; proximal: Deg3; distal: Deg3 } = {
  metacarpal: [0, 0, 0], proximal: [0, 0, 0], distal: [0, 0, 0],
}; // resting out to the radial side / up (A, S base)
const THUMB_ACROSS: { metacarpal: Deg3; proximal: Deg3; distal: Deg3 } = {
  metacarpal: [0, 0, 42], proximal: [0, 0, 38], distal: [0, 0, 20],
}; // folded down across the front of the fingers (E, M, N, T)
const THUMB_OUT: { metacarpal: Deg3; proximal: Deg3; distal: Deg3 } = {
  metacarpal: [0, -35, -10], proximal: [0, 0, 0], distal: [0, 0, 0],
}; // extended away from the hand (L, Y)

const JOINTS = ['Proximal', 'Intermediate', 'Distal'] as const;

interface HandShape {
  index?: Deg3[];
  middle?: Deg3[];
  ring?: Deg3[];
  little?: Deg3[];
  thumb?: { metacarpal: Deg3; proximal: Deg3; distal: Deg3 };
  /** Direct bone overrides (finger spread via proximal Y, wrist, etc.). */
  extra?: Record<string, Deg3>;
}

function toQuat(d: Deg3): [number, number, number, number] {
  const e = new THREE.Euler(
    (d[0] * Math.PI) / 180,
    (d[1] * Math.PI) / 180,
    (d[2] * Math.PI) / 180,
    'XYZ',
  );
  const q = new THREE.Quaternion().setFromEuler(e);
  return [q.x, q.y, q.z, q.w];
}

/** Build a full VRMPose (base arm + handshape) from an Euler-degree spec. */
function buildPose(shape: HandShape): VRMPose {
  const spec: Record<string, Deg3> = { ...BASE_ARM };

  const setFinger = (name: string, triples: Deg3[]) => {
    JOINTS.forEach((joint, i) => {
      spec[`right${name}${joint}`] = triples[i];
    });
  };
  // Omitted fingers default to curled — most letters are a fist plus a few
  // extended fingers, so this keeps each entry to just what differs.
  setFinger('Index', shape.index ?? CURL);
  setFinger('Middle', shape.middle ?? CURL);
  setFinger('Ring', shape.ring ?? CURL);
  setFinger('Little', shape.little ?? CURL);

  const thumb = shape.thumb ?? THUMB_SIDE;
  spec.rightThumbMetacarpal = thumb.metacarpal;
  spec.rightThumbProximal = thumb.proximal;
  spec.rightThumbDistal = thumb.distal;

  if (shape.extra) Object.assign(spec, shape.extra);

  const pose: VRMPose = {};
  for (const [bone, deg] of Object.entries(spec)) {
    pose[bone as keyof VRMPose] = { rotation: toQuat(deg) };
  }
  return pose;
}

/** A held (static) letter → a 1-keyframe clip. */
function held(shape: HandShape, duration = 0.7): SignClip {
  return { duration, keyframes: [{ time: 0, pose: buildPose(shape) }] };
}

/** A letter with motion (J, Z) → a multi-keyframe clip. */
function motion(shapes: HandShape[], step = 0.35): SignClip {
  const keyframes = shapes.map((shape, i) => ({
    time: i * step,
    pose: buildPose(shape),
  }));
  return { duration: (shapes.length - 1) * step + 0.3, keyframes };
}

// Modest finger spread (proximal Y) for V, K, etc. — splays adjacent fingers.
const SPREAD_INDEX: Deg3 = [0, -18, 0];
const SPREAD_MIDDLE: Deg3 = [0, 18, 0];

// I-handshape base (little finger up, rest fisted) — reused by J's motion.
const I_SHAPE: HandShape = { little: EXT, thumb: THUMB_ACROSS };
// D/1-ish index-up base — reused by Z's motion.
const POINT_SHAPE: HandShape = { index: EXT, thumb: THUMB_ACROSS };

export const fingerspellingManifest: SignManifest = {
  // Fist, thumb resting up the side.
  A: held({ thumb: THUMB_SIDE }),
  // Four fingers straight up together, thumb folded across the palm.
  B: held({ index: EXT, middle: EXT, ring: EXT, little: EXT, thumb: THUMB_ACROSS }),
  // Curved claw — all fingers and thumb make a "C".
  C: held({ index: HALF, middle: HALF, ring: HALF, little: HALF, thumb: { metacarpal: [0, -25, 20], proximal: [0, 0, 15], distal: [0, 0, 10] } }),
  // Index up, others curled, thumb touching the middle finger.
  D: held({ index: EXT, thumb: THUMB_ACROSS }),
  // All fingertips curled down, thumb tucked across the front.
  E: held({ index: bend(70), middle: bend(70), ring: bend(70), little: bend(70), thumb: THUMB_ACROSS }),
  // Thumb + index pinch, other three fingers up.
  F: held({ index: HALF, middle: EXT, ring: EXT, little: EXT, thumb: { metacarpal: [0, -20, 30], proximal: [0, 0, 25], distal: [0, 0, 15] } }),
  // Index pointing (shown upright here), thumb alongside.
  G: held({ index: EXT, thumb: THUMB_OUT }),
  // Index + middle extended together.
  H: held({ index: EXT, middle: EXT, thumb: THUMB_ACROSS }),
  // Little finger up, rest fisted.
  I: held(I_SHAPE),
  // J = I-handshape drawing a small hook (little finger traces a J).
  J: motion([
    I_SHAPE,
    { little: EXT, thumb: THUMB_ACROSS, extra: { rightHand: [0, 0, -25] } },
    { little: EXT, thumb: THUMB_ACROSS, extra: { rightHand: [0, 0, -45], rightLowerArm: [0, 0, -125] } },
  ]),
  // Index + middle up in a V, thumb between them.
  K: held({ index: EXT, middle: EXT, thumb: { metacarpal: [0, -15, 35], proximal: [0, 0, 20], distal: [0, 0, 10] }, extra: { rightIndexProximal: SPREAD_INDEX, rightMiddleProximal: SPREAD_MIDDLE } }),
  // L-shape: index up, thumb out at a right angle.
  L: held({ index: EXT, thumb: THUMB_OUT }),
  // Thumb tucked under three fingers folded over it.
  M: held({ index: bend(60), middle: bend(60), ring: bend(60), thumb: THUMB_ACROSS }),
  // Thumb tucked under two fingers folded over it.
  N: held({ index: bend(60), middle: bend(60), thumb: THUMB_ACROSS }),
  // Rounded "O" — all fingertips meet the thumb.
  O: held({ index: HALF, middle: HALF, ring: HALF, little: HALF, thumb: { metacarpal: [0, -30, 45], proximal: [0, 0, 30], distal: [0, 0, 20] } }),
  // Like K/P — index + middle with thumb between (shown upright).
  P: held({ index: EXT, middle: EXT, thumb: { metacarpal: [0, -15, 35], proximal: [0, 0, 20], distal: [0, 0, 10] }, extra: { rightIndexProximal: SPREAD_INDEX, rightMiddleProximal: SPREAD_MIDDLE } }),
  // Like G — index + thumb (shown upright).
  Q: held({ index: EXT, thumb: THUMB_OUT }),
  // Index + middle crossed.
  R: held({ index: EXT, middle: bend(10), thumb: THUMB_ACROSS, extra: { rightIndexProximal: [0, 12, 0], rightMiddleProximal: [0, -14, 0] } }),
  // Fist with the thumb crossed over the front of the fingers.
  S: held({ thumb: { metacarpal: [0, 0, 48], proximal: [0, 0, 45], distal: [0, 0, 25] } }),
  // Thumb poked up between index and middle.
  T: held({ index: bend(55), thumb: { metacarpal: [0, 0, 30], proximal: [0, 0, 25], distal: [0, 0, 15] } }),
  // Index + middle up together (like H but upright).
  U: held({ index: EXT, middle: EXT, thumb: THUMB_ACROSS }),
  // Index + middle up, spread into a V.
  V: held({ index: EXT, middle: EXT, thumb: THUMB_ACROSS, extra: { rightIndexProximal: SPREAD_INDEX, rightMiddleProximal: SPREAD_MIDDLE } }),
  // Index + middle + ring up and spread.
  W: held({ index: EXT, middle: EXT, ring: EXT, thumb: THUMB_ACROSS, extra: { rightIndexProximal: [0, -20, 0], rightRingProximal: [0, 20, 0] } }),
  // Index hooked (crooked), rest fisted.
  X: held({ index: HOOK, thumb: THUMB_ACROSS }),
  // Thumb + little finger out ("hang loose"), rest fisted.
  Y: held({ little: EXT, thumb: THUMB_OUT }),
  // Z = index finger draws a Z in the air.
  Z: motion([
    POINT_SHAPE,
    { index: EXT, thumb: THUMB_ACROSS, extra: { rightLowerArm: [0, 0, -150] } },
    { index: EXT, thumb: THUMB_ACROSS, extra: { rightLowerArm: [0, 0, -130], rightHand: [0, 0, -20] } },
  ]),
};
