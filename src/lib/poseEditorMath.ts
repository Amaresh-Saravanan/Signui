import * as THREE from 'three';

export interface EulerDegrees {
  x: number;
  y: number;
  z: number;
}

/** Bone-slider degrees (XYZ Euler) → a VRMPoseTransform-style quaternion [x,y,z,w]. */
export function eulerDegreesToQuaternion(euler: EulerDegrees): [number, number, number, number] {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rad(euler.x), rad(euler.y), rad(euler.z), 'XYZ'),
  );
  return [q.x, q.y, q.z, q.w];
}

/** Inverse of eulerDegreesToQuaternion — used to re-populate sliders when loading an existing pose into the editor. */
export function quaternionToEulerDegrees(rotation: [number, number, number, number]): EulerDegrees {
  const [x, y, z, w] = rotation;
  const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(x, y, z, w), 'XYZ');
  const deg = (rad: number) => (rad * 180) / Math.PI;
  return { x: deg(euler.x), y: deg(euler.y), z: deg(euler.z) };
}
