import { COMMON_WORDS } from '../constants/words';

/**
 * Predict word completions for a transcript prefix.
 *
 * Phrasebook words (personal / frequently used) rank ahead of dictionary words.
 * Matching is case-insensitive; exact-length matches are skipped (only strictly
 * longer completions are useful). Results are returned UPPERCASE to match the
 * transcript. Pure — no DOM, no side effects.
 */
export function predict(
  prefix: string,
  phrasebook?: Record<string, string[]>,
  limit = 3,
): string[] {
  const p = prefix.trim().toLowerCase();
  if (!p) return [];

  // Flatten single-word phrasebook entries across all categories, weighting
  // them first. Multi-word entries are irrelevant to per-word completion.
  const personal = phrasebook
    ? Object.values(phrasebook).flat().filter((w) => !/\s/.test(w))
    : [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const word of [...personal, ...COMMON_WORDS]) {
    const w = word.toLowerCase();
    if (w.length <= p.length) continue; // strictly longer only
    if (!w.startsWith(p)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w.toUpperCase());
    if (out.length >= limit) break;
  }

  return out;
}
