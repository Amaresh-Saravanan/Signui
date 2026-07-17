import { cn } from '../../utils/cn';

/**
 * Stateless horizontal bar of one-tap counter phrases. Scrolls horizontally
 * when phrases overflow. Renders nothing when there are no phrases.
 */
export function QuickPhraseBar({
  phrases,
  onPick,
}: {
  phrases: string[];
  onPick: (phrase: string) => void;
}): React.JSX.Element | null {
  if (phrases.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
      {phrases.map((phrase) => (
        <button
          key={phrase}
          type="button"
          onClick={() => onPick(phrase)}
          aria-label={`Insert phrase: ${phrase}`}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold',
            'bg-surface-alt text-text-secondary border border-border',
            'transition-colors hover:text-primary hover:border-primary/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          )}
        >
          {phrase}
        </button>
      ))}
    </div>
  );
}
