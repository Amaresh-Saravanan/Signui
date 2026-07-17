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
  GestureRecognizer,
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
  /** 'trained' once the versioned GestureRecognizer model has loaded;
   *  'heuristic' when running the geometric fallback classifier (F-2 —
   *  trained model primary, heuristic flagged fallback). */
  modelMode: 'trained' | 'heuristic';
  /** Version string of the active trained model, or null in heuristic mode
   *  (F-37 — version surfaced in-app). */
  modelVersion: string | null;
}

const WASM_PATH = '/wasm';
const HAND_MODEL_PATH = '/models/hand_landmarker.task';
// Trained gesture recognizer (M4.1/4.3). Versioned filename — /models is
// immutable-cached for a year, so a new model ships as a new filename
// (asl-fingerspelling-v2.task, …), never an in-place overwrite (F-37).
const GESTURE_MODEL_PATH = '/models/asl-fingerspelling-v1.task';
const GESTURE_MODEL_VERSION = 'asl-fingerspelling-v1';

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

  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastTickRef = useRef<number>(0);
  const historyRef = useRef<string[]>([]);
  const onPredictionRef = useRef(onPrediction);
  const [modelMode, setModelMode] = useState<'trained' | 'heuristic'>('heuristic');

  useEffect(() => {
    onPredictionRef.current = onPrediction;
  }, [onPrediction]);

  // Load the model once. Prefers the trained GestureRecognizer (F-2); falls
  // back to HandLandmarker + the geometric heuristic classifier if the
  // trained model hasn't shipped yet or fails to load, so the app degrades
  // gracefully instead of breaking (M4.3).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

        try {
          const recognizer = await GestureRecognizer.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: GESTURE_MODEL_PATH },
            runningMode: 'VIDEO',
            numHands: 1,
          });
          if (cancelled) {
            recognizer.close();
            return;
          }
          gestureRecognizerRef.current = recognizer;
          setModelMode('trained');
        } catch {
          const landmarker = await HandLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: HAND_MODEL_PATH },
            runningMode: 'VIDEO',
            numHands: 1,
          });
          if (cancelled) {
            landmarker.close();
            return;
          }
          landmarkerRef.current = landmarker;
          setModelMode('heuristic');
        }
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
      gestureRecognizerRef.current?.close();
      gestureRecognizerRef.current = null;
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

  // Shared sink for both detection paths (trained model / heuristic) so the
  // smoothing + callback logic isn't duplicated per branch.
  const emit = useCallback(
    (letter: string, confidence: number, landmarks: Landmark[] | null) => {
      if (!landmarks) {
        historyRef.current = [];
        const empty: SignPrediction = { letter: '', confidence: 0, landmarks: null };
        setPrediction(empty);
        onPredictionRef.current?.(empty);
        return;
      }
      const stableLetter = smooth(letter);
      const next: SignPrediction = { letter: stableLetter, confidence, landmarks };
      setPrediction(next);
      onPredictionRef.current?.(next);
    },
    [smooth],
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
        const recognizer = gestureRecognizerRef.current;
        const landmarker = landmarkerRef.current;

        if (
          video &&
          (recognizer || landmarker) &&
          video.readyState >= 2 &&
          video.currentTime !== lastVideoTimeRef.current
        ) {
          lastVideoTimeRef.current = video.currentTime;

          if (recognizer) {
            let result: ReturnType<GestureRecognizer['recognizeForVideo']> | undefined;
            try {
              result = recognizer.recognizeForVideo(video, performance.now());
            } catch {
              // Transient frame errors are non-fatal; skip this frame.
            }
            if (result && result.landmarks.length > 0 && result.gestures.length > 0) {
              const lm = result.landmarks[0] as Landmark[];
              const top = result.gestures[0][0];
              // 'none' is the trained model's explicit no-gesture class.
              emit(top.categoryName === 'none' ? '' : top.categoryName, top.score, lm);
            } else {
              emit('', 0, null);
            }
          } else if (landmarker) {
            let result: ReturnType<HandLandmarker['detectForVideo']> | undefined;
            try {
              result = landmarker.detectForVideo(video, performance.now());
            } catch {
              // Transient frame errors are non-fatal; skip this frame.
            }
            if (result && result.landmarks.length > 0) {
              const lm = result.landmarks[0] as Landmark[];
              const raw = classifyASL(lm);
              emit(raw.letter, raw.confidence, lm);
            } else {
              emit('', 0, null);
            }
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
  }, [enabled, ready, videoRef, emit, targetFps]);

  return {
    ready,
    error,
    prediction,
    modelMode,
    modelVersion: modelMode === 'trained' ? GESTURE_MODEL_VERSION : null,
  };
}
