import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';
import { useVRMAvatar } from '../hooks/useVRMAvatar';
import { useSignPlayer } from '../hooks/useSignPlayer';
import { eulerDegreesToQuaternion, type EulerDegrees } from '../lib/poseEditorMath';
import { BoneSlider } from '../components/BoneSlider';
import { Button } from '../components/Button';
import type { SignClip, SignKeyframe, SignManifest } from '../data/signManifest';

const BONE_GROUPS: { label: string; bones: VRMHumanBoneName[] }[] = [
  { label: 'Spine', bones: ['spine', 'chest', 'neck', 'head'] },
  { label: 'Shoulder', bones: ['leftShoulder', 'rightShoulder'] },
  {
    label: 'Arm',
    bones: ['leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
  },
  {
    label: 'Fingers',
    bones: [
      'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
    ],
  },
];

const ALL_BONES = BONE_GROUPS.flatMap((g) => g.bones);
const ZERO: EulerDegrees = { x: 0, y: 0, z: 0 };

function anglesToPose(angles: Record<string, EulerDegrees>): VRMPose {
  const pose: VRMPose = {};
  for (const bone of ALL_BONES) {
    const a = angles[bone];
    if (!a || (a.x === 0 && a.y === 0 && a.z === 0)) continue;
    pose[bone] = { rotation: eulerDegreesToQuaternion(a) };
  }
  return pose;
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PoseEditorSceneProps {
  angles: Record<string, EulerDegrees>;
  previewManifest: SignManifest;
  previewKey: string;
  previewRequestId: number;
}

function PoseEditorScene({ angles, previewManifest, previewKey, previewRequestId }: PoseEditorSceneProps) {
  const { vrm, scene } = useVRMAvatar('/avatar/malesign.vrm');
  const { state, play } = useSignPlayer(vrm, previewManifest);
  const lastPreviewId = useRef(0);

  useEffect(() => {
    if (previewRequestId !== lastPreviewId.current) {
      lastPreviewId.current = previewRequestId;
      play([previewKey]);
    }
  }, [previewRequestId, previewKey, play]);

  useFrame(() => {
    if (!vrm) return;
    // Live slider feedback: drive the pose from the current slider angles
    // every frame, except mid-preview — otherwise this would fight
    // useSignPlayer's own per-frame pose application.
    if (state !== 'playing') {
      vrm.humanoid?.setNormalizedPose(anglesToPose(angles));
      vrm.update(0);
    }
  });

  return <primitive object={scene} />;
}

export function PoseEditor() {
  const [targetKey, setTargetKey] = useState('A');
  const [angles, setAngles] = useState<Record<string, EulerDegrees>>({});
  const [keyframes, setKeyframes] = useState<SignKeyframe[]>([]);
  const [offsetSeconds, setOffsetSeconds] = useState(0.5);
  const [previewRequestId, setPreviewRequestId] = useState(0);

  const setAngle = (bone: string, axis: keyof EulerDegrees, value: number) => {
    setAngles((prev) => ({ ...prev, [bone]: { ...(prev[bone] ?? ZERO), [axis]: value } }));
  };

  const addKeyframe = () => {
    const time = keyframes.length === 0 ? 0 : keyframes[keyframes.length - 1].time + offsetSeconds;
    setKeyframes((prev) => [...prev, { time, pose: anglesToPose(angles) }]);
  };

  const removeKeyframe = (index: number) => {
    setKeyframes((prev) => prev.filter((_, i) => i !== index));
  };

  const clip: SignClip = useMemo(
    () => ({
      duration: keyframes.length > 0 ? keyframes[keyframes.length - 1].time + 0.5 : 0,
      keyframes,
    }),
    [keyframes],
  );

  const previewManifest: SignManifest = useMemo(() => ({ [targetKey]: clip }), [targetKey, clip]);

  const handleExport = () => {
    if (keyframes.length === 0) return;
    downloadJSON(`${targetKey}.json`, clip);
  };

  return (
    <div className="flex h-screen w-full bg-background text-text-primary">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-border p-4 space-y-4">
        <div>
          <label className="text-xs font-mono text-text-secondary">Target key</label>
          <input
            value={targetKey}
            onChange={(e) => setTargetKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
        </div>

        {BONE_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{group.label}</h3>
            {group.bones.map((bone) => (
              <div key={bone} className="mt-2 space-y-1">
                <p className="font-mono text-[10px] text-text-secondary">{bone}</p>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <BoneSlider
                    key={axis}
                    label={axis.toUpperCase()}
                    value={(angles[bone] ?? ZERO)[axis]}
                    onChange={(v) => setAngle(bone, axis, v)}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}

        <div className="space-y-2 border-t border-border pt-4">
          <label className="text-xs font-mono text-text-secondary">Offset from previous keyframe (s)</label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={offsetSeconds}
            onChange={(e) => setOffsetSeconds(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={addKeyframe}>
            Add keyframe
          </Button>
          <ul className="text-xs font-mono text-text-secondary">
            {keyframes.map((kf, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>t={kf.time.toFixed(2)}s</span>
                <button onClick={() => removeKeyframe(i)} className="text-error">
                  remove
                </button>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewRequestId((id) => id + 1)}
            disabled={keyframes.length === 0}
          >
            Preview
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExport} disabled={keyframes.length === 0}>
            Export
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <Canvas camera={{ position: [0, 1.2, 2.5], fov: 45, near: 0.05, far: 50 }}>
          <hemisphereLight args={['#ffffff', '#666666', 0.7]} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} />
          <Suspense fallback={null}>
            <PoseEditorScene
              angles={angles}
              previewManifest={previewManifest}
              previewKey={targetKey}
              previewRequestId={previewRequestId}
            />
          </Suspense>
          <OrbitControls enablePan enableZoom minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
        </Canvas>
      </div>
    </div>
  );
}
