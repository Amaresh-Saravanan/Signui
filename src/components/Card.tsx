import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  highlight?: boolean;    // adds left-border accent
  glass?: boolean;        // glassmorphism variant
  gradient?: boolean;     // adds subtle gradient background
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', interactive = false, highlight = false, glass = false, gradient = false, children, ...props }, ref) => {
    const pads = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6', xl: 'p-8' };

    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -3, scale: 1.005 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn(
          'relative rounded-2xl border border-border/80 transition-all duration-300',
          glass
            ? 'backdrop-blur-md bg-surface/80 border-border/60'
            : 'bg-surface',
          gradient && 'bg-gradient-to-br from-surface via-surface to-surface-alt/50',
          'shadow-card dark:shadow-card-dark',
          interactive && [
            'cursor-pointer',
            'hover:border-primary/40 hover:shadow-card-hover dark:hover:shadow-card-dark-hover',
          ],
          highlight && 'border-l-[3px] border-l-primary',
          pads[padding],
          className
        )}
        {...props}
      >
        {children as any}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
