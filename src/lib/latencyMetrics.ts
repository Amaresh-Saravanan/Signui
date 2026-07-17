// Module-level rolling buffer of per-frame inference latency (ms). A singleton
// so samples recorded while the detector runs on Workspace survive the route
// change to Analytics (component state would not).
//
// SEAM (not yet wired): useSignDetector.ts is owned by another agent and not
// edited here. To populate real samples, wrap the detectForVideo call
// (src/hooks/useSignDetector.ts ~line 155) with a performance.now() delta and
// call recordLatencySample(ms) right after. Until that seam is added,
// getAverageLatencyMs() returns null and Analytics shows "—" — never a fake
// number.

const MAX_SAMPLES = 50;
const samples: number[] = [];

export function recordLatencySample(ms: number): void {
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function getAverageLatencyMs(): number | null {
  if (samples.length === 0) return null;
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return Math.round(avg);
}
