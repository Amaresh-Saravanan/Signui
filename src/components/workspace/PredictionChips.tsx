import { cn } from '../../utils/cn';

/**
 * Stateless row of tappable word-completion chips. Renders nothing when there
 * are no suggestions. Tapping a chip commits that word via `onPick`.
 */
export function PredictionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (word: string) => void;
}): React.JSX.Element | null {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {suggestions.map((word) => (
        <button
          key={word}
          type="button"
          onClick={() => onPick(word)}
          aria-label={`Use word ${word}`}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wide',
            'bg-primary/10 text-primary border border-primary/20',
            'transition-colors hover:bg-primary/20 hover:border-primary/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          )}
        >
          {word}
        </button>
      ))}
    </div>
  );
}
