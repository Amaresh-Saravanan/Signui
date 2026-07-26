/**
 * Converts a "#RRGGBB" (or "RRGGBB") string to a comma-joined "r,g,b"
 * string, for interpolating into canvas rgba(...) strings. Returns null
 * for anything that isn't a well-formed 6-digit hex color.
 */
export function hexToRgb(hex: string): string | null {
  const match = hex.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `${r},${g},${b}`;
}
