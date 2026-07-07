// One-off generator for the stub Signui/public/model.json (training pipeline overwrites this later).
// Not wired into the build; run manually with `node scripts/gen-stub-model.cjs` if the stub needs regenerating.
const fs = require('fs');
const path = require('path');

// Deterministic PRNG so the stub is reproducible.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1; // [-1, 1)
}

function makeLayer(nIn, nOut, scale) {
  const w = Array.from({ length: nIn }, () => Array.from({ length: nOut }, () => rand() * scale));
  const b = Array.from({ length: nOut }, () => rand() * scale * 0.1);
  return { w, b };
}

function softmax(z) {
  const m = Math.max(...z);
  const exps = z.map((v) => Math.exp(v - m));
  const s = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / s);
}

function forward(x, weights, biases) {
  let a = x;
  for (let li = 0; li < weights.length; li++) {
    const w = weights[li];
    const b = biases[li];
    const z = b.map((bo, o) => a.reduce((sum, ai, i) => sum + ai * w[i][o], 0) + bo);
    a = li < weights.length - 1 ? z.map((v) => Math.max(0, v)) : softmax(z);
  }
  return a;
}

const labels = ['hello', 'yes', 'no'];
const l1 = makeLayer(63, 64, 0.05);
const l2 = makeLayer(64, 32, 0.05);
const l3 = makeLayer(32, labels.length, 0.05);

const weights = [l1.w, l2.w, l3.w];
const biases = [l1.b, l2.b, l3.b];

const input = Array.from({ length: 63 }, () => rand() * 0.5);
const output = forward(input, weights, biases);

const model = { labels, weights, biases, testVector: { input, output } };

const outPath = path.join(__dirname, '..', 'public', 'model.json');
fs.writeFileSync(outPath, JSON.stringify(model));
console.log('wrote', outPath, fs.statSync(outPath).size, 'bytes');
