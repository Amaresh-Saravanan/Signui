import { Suspense, useCallback, useEffect, useRef, useState, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

// Fraction of the avatar's total height (feet at y=0) used as the vertical
// look-at point — lands roughly on the chest/upper torso for a standing
// humanoid, regardless of the model's actual proportions.
const CHEST_HEIGHT_RATIO = 0.6;
// Extra headroom multiplier on top of the tight vertical-fit distance so the
// head and feet stay clear of the viewport edges while orbiting.
const FRAMING_PADDING = 1.6;
// Zoom clamps as a ratio of the framing distance, so they scale with any
// model's own size instead of a fixed world-unit constant.
const MIN_ZOOM_RATIO = 0.4;
const MAX_ZOOM_RATIO = 2;
// Fallback background if the theme token can't be read (e.g. before mount).
const FALLBACK_SURFACE_COLOR = '#0f1419';

function readSurfaceColor(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
  return value || FALLBACK_SURFACE_COLOR;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-text-secondary font-mono">{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

/** Catches VRM load/parse failures so a broken model shows a message instead of a stuck spinner or a blank canvas. */
class AvatarErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[Avatar3D] Failed to load avatar model', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <span className="text-xs font-medium text-text-secondary">Couldn't load avatar</span>
        </Html>
      );
    }
    return this.props.children;
  }
}

/** Camera position + OrbitControls target the view resets to. Captured once, when the model first frames itself. */
interface DefaultView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
}

function VRMAvatar({ controlsRef, defaultViewRef }: VRMAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const gltf = useLoader(GLTFLoader, '/avatar/malesign.vrm', (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (gltf.userData.vrm) {
      gltf.scene.add(gltf.userData.vrm.scene);
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
    const distance = (height / 2 / Math.tan(fovRad / 2)) * FRAMING_PADDING;

    perspCamera.position.set(0, chestHeight, distance);
    perspCamera.near = Math.max(distance / 100, 0.01);
    perspCamera.far = distance * 10;
    perspCamera.updateProjectionMatrix();

    const target = new THREE.Vector3(0, chestHeight, 0);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      // Same `distance` used to frame the shot, so clamping scales with the model.
      controlsRef.current.minDistance = distance * MIN_ZOOM_RATIO;
      controlsRef.current.maxDistance = distance * MAX_ZOOM_RATIO;
      controlsRef.current.update();
    }

    // Captured once — the reset button snaps back to this, not to whatever
    // the camera happens to be at when clicked.
    defaultViewRef.current = { position: perspCamera.position.clone(), target: target.clone() };
  }, [gltf, camera, controlsRef, defaultViewRef]);

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}

/** Keeps the canvas background in sync with the live --color-surface theme token. */
function ThemeBackground({ color }: { color: string }) {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [scene, color]);
  return null;
}

interface Avatar3DProps {
  className?: string;
}

export function Avatar3D({ className }: Avatar3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const defaultViewRef = useRef<DefaultView | null>(null);
  const [surfaceColor, setSurfaceColor] = useState(readSurfaceColor);

  useEffect(() => {
    // Theme switches in this app via a class swap on <html> (see ThemeContext),
    // not the OS prefers-color-scheme media query, so a MutationObserver on
    // that class attribute is what actually catches a live toggle.
    const root = document.documentElement;
    const observer = new MutationObserver(() => setSurfaceColor(readSurfaceColor()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleReset = useCallback(() => {
    const controls = controlsRef.current;
    const view = defaultViewRef.current;
    if (!controls || !view) return;
    controls.object.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  }, []);

  return (
    <div className={cn('relative w-full h-full min-h-80 rounded-2xl overflow-hidden', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleReset}
        aria-label="Reset avatar view"
        className="glass absolute right-3 top-3 z-10 h-9 w-9 rounded-xl p-0"
      >
        <RotateCcw size={15} />
      </Button>
      <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
        <ThemeBackground color={surfaceColor} />
        <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} />
        <directionalLight position={[-3, 3, -3]} intensity={0.35} />
        <AvatarErrorBoundary>
          <Suspense fallback={<Loader />}>
            <VRMAvatar controlsRef={controlsRef} defaultViewRef={defaultViewRef} />
          </Suspense>
        </AvatarErrorBoundary>
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}
