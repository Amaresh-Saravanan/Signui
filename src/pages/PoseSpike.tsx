import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

declare global {
  interface Window {
    __vrm?: import('@pixiv/three-vrm').VRM;
    __setPose?: (pose: import('@pixiv/three-vrm').VRMPose) => void;
    __frameOnBone?: (boneName: string, distance?: number) => void;
    __camera?: THREE.PerspectiveCamera;
    __controls?: OrbitControlsImpl | null;
  }
}

interface SpikeAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

function SpikeAvatar({ controlsRef }: SpikeAvatarProps) {
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, '/avatar/malesign.vrm', (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    const vrm = gltf.userData.vrm;
    if (!vrm) return;
    if (vrm.scene !== gltf.scene) gltf.scene.add(vrm.scene);

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.x -= center.x;
    gltf.scene.position.z -= center.z;
    gltf.scene.position.y -= box.min.y;
    vrm.update(0);

    const perspCamera = camera as THREE.PerspectiveCamera;

    const frameOnBone = (boneName: string, distance = 0.35) => {
      const node = vrm.humanoid?.getNormalizedBoneNode(boneName as never);
      if (!node) {
        console.warn('[PoseSpike] no such bone:', boneName);
        return;
      }
      const target = new THREE.Vector3();
      node.getWorldPosition(target);
      perspCamera.position.set(target.x, target.y + distance * 0.15, target.z + distance);
      perspCamera.near = 0.01;
      perspCamera.far = 20;
      perspCamera.updateProjectionMatrix();
      perspCamera.lookAt(target);
      if (controlsRef.current) {
        controlsRef.current.target.copy(target);
        controlsRef.current.update();
      }
    };

    window.__vrm = vrm;
    window.__setPose = (pose) => {
      vrm.humanoid?.setNormalizedPose(pose);
      vrm.update(0);
    };
    window.__frameOnBone = frameOnBone;
    window.__camera = perspCamera;
    window.__controls = controlsRef.current;

    // Default framing: right hand, since that's where fingerspelling lives.
    frameOnBone('rightHand');

    console.log('[PoseSpike] humanBones:', Object.keys(vrm.humanoid?.humanBones ?? {}));
    console.log('[PoseSpike] window.__vrm ready. window.__setPose(pose), window.__frameOnBone(boneName, distance)');
  }, [gltf, camera, controlsRef]);

  return <primitive object={gltf.scene} />;
}

export function PoseSpike() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  return (
    <div className="w-screen h-screen bg-neutral-800">
      <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
        <hemisphereLight args={['#ffffff', '#666666', 0.9]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <SpikeAvatar controlsRef={controlsRef} />
        </Suspense>
        <OrbitControls ref={controlsRef} enablePan enableZoom />
      </Canvas>
    </div>
  );
}
