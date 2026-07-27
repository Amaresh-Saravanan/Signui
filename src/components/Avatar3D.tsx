import { Suspense, useCallback, useEffect, useRef, useState, Component } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { useVRMAvatar, type DefaultView } from '../hooks/useVRMAvatar';
import { useSignPlayer, type SignPlayerState } from '../hooks/useSignPlayer';
import { resolveText } from '../lib/resolveText';
import { signManifest } from '../data/signManifest';

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

interface VRMAvatarProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultViewRef: React.RefObject<DefaultView | null>;
  playRequest?: { text: string; id: number } | null;
  onPlaybackStateChange?: (state: SignPlayerState) => void;
}

function VRMAvatar({ controlsRef, defaultViewRef, playRequest, onPlaybackStateChange }: VRMAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm', controlsRef, defaultViewRef);
  const { state, play } = useSignPlayer(vrm, signManifest);

  useEffect(() => {
    onPlaybackStateChange?.(state);
  }, [state, onPlaybackStateChange]);

  useEffect(() => {
    if (!playRequest) return;
    if (!vrm) return; // dropped — no VRM to animate yet; not retried once it loads
    play(resolveText(playRequest.text, signManifest));
    // Intentionally keyed on `playRequest.id` alone, not `.text` — resubmitting
    // identical text (same string, new id) must still retrigger playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playRequest?.id]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
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
  playRequest?: { text: string; id: number } | null;
  onPlaybackStateChange?: (state: SignPlayerState) => void;
}

export function Avatar3D({ className, playRequest, onPlaybackStateChange }: Avatar3DProps) {
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
            <VRMAvatar
              controlsRef={controlsRef}
              defaultViewRef={defaultViewRef}
              playRequest={playRequest}
              onPlaybackStateChange={onPlaybackStateChange}
            />
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
