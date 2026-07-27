import * as THREE from 'three';
import type { VRMPose } from '@pixiv/three-vrm';

/**
 * Slerps each bone's rotation between two poses. Position is ignored — this
 * engine only drives rotation. A bone present in only one of the two poses
 * passes through unchanged (there's no partner to blend with).
 */
export function lerpPose(a: VRMPose, b: VRMPose, t: number): VRMPose {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof VRMPose>;
  const out: VRMPose = {};
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();

  for (const key of keys) {
    const ta = a[key];
    const tb = b[key];
    if (ta && tb) {
      const ra = ta.rotation ?? [0, 0, 0, 1];
      const rb = tb.rotation ?? [0, 0, 0, 1];
      qa.set(ra[0], ra[1], ra[2], ra[3]);
      qb.set(rb[0], rb[1], rb[2], rb[3]);
      qa.slerp(qb, t);
      out[key] = { rotation: [qa.x, qa.y, qa.z, qa.w] };
    } else {
      out[key] = ta ?? tb;
    }
  }

  return out;
}
