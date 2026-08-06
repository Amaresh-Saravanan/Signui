import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { useVRMAvatar } from '../hooks/useVRMAvatar';
import { useHolisticCapture, type HolisticFrame, type Landmark3D } from '../hooks/useHolisticCapture';
import { holisticToVRMPose } from '../lib/holisticToVRMPose';
import { Button } from '../components/Button';

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], [23, 24], // torso
];

function drawOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: HolisticFrame | null) {
  const w = video.videoWidth || canvas.width;
  const h = video.videoHeight || canvas.height;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!frame) return;

  const drawPoints = (landmarks: Landmark3D[] | null, color: string) => {
    if (!landmarks) return;
    ctx.fillStyle = color;
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  if (frame.poseLandmarks) {
    for (const [a, b] of POSE_CONNECTIONS) {
      const pa = frame.poseLandmarks[a];
      const pb = frame.poseLandmarks[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }
  }
  drawPoints(frame.poseLandmarks, '#60a5fa');
  drawPoints(frame.leftHandLandmarks, '#34d399');
  drawPoints(frame.rightHandLandmarks, '#f87171');
}

// Bones the mapping actually drives (arms + hands, not fingers — 30 finger
// axis helpers would clutter the view; extend this list the same way if
// finger-level axis inspection is needed later).
const AXIS_HELPER_BONES: VRMHumanBoneName[] = [
  'rightUpperArm' as VRMHumanBoneName,
  'rightLowerArm' as VRMHumanBoneName,
  'rightHand' as VRMHumanBoneName,
  'leftUpperArm' as VRMHumanBoneName,
  'leftLowerArm' as VRMHumanBoneName,
  'leftHand' as VRMHumanBoneName,
];

function BoneAxesHelpers({ vrm, visible }: { vrm: VRM | null; visible: boolean }) {
  const helpersRef = useRef<THREE.AxesHelper[]>([]);

  useEffect(() => {
    if (!vrm) return;
    const helpers: THREE.AxesHelper[] = [];
    for (const boneName of AXIS_HELPER_BONES) {
      const bone = vrm.humanoid?.getRawBoneNode(boneName);
      if (!bone) continue;
      const helper = new THREE.AxesHelper(0.1);
      helper.visible = visible;
      bone.add(helper);
      helpers.push(helper);
    }
    helpersRef.current = helpers;
    return () => {
      for (const helper of helpers) {
        helper.parent?.remove(helper);
        helper.dispose();
      }
      helpersRef.current = [];
    };
    // Deliberately excludes `visible` — the initial-visibility effect below
    // handles live toggling without re-creating the helpers on every flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm]);

  useEffect(() => {
    for (const helper of helpersRef.current) helper.visible = visible;
  }, [visible]);

  return null;
}

/**
 * Palm normal from bone world positions (wrist, index-proximal,
 * little-proximal), not finger curl — stays valid regardless of whether the
 * fingers are open or closed, unlike last session's curled-finger check
 * (which only worked for a static, fully-curled reference pose). The sign
 * of the resulting vector (which way it points relative to the camera) is
 * NOT asserted here — read the raw numbers against a known pose (e.g. palm
 * held flat toward the camera) during the Task 4 verification pass.
 */
function computePalmNormal(vrm: VRM, side: 'left' | 'right'): THREE.Vector3 | null {
  const wrist = vrm.humanoid?.getRawBoneNode(`${side}Hand` as VRMHumanBoneName);
  const index = vrm.humanoid?.getRawBoneNode(`${side}IndexProximal` as VRMHumanBoneName);
  const little = vrm.humanoid?.getRawBoneNode(`${side}LittleProximal` as VRMHumanBoneName);
  if (!wrist || !index || !little) return null;

  const wristPos = new THREE.Vector3();
  const indexPos = new THREE.Vector3();
  const littlePos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  index.getWorldPosition(indexPos);
  little.getWorldPosition(littlePos);

  const toIndex = indexPos.clone().sub(wristPos);
  const toLittle = littlePos.clone().sub(wristPos);
  if (toIndex.lengthSq() === 0 || toLittle.lengthSq() === 0) return null;
  return toIndex.cross(toLittle).normalize();
}

/** Wrist -> middle-finger-proximal direction — the hand's long axis, independent of curl or palm facing. */
function computeHandLongAxis(vrm: VRM, side: 'left' | 'right'): THREE.Vector3 | null {
  const wrist = vrm.humanoid?.getRawBoneNode(`${side}Hand` as VRMHumanBoneName);
  const middle = vrm.humanoid?.getRawBoneNode(`${side}MiddleProximal` as VRMHumanBoneName);
  if (!wrist || !middle) return null;

  const wristPos = new THREE.Vector3();
  const middlePos = new THREE.Vector3();
  wrist.getWorldPosition(wristPos);
  middle.getWorldPosition(middlePos);

  const axis = middlePos.clone().sub(wristPos);
  if (axis.lengthSq() === 0) return null;
  return axis.normalize();
}

interface ReadoutValues {
  rightPalmNormal: THREE.Vector3 | null;
  leftPalmNormal: THREE.Vector3 | null;
  rightHandAxis: THREE.Vector3 | null;
  leftHandAxis: THREE.Vector3 | null;
}

interface PoseCaptureSceneProps {
  latestFrameRef: React.RefObject<HolisticFrame | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showAxes: boolean;
  onReadout: (readout: ReadoutValues) => void;
}

function PoseCaptureScene({ latestFrameRef, videoRef, showAxes, onReadout }: PoseCaptureSceneProps) {
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm');
  const readoutTickRef = useRef(0);

  useFrame(() => {
    if (!vrm) return;
    const frame = latestFrameRef.current;
    if (frame) {
      // Applied directly, no frame-to-frame smoothing (see Global
      // Constraints) — avoids stale finger poses lingering when a hand
      // drops out of tracking.
      const targetPose = holisticToVRMPose(frame, videoRef.current);
      vrm.humanoid?.resetNormalizedPose();
      vrm.humanoid?.setNormalizedPose(targetPose);
    }
    vrm.update(0);

    // Numeric readout at ~6fps — every frame would be unreadable.
    readoutTickRef.current += 1;
    if (readoutTickRef.current % 10 === 0) {
      onReadout({
        rightPalmNormal: computePalmNormal(vrm, 'right'),
        leftPalmNormal: computePalmNormal(vrm, 'left'),
        rightHandAxis: computeHandLongAxis(vrm, 'right'),
        leftHandAxis: computeHandLongAxis(vrm, 'left'),
      });
    }
  });

  return (
    <>
      <primitive object={scene} />
      <BoneAxesHelpers vrm={vrm} visible={showAxes} />
    </>
  );
}

function formatVec(v: THREE.Vector3 | null): string {
  if (!v) return 'n/a';
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

export function PoseCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const latestFrameRef = useRef<HolisticFrame | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [showAxes, setShowAxes] = useState(true);
  const [readout, setReadout] = useState<ReadoutValues>({
    rightPalmNormal: null,
    leftPalmNormal: null,
    rightHandAxis: null,
    leftHandAxis: null,
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setCamError(err instanceof Error ? err.message : 'Camera access denied');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleFrame = useCallback((frame: HolisticFrame) => {
    latestFrameRef.current = frame;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (canvas && video) drawOverlay(canvas, video, frame);
  }, []);

  const { ready, error } = useHolisticCapture({ videoRef, enabled: true, onFrame: handleFrame });

  const readoutText = useMemo(
    () =>
      [
        `Holistic ready: ${ready}${error ? ` (error: ${error})` : ''}`,
        camError ? `Camera error: ${camError}` : null,
        `Right palm normal: ${formatVec(readout.rightPalmNormal)}`,
        `Left palm normal: ${formatVec(readout.leftPalmNormal)}`,
        `Right hand axis: ${formatVec(readout.rightHandAxis)}`,
        `Left hand axis: ${formatVec(readout.leftHandAxis)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    [ready, error, camError, readout],
  );

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-white">
      <div className="relative w-1/2 shrink-0">
        {/*
          Single mirror flip total, on the video only (matches Workspace.tsx's
          sign-detection camera stage). useHolisticCapture runs Holistic with
          selfieMode: true, which mirrors landmark x-coordinates internally to
          already match a mirrored view — drawing them unflipped onto a
          non-transformed canvas lines up with the CSS-mirrored video beneath
          it. Flipping the canvas too would double-mirror the dots onto the
          wrong hand. Both elements share `object-cover` so they crop this
          non-16:9 panel identically; without it the canvas's 1280x720
          backing store stretches instead of cropping and the dots drift off
          the body. Unverified live — first thing to sanity-check in Task 4.
        */}
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
        <canvas ref={overlayCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-700 p-3">
          <Button size="sm" variant="outline" onClick={() => setShowAxes((v) => !v)}>
            {showAxes ? 'Hide' : 'Show'} bone axes
          </Button>
        </div>
        <div className="flex-1">
          <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
            <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
            <ambientLight intensity={0.35} />
            <directionalLight position={[5, 5, 5]} intensity={0.9} />
            <Suspense fallback={null}>
              <PoseCaptureScene
                latestFrameRef={latestFrameRef}
                videoRef={videoRef}
                showAxes={showAxes}
                onReadout={setReadout}
              />
            </Suspense>
            <OrbitControls enablePan enableZoom minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
          </Canvas>
        </div>
        <pre className="border-t border-neutral-700 p-3 text-xs">{readoutText}</pre>
      </div>
    </div>
  );
}
