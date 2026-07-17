// Low-light preprocessing (F-47). Brightens the camera frame before it reaches
// the model in dim rooms. Uses the native canvas `filter` — no pixel loops.

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Pure: canvas filter string. `amount` 0..1 → brightness/contrast/saturate
 *  boost, clamped. amount 0 ≈ neutral, amount 1 ≈ strongest. */
export function lowLightFilter(amount = 0.5): string {
  const a = clamp01(amount);
  const brightness = 1 + 0.8 * a; // 1.00 .. 1.80
  const contrast = 1 + 0.24 * a; // 1.00 .. 1.24
  const saturate = 1 + 0.1 * a; // 1.00 .. 1.10
  return `brightness(${brightness.toFixed(2)}) contrast(${contrast.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
}

/** Draws a brightened frame of `video` into `canvas`; returns the canvas, or
 *  null if the video isn't ready or a 2d context can't be had. */
export function applyLowLightBoost(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  amount = 0.5,
): HTMLCanvasElement | null {
  if (video.readyState < 2) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.filter = lowLightFilter(amount);
  ctx.drawImage(video, 0, 0);
  return canvas;
}
