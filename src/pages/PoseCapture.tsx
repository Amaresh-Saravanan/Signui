import { useCallback, useEffect, useRef, useState } from 'react';
import { useHolisticCapture, type HolisticFrame } from '../hooks/useHolisticCapture';

export function PoseCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [frame, setFrame] = useState<HolisticFrame | null>(null);

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

  const handleFrame = useCallback((f: HolisticFrame) => setFrame(f), []);
  const { ready, error } = useHolisticCapture({ videoRef, enabled: true, onFrame: handleFrame });

  return (
    <div className="flex h-screen w-full gap-4 bg-neutral-900 p-4 text-white">
      <video ref={videoRef} autoPlay playsInline muted className="h-1/2 w-1/2 -scale-x-100 object-cover" />
      <pre className="flex-1 overflow-auto text-xs">
        {JSON.stringify(
          {
            camError,
            holisticReady: ready,
            holisticError: error,
            hasPoseLandmarks: !!frame?.poseLandmarks,
            hasPoseWorldLandmarks: !!frame?.poseWorldLandmarks,
            poseWorldLandmarkCount: frame?.poseWorldLandmarks?.length ?? 0,
            sampleWorldZ: frame?.poseWorldLandmarks?.[0]?.z ?? null,
            hasLeftHand: !!frame?.leftHandLandmarks,
            hasRightHand: !!frame?.rightHandLandmarks,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
