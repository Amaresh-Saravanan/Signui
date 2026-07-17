import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, children, disabled, ...props }, ref) => {

    // Base structural style. All colors route through theme tokens so light,
    // dark, and high-contrast themes stay in sync (index.css owns the values).
    const base =
      'relative inline-flex items-center justify-center font-general font-semibold select-none ' +
      'transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
      'focus-visible:ring-offset-2 focus-visible:ring-offset-background overflow-hidden active:scale-[0.98]';

    const variants: Record<string, string> = {
      primary:
        'bg-primary text-on-primary hover:bg-primary-hover border border-white/5 ' +
        'shadow-sm hover:shadow-md',

      secondary:
        'bg-surface text-text-primary border border-border ' +
        'hover:border-primary/40 hover:text-primary shadow-sm',

      outline:
        'border border-primary/40 text-primary bg-transparent ' +
        'hover:bg-primary-soft hover:border-primary/80',

      ghost:
        'text-text-secondary hover:text-text-primary hover:bg-surface-hover',

      icon:
        'bg-surface border border-border text-text-secondary ' +
        'hover:border-primary/40 hover:text-primary shadow-sm',

      destructive:
        'bg-error/[0.06] text-error border border-error/20 ' +
        'hover:bg-error hover:text-white hover:border-error',
    };

    // Upgraded padding and typography structure - Removed clinical uppercase micro-text
    const sizes: Record<string, string> = {
      sm: 'h-8 px-3.5 text-xs gap-1.5 rounded-lg font-semibold',
      md: 'h-10 px-5 text-sm gap-2 rounded-xl', // Clean, readable sentence-case friendly look
      lg: 'h-12 px-7 text-sm font-medium gap-2.5 rounded-2xl',
      xl: 'h-14 px-8 text-base font-medium gap-3 rounded-2xl',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{
          scale: disabled ? 1 : 1.015,
          y: disabled ? 0 : -0.5
        }}
        whileTap={{
          scale: disabled ? 1 : 0.98
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 24
        }}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {/* Render child components natively */}
        <span className="relative z-10 flex items-center justify-center gap-inherit">
          {children as any}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';