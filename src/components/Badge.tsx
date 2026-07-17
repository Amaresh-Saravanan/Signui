import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'live';
}

/**
 * Status vocabulary: confidence, language, live state. Colors route through
 * theme tokens; `live` adds the pulsing dot (pulse = state, honored by the
 * reduce-motion CSS kill-switch).
 */
export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    neutral: 'bg-surface-alt text-text-secondary border-border',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-conf-mid/10 text-conf-mid border-conf-mid/20',
    error: 'bg-error/10 text-error border-error/20',
    live: 'bg-error/10 text-error border-error/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {variant === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-error ember-pulse" aria-hidden />}
      {children}
    </span>
  );
}
