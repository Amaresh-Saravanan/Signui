import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  highlight?: boolean; // adds subtle left-border accent
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', interactive = false, highlight = false, children, ...props }, ref) => {
    const pads = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' };

    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -2 } : undefined}
        transition={{ duration: 0.2 }}
        className={cn(
          'bg-surface border border-border rounded-2xl',
          'shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.4)]',
          interactive && 'cursor-pointer hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(139,111,217,0.12)] transition-all duration-200',
          highlight && 'border-l-2 border-l-primary',
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
