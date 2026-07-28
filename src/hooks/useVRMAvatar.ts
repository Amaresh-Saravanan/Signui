import { useEffect, useState } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// Fraction of the avatar's total height (feet at y=0) used as the vertical
// look-at point — lands on the upper chest/shoulders so the signing hand
// (which rises to shoulder/head height) sits centered in frame.
const CHEST_HEIGHT_RATIO = 0.72;
// Vertical extent actually fitted to the viewport, as a fraction of the
// avatar's full height. < 1 crops in to the upper body (roughly mid-torso to
// just above the head) instead of showing the whole standing figure, so the
// signing is the focus rather than a tiny full-body shot.
const FRAMING_FIT_RATIO = 0.62;
// Extra headroom multiplier on top of the tight vertical-fit distance so the
// head and the raised signing hand stay clear of the viewport edges.
const FRAMING_PADDING = 1.15;
// Zoom clamps as a ratio of the framing distance, so they scale with any
// model's own size instead of a fixed world-unit constant.
const MIN_ZOOM_RATIO = 0.5;
const MAX_ZOOM_RATIO = 2.4;

/** Camera position + OrbitControls target the view resets to. Captured once, when the model first frames itself. */
export interface DefaultView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface UseVRMAvatarResult {
  vrm: VRM | null;
  scene: THREE.Group;
}

/**
 * Loads a VRM at `path`, recenters it on its own bounding box, and frames
 * the camera/OrbitControls around its chest height. Shared by `Avatar3D`
 * and the dev-only Pose Editor so both reuse identical loading/framing
 * behavior. `controlsRef`/`defaultViewRef` are optional — the Pose Editor
 * has no OrbitControls clamping or reset-view button to wire up.
 */
export function useVRMAvatar(
  path: string,
  controlsRef?: React.RefObject<OrbitControlsImpl | null>,
  defaultViewRef?: React.RefObject<DefaultView | null>,
): UseVRMAvatarResult {
  const { camera } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);
  const gltf = useLoader(GLTFLoader, path, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (gltf.userData.vrm) {
      gltf.scene.add(gltf.userData.vrm.scene);
      setVrm(gltf.userData.vrm as VRM);
    }

    // Recenter on the model's own bounding box so this works for any GLB/VRM,
    // not just this specific avatar's authored pivot. Feet land on y=0 and
    // the horizontal center lands on the rotation axis (x=0, z=0), which is
    // what makes the idle spin read as turning around the body, not the feet.
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    gltf.scene.position.x -= center.x;
    gltf.scene.position.z -= center.z;
    gltf.scene.position.y -= box.min.y;

    const height = size.y;
    const chestHeight = height * CHEST_HEIGHT_RATIO;

    const perspCamera = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCamera.fov * Math.PI) / 180;
    // Fit only the upper-body slice (FRAMING_FIT_RATIO of full height) rather
    // than the whole figure, so the camera sits closer and the chest/hands fill
    // the frame.
    const fitHeight = height * FRAMING_FIT_RATIO;
    const distance = (fitHeight / 2 / Math.tan(fovRad / 2)) * FRAMING_PADDING;

    perspCamera.position.set(0, chestHeight, distance);
    perspCamera.near = Math.max(distance / 100, 0.01);
    perspCamera.far = distance * 10;
    perspCamera.updateProjectionMatrix();

    const target = new THREE.Vector3(0, chestHeight, 0);
    if (controlsRef?.current) {
      controlsRef.current.target.copy(target);
      // Same `distance` used to frame the shot, so clamping scales with the model.
      controlsRef.current.minDistance = distance * MIN_ZOOM_RATIO;
      controlsRef.current.maxDistance = distance * MAX_ZOOM_RATIO;
      controlsRef.current.update();
    }

    // Captured once — the reset button snaps back to this, not to whatever
    // the camera happens to be at when clicked.
    if (defaultViewRef) {
      defaultViewRef.current = { position: perspCamera.position.clone(), target: target.clone() };
    }

    // Dev-only: exposes the live VRM for measuring bone world transforms from
    // devtools (e.g. computing the exact wrist roll needed for a palm-forward
    // signing pose) without shipping any debug surface in production.
    if (import.meta.env.DEV) {
      const w = window as unknown as { __vrm?: unknown; __camera?: unknown; __controls?: unknown };
      w.__vrm = gltf.userData.vrm;
      w.__camera = perspCamera;
      w.__controls = controlsRef?.current;
    }
  }, [gltf, camera, controlsRef, defaultViewRef]);

  return { vrm, scene: gltf.scene };
}
