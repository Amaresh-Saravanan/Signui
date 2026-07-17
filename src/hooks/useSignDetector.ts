// ─────────────────────────────────────────────────────────────────────────────
// useSignDetector — browser-native replacement for the Python live_detector.py
//
// Loads the MediaPipe HandLandmarker (WASM, bundled under /public/wasm and
// /public/models) and runs it on a live <video> element via requestAnimationFrame.
// Each frame's 21 landmarks are passed to the geometric ASL classifier, then a
// short temporal vote stabilizes the output before it reaches the caller.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { classifyASL, type Landmark } from '../lib/aslClassifier';

export interface SignPrediction {
  letter: string;
  confidence: number; // 0..1, smoothed
  landmarks: Landmark[] | null;
}

interface UseSignDetectorOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onPrediction?: (p: SignPrediction) => void;
  /** Frames to hold a letter before it is considered stable. */
  smoothingWindow?: number;
  /** Detection rate cap (ML-7/PERF-4: 15-20fps budget). Default 18. */
  targetFps?: number;
}

interface UseSignDetectorReturn {
  ready: boolean;
  error: string | null;
  prediction: SignPrediction;
}

const WASM_PATH = '/wasm';
const MODEL_PATH = '/models/hand_landmarker.task';

/** Pure gate so the fps cap is unit-testable without rAF/MediaPipe. */
export function frameIsDue(now: number, lastTick: number, intervalMs: number): boolean {
  return now - lastTick >= intervalMs;
}

export function useSignDetector({
  videoRef,
  enabled,
  onPrediction,
  smoothingWindow = 6,
  targetFps = 18,
}: UseSignDetectorOptions): UseSignDetectorReturn {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<SignPrediction>({
    letter: '',
    confidence: 0,
    landmarks: null,
  });

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTickRef = useRef<number>(0);
  const historyRef = useRef<string[]>([]);
  const onPredictionRef = useRef(onPrediction);

  useEffect(() => {
    onPredictionRef.current = onPrediction;
  }, [onPrediction]);

  // Load the model once.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to load hand model',
          );
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  const smooth = useCallback(
    (letter: string): string => {
      const hist = historyRef.current;
      hist.push(letter);
      if (hist.length > smoothingWindow) hist.shift();

      // Majority vote across the window.
      const counts = new Map<string, number>();
      for (const l of hist) counts.set(l, (counts.get(l) ?? 0) + 1);
      let winner = letter;
      let max = 0;
      for (const [l, c] of counts) {
        if (c > max) {
          max = c;
          winner = l;
        }
      }
      return winner;
    },
    [smoothingWindow],
  );

  // Detection loop. Capped to targetFps (ML-7/PERF-4) and fully suspended
  // while the tab is hidden rather than just skipping work, so the browser
  // stops scheduling rAF callbacks for this loop entirely.
  useEffect(() => {
    if (!enabled || !ready) return;

    const intervalMs = 1000 / targetFps;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;

      if (frameIsDue(now, lastTickRef.current, intervalMs)) {
        lastTickRef.current = now;
        const video = videoRef.current;
        const landmarker = landmarkerRef.current;

        if (
          video &&
          landmarker &&
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = video.currentTime;
          let result: HandLandmarkerResult | undefined;
          try {
            result = landmarker.detectForVideo(video, performance.now());
          } catch {
            // Transient frame errors are non-fatal; skip this frame.
          }

          if (result && result.landmarks.length > 0) {
            const lm = result.landmarks[0] as Landmark[];
            const raw = classifyASL(lm);
            const stableLetter = smooth(raw.letter);
            const next: SignPrediction = {
              letter: stableLetter,
              confidence: raw.confidence,
              landmarks: lm,
            };
            setPrediction(next);
            onPredictionRef.current?.(next);
          } else {
            historyRef.current = [];
            const empty: SignPrediction = {
              letter: '',
              confidence: 0,
              landmarks: null,
            };
            setPrediction(empty);
            onPredictionRef.current?.(empty);
          }
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
      if (rafRef.current === null && !stopped) {
        rafRef.current = requestAnimationFrame(tick);
      }
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
      historyRef.current = [];
    };
  }, [enabled, ready, videoRef, smooth, targetFps]);

  return { ready, error, prediction };
}
