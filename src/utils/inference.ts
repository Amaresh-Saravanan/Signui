// ponytail: hand-rolled MLP forward pass; switch to tfjs only if the model outgrows an MLP.
// Mirrors ml/common.py exactly (normalize + forward) so a shared testVector can cross-check both.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Model {
  labels: string[];
  weights: number[][][];
  biases: number[][];
}

interface ModelFile extends Model {
  testVector: { input: number[]; output: number[] };
}

/** landmark-major flatten of 21 (x,y,z) points -> translate by wrist (idx 0) -> scale by max abs coord. */
export function normalize(landmarks: Landmark[] | number[]): number[] {
  const flat: number[] =
    landmarks.length > 0 && typeof landmarks[0] === 'object'
      ? (landmarks as Landmark[]).flatMap((p) => [p.x, p.y, p.z])
      : (landmarks as number[]);

  if (flat.length !== 63) {
    throw new Error(`expected 63 coords, got ${flat.length}`);
  }

  const [wx, wy, wz] = flat;
  const out: number[] = [];
  for (let i = 0; i < 63; i += 3) {
    out.push(flat[i] - wx, flat[i + 1] - wy, flat[i + 2] - wz);
  }

  const scale = Math.max(...out.map(Math.abs));
  if (scale === 0) return out; // all points coincide with wrist; avoid divide-by-zero
  return out.map((v) => v / scale);
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

/** weights[layer][in][out], biases[layer][out]. ReLU on hidden layers, softmax on the output layer. */
export function forward(x: number[], weights: number[][][], biases: number[][]): number[] {
  let a = x;
  for (let li = 0; li < weights.length; li++) {
    const w = weights[li];
    const b = biases[li];
    const z = b.map((bo, o) => a.reduce((sum, ai, i) => sum + ai * w[i][o], 0) + bo);
    a = li < weights.length - 1 ? z.map((v) => Math.max(0, v)) : softmax(z);
  }
  return a;
}

let model: Model | null = null;

/** Fetches /model.json once and verifies the forward pass against its testVector. */
export async function loadModel(): Promise<boolean> {
  try {
    const res = await fetch('/model.json');
    const data = (await res.json()) as ModelFile;
    const out = forward(data.testVector.input, data.weights, data.biases);
    const maxDiff = Math.max(...out.map((v, i) => Math.abs(v - data.testVector.output[i])));
    // !(x < eps) instead of x >= eps so NaN (malformed weights/shape) fails closed
    if (!(maxDiff < 1e-4)) {
      console.error('inference: model.json test vector mismatch, refusing to classify', maxDiff);
      model = null;
      return false;
    }
    if (data.labels.length !== data.biases[data.biases.length - 1].length) {
      console.error('inference: labels/output-layer size mismatch, refusing to classify');
      model = null;
      return false;
    }
    model = { labels: data.labels, weights: data.weights, biases: data.biases };
    return true;
  } catch (err) {
    console.error('inference: failed to load model.json', err);
    model = null;
    return false;
  }
}

export function isModelAvailable() {
  return model !== null;
}

export function classify(landmarks: Landmark[] | number[]): { label: string; confidence: number } | null {
  if (!model) return null;
  const x = normalize(landmarks);
  const probs = forward(x, model.weights, model.biases);
  let best = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
  if (Number.isNaN(probs[best])) return null; // degenerate landmarks -> no result, not a garbage one
  return { label: model.labels[best], confidence: probs[best] };
}
