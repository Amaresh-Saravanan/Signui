import { useEffect, useRef, useState } from 'react';
import type { Holistic as HolisticClass, Results, Options } from '@mediapipe/holistic';
import { frameIsDue } from './useSignDetector';

declare global {
  interface Window {
    Holistic: typeof HolisticClass;
  }
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HolisticFrame {
  poseLandmarks: Landmark3D[] | null;
  poseWorldLandmarks: Landmark3D[] | null;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
}

interface UseHolisticCaptureOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onFrame?: (frame: HolisticFrame) => void;
  /** Detection rate cap, mirrors useSignDetector's ML-7/PERF-4 budget. */
  targetFps?: number;
}

interface UseHolisticCaptureReturn {
  ready: boolean;
  error: string | null;
}

const HOLISTIC_BASE_PATH = '/mediapipe/holistic';

let scriptLoadPromise: Promise<void> | null = null;

/** Injects the self-hosted Holistic script once; resolves once window.Holistic exists. */
function loadHolisticScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.Holistic) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `${HOLISTIC_BASE_PATH}/holistic.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load MediaPipe Holistic script'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * @mediapipe/holistic's public Results type has no poseWorldLandmarks field
 * (verified against the package's own index.d.ts: only poseLandmarks,
 * faceLandmarks, multiFaceGeometry, rightHandLandmarks, leftHandLandmarks,
 * segmentationMask, image are declared). The metric, hip-centered world
 * landmarks kalidokit's Pose.solve requires DO exist on the runtime result
 * object, but under an internal property name Closure Compiler assigns per
 * build — not guaranteed stable across versions (community demos have
 * observed different single-letter names on different builds). This scans
 * structurally instead of hardcoding a guessed name: the only other own
 * property that is an array of exactly 33 landmark-shaped objects is the
 * world landmarks (poseLandmarks is the known/typed one; faceLandmarks has
 * 468 points; hand landmarks have 21).
 */
function findPoseWorldLandmarks(results: Results): Landmark3D[] | null {
  const record = results as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'poseLandmarks') continue;
    if (!Array.isArray(value) || value.length !== 33) continue;
    const first = value[0] as Partial<Landmark3D> | undefined;
    if (first && typeof first.x === 'number' && typeof first.y === 'number' && typeof first.z === 'number') {
      return value as Landmark3D[];
    }
  }
  return null;
}

/**
 * Loads MediaPipe Holistic (self-hosted, script-tag injected) and runs it
 * against the caller-owned <video> element, fps-capped the same way
 * useSignDetector caps HandLandmarker. selfieMode mirrors the user so the
 * avatar acts as a performer reproducing your actual anatomy (approved
 * design decision) rather than a literal unmirrored frame copy.
 */
export function useHolisticCapture({
  videoRef,
  enabled,
  onFrame,
  targetFps = 18,
}: UseHolisticCaptureOptions): UseHolisticCaptureReturn {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holisticRef = useRef<HolisticClass | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    let cancelled = false;
    loadHolisticScript()
      .then(() => {
        if (cancelled) return;
        const holistic = new window.Holistic({
          locateFile: (file: string) => `${HOLISTIC_BASE_PATH}/${file}`,
        });
        const options: Options = {
          selfieMode: true,
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        };
        holistic.setOptions(options);
        holistic.onResults((results: Results) => {
          onFrameRef.current?.({
            poseLandmarks: (results.poseLandmarks as unknown as Landmark3D[] | undefined) ?? null,
            poseWorldLandmarks: findPoseWorldLandmarks(results),
            leftHandLandmarks: (results.leftHandLandmarks as unknown as Landmark3D[] | undefined) ?? null,
            rightHandLandmarks: (results.rightHandLandmarks as unknown as Landmark3D[] | undefined) ?? null,
          });
        });
        holisticRef.current = holistic;
        setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load MediaPipe Holistic');
      });
    return () => {
      cancelled = true;
      void holisticRef.current?.close();
      holisticRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !ready) return;
    const intervalMs = 1000 / targetFps;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      if (frameIsDue(now, lastTickRef.current, intervalMs)) {
        lastTickRef.current = now;
        const video = videoRef.current;
        const holistic = holisticRef.current;
        if (video && holistic && video.readyState >= 2) {
          void holistic.send({ image: video });
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const startLoop = () => {
      if (rafRef.current === null && !stopped) rafRef.current = requestAnimationFrame(tick);
    };
    const handleVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) startLoop();

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      stopLoop();
    };
  }, [enabled, ready, videoRef, targetFps]);

  return { ready, error };
}
