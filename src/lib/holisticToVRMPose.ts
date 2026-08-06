import * as THREE from 'three';
import { Pose, Hand } from 'kalidokit';
import type { VRMPose } from '@pixiv/three-vrm';
import type { HolisticFrame } from '../hooks/useHolisticCapture';

interface Rotation3 {
  x: number;
  y: number;
  z: number;
  rotationOrder?: string;
}

function toQuat(r: Rotation3): [number, number, number, number] {
  const order = (r.rotationOrder ?? 'XYZ') as THREE.EulerOrder;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r.x, r.y, r.z, order));
  return [q.x, q.y, q.z, q.w];
}

function setBone(pose: VRMPose, boneKey: string, rotation: Rotation3 | undefined) {
  if (!rotation) return;
  pose[boneKey as keyof VRMPose] = { rotation: toQuat(rotation) };
}

// kalidokit Hand.solve() finger field name -> VRM bone name suffix.
// Index/Middle/Ring/Little map 1:1 (both use Proximal/Intermediate/Distal).
// Thumb is shifted by one joint: kalidokit emits a generic three-segment
// Proximal/Intermediate/Distal for every finger, but VRM's actual thumb rig
// has no "Intermediate" phalanx — it's Metacarpal/Proximal/Distal instead.
const FINGER_JOINTS: { kalidokit: string; vrm: string }[] = [
  { kalidokit: 'ThumbProximal', vrm: 'ThumbMetacarpal' },
  { kalidokit: 'ThumbIntermediate', vrm: 'ThumbProximal' },
  { kalidokit: 'ThumbDistal', vrm: 'ThumbDistal' },
  { kalidokit: 'IndexProximal', vrm: 'IndexProximal' },
  { kalidokit: 'IndexIntermediate', vrm: 'IndexIntermediate' },
  { kalidokit: 'IndexDistal', vrm: 'IndexDistal' },
  { kalidokit: 'MiddleProximal', vrm: 'MiddleProximal' },
  { kalidokit: 'MiddleIntermediate', vrm: 'MiddleIntermediate' },
  { kalidokit: 'MiddleDistal', vrm: 'MiddleDistal' },
  { kalidokit: 'RingProximal', vrm: 'RingProximal' },
  { kalidokit: 'RingIntermediate', vrm: 'RingIntermediate' },
  { kalidokit: 'RingDistal', vrm: 'RingDistal' },
  { kalidokit: 'LittleProximal', vrm: 'LittleProximal' },
  { kalidokit: 'LittleIntermediate', vrm: 'LittleIntermediate' },
  { kalidokit: 'LittleDistal', vrm: 'LittleDistal' },
];

function applyHand(
  pose: VRMPose,
  side: 'Left' | 'Right',
  handRig: Record<string, Rotation3 | undefined> | undefined,
  poseArmHandFallback: Rotation3 | undefined,
) {
  const vrmSide = side.toLowerCase();
  // Prefer the hand-landmark-derived wrist rotation (more accurate — built
  // from the actual hand shape); fall back to Pose.solve's coarser
  // arm-based hand estimate when the hand is off-camera/occluded, so the
  // wrist doesn't freeze into the rest pose while the arm keeps moving.
  const wrist = handRig?.[`${side}Wrist`];
  setBone(pose, `${vrmSide}Hand`, wrist ?? poseArmHandFallback);

  if (!handRig) return;
  for (const { kalidokit, vrm } of FINGER_JOINTS) {
    setBone(pose, `${vrmSide}${vrm}`, handRig[`${side}${kalidokit}`]);
  }
}

/**
 * Maps one Holistic capture frame onto the VRM humanoid's arm and finger
 * bones via kalidokit, mirroring the sign-animation engine's VRMPose shape
 * (Record<boneName, {rotation:[x,y,z,w]}>) so playback/recording code can
 * consume it identically to a hand-authored SignClip keyframe. Pure
 * function: no internal smoothing state — frame-to-frame damping is the
 * caller's job (via the existing lerpPose utility).
 *
 * Handedness note: kalidokit's PoseSolver computes its "Right*" output
 * fields from BlazePose landmark indices 11/13/15 and its "Left*" fields
 * from indices 12/14/16 (verified against kalidokit's calcArms.js source) —
 * the opposite of the anatomical left/right labels those indices carry in
 * MediaPipe's own documentation. This function forwards kalidokit's
 * Right->right / Left->left 1:1, matching this task's design brief exactly.
 * Whether that nets out to correct on-screen mirroring for this app's
 * selfieMode-enabled capture is NOT verified here — it requires a live
 * camera and is the explicit subject of a later human-verification task.
 */
export function holisticToVRMPose(frame: HolisticFrame, videoEl: HTMLVideoElement | null): VRMPose {
  const pose: VRMPose = {};
  if (!frame.poseWorldLandmarks || !frame.poseLandmarks) return pose;

  const poseRig = Pose.solve(
    frame.poseWorldLandmarks as unknown as Parameters<typeof Pose.solve>[0],
    frame.poseLandmarks as unknown as Parameters<typeof Pose.solve>[1],
    { runtime: 'mediapipe', video: videoEl, enableLegs: false },
  ) as unknown as Record<string, Rotation3 | undefined> | undefined;

  if (poseRig) {
    setBone(pose, 'rightUpperArm', poseRig.RightUpperArm);
    setBone(pose, 'rightLowerArm', poseRig.RightLowerArm);
    setBone(pose, 'leftUpperArm', poseRig.LeftUpperArm);
    setBone(pose, 'leftLowerArm', poseRig.LeftLowerArm);
  }

  const leftHandRig = frame.leftHandLandmarks
    ? (Hand.solve(frame.leftHandLandmarks, 'Left') as unknown as Record<string, Rotation3 | undefined> | undefined)
    : undefined;
  const rightHandRig = frame.rightHandLandmarks
    ? (Hand.solve(frame.rightHandLandmarks, 'Right') as unknown as Record<string, Rotation3 | undefined> | undefined)
    : undefined;

  applyHand(pose, 'Left', leftHandRig, poseRig?.LeftHand);
  applyHand(pose, 'Right', rightHandRig, poseRig?.RightHand);

  return pose;
}
