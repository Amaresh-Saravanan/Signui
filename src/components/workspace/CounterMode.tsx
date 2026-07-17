import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Full-screen counter display: shows the outbound transcript at a distance,
 * most-recent line largest. Closes on backdrop click, the X button, or Escape.
 */
export function CounterMode({
  lines,
  onClose,
}: {
  lines: string[];
  onClose: () => void;
}): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Counter display"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex flex-col justify-end gap-4 bg-surface p-10 md:p-16"
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Exit counter mode"
        onClick={onClose}
        className={cn(
          'absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-xl',
          'border border-border bg-surface-alt text-text-secondary',
          'transition-colors hover:text-text-primary focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/50',
        )}
      >
        <X className="h-6 w-6" />
      </button>

      {lines.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-2xl text-text-secondary">
          Waiting for translation…
        </p>
      ) : (
        // Backdrop click closes; keep text clicks from bubbling isn't needed —
        // the whole surface is the backdrop and any click exits.
        lines.map((line, i) => {
          const isLatest = i === lines.length - 1;
          return (
            <p
              key={i}
              className={cn(
                'font-bold leading-tight text-text-primary',
                isLatest
                  ? 'text-5xl md:text-6xl'
                  : 'text-3xl text-text-secondary md:text-4xl',
              )}
            >
              {line}
            </p>
          );
        })
      )}
    </motion.div>
  );
}
