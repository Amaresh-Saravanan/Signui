import type { SignManifest } from '../data/signManifest';

/**
 * Resolve typed text into an ordered list of clip keys to play.
 *
 * Whole-phrase lookup first (case-insensitive, exact match against a
 * manifest key), then falls back to per-character fingerspelling — each
 * letter becomes its own uppercase clip key. Spaces, digits, and
 * punctuation are skipped, as are letters with no manifest entry. Returns
 * [] when nothing in the text resolves (including against an empty
 * manifest).
 */
export function resolveText(text: string, manifest: SignManifest): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const phraseKey = Object.keys(manifest).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase(),
  );
  if (phraseKey) return [phraseKey];

  const keys: string[] = [];
  for (const char of trimmed) {
    if (!/[a-zA-Z]/.test(char)) continue; // digits, spaces, punctuation
    const letterKey = char.toUpperCase();
    if (manifest[letterKey]) keys.push(letterKey);
  }
  return keys;
}
