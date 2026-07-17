// Confidence heatmap overlay (F-45). There is no per-joint confidence from the
// landmark model, so we derive an honest risk signal from geometry: a joint
// near the frame edge is likely clipped / poorly tracked. Green = well inside
// frame, amber = near an edge.
import type { Landmark } from './aslClassifier';

/** Pure: 'risk' if the point is within `margin` (normalized) of any frame edge. */
export function edgeRisk(p: Landmark, margin = 0.05): 'ok' | 'risk' {
  return p.x < margin || p.x > 1 - margin || p.y < margin || p.y > 1 - margin
    ? 'risk'
    : 'ok';
}

const GREEN = '#10b981';
const AMBER = '#EA580C';

/** Draws a dot per landmark tinted by edge risk. Caller owns the canvas
 *  (no clearRect). Under highContrast, adds a white ring + larger radius so
 *  the signal isn't color-only. */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  w: number,
  h: number,
  opts?: { highContrast?: boolean },
): void {
  const hc = opts?.highContrast ?? false;
  const r = Math.max(3, w * 0.008) * (hc ? 1.4 : 1);

  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fillStyle = edgeRisk(p) === 'ok' ? GREEN : AMBER;
    ctx.fill();
    if (hc) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }
}
