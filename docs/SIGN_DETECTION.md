# Sign Detection — Browser-Native Integration

This app integrates real-time ASL alphabet detection **entirely in the browser**,
adapted from the Python reference pipeline
([VAKULABHUSHAN/sign-language](https://github.com/VAKULABHUSHAN/sign-language)).

## How it maps to the original Python scripts

| Python script        | Browser equivalent                                              |
| -------------------- | -------------------------------------------------------------- |
| `test_camera.py`     | `getUserMedia` webcam capture in `Workspace.tsx`               |
| `live_detector.py`   | `src/hooks/useSignDetector.ts` (MediaPipe HandLandmarker loop) |
| MediaPipe hand model | `public/models/hand_landmarker.task` (bundled, no CDN)        |
| RandomForest `model.p` | `src/lib/aslClassifier.ts` (geometric classifier)           |

The original pipeline extracted 21 hand landmarks (42 `x,y` features) with
MediaPipe and fed them into a scikit-learn RandomForest. Because the trained
`model.p` and the `data/` set were never committed (both gitignored) and require
a webcam to produce, the **inference step is reimplemented as a geometric
classifier** that needs no training data and runs client-side.

## Architecture

```
Webcam (getUserMedia)
      │
      ▼
MediaPipe HandLandmarker  (WASM, /public/wasm + /public/models)
      │  21 landmarks (x, y)
      ▼
classifyASL()             (src/lib/aslClassifier.ts)
      │  letter + confidence
      ▼
temporal smoothing        (majority vote, src/hooks/useSignDetector.ts)
      │
      ▼
Workspace UI              (bounding box, live letter, word builder, transcript)
```

## Files added

- `src/lib/aslClassifier.ts` — geometric ASL alphabet classifier
- `src/hooks/useSignDetector.ts` — MediaPipe loader + per-frame detection loop
- `public/models/hand_landmarker.task` — MediaPipe hand model (~7.8 MB)
- `public/wasm/*` — MediaPipe vision WASM runtime

## Classifier coverage

`classifyASL` derives per-finger curl states (extended / half / closed), hand
orientation, index–middle spread & crossing, and thumb position, then matches
them against the alphabet:

- **Reliable:** A, B, C, D, F, G, H, I, K, L, O, R, U, V, W, X, Y
- **Lower confidence (ambiguous from landmarks):** E, S, T, M, N, P, Q
- **Not supported:** J and Z are *motion* gestures and cannot be recognized from
  a single frame.

Thresholds in `aslClassifier.ts` are reasonable defaults and may need on-device
tuning for a given camera/user.

## Using a custom-trained model instead

The geometric classifier is a heuristic, not a trained model. To plug in a
higher-accuracy model:

1. Run the original `collect_data.py` + `train_model.py` to produce `model.p`.
2. Export it to ONNX (`skl2onnx`) and place the `.onnx` in `public/models/`.
3. Add `onnxruntime-web`, load the session in `useSignDetector`, and replace the
   `classifyASL(lm)` call with an ONNX inference over the same 42-feature vector.

The landmark feature order already matches the Python pipeline
(`[x0, y0, x1, y1, …, x20, y20]`), so a converted model is drop-in compatible.
