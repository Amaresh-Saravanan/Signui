import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, children, disabled, ...props }, ref) => {
    const base =
      'relative inline-flex items-center justify-center font-inter font-semibold select-none ' +
      'transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none ' +
      'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
      'rounded-lg';

    const variants: Record<string, string> = {
      primary:
        'bg-primary text-white hover:bg-primary-hover ' +
        'shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)] ' +
        'hover:shadow-[0_2px_8px_rgba(139,111,217,0.35)]',
      secondary:
        'bg-surface-alt text-text-primary border border-border hover:border-primary/50 hover:bg-surface-hover',
      outline:
        'border border-primary text-primary hover:bg-primary hover:text-white',
      ghost:
        'text-text-secondary hover:text-text-primary hover:bg-surface-alt',
      icon:
        'bg-surface-alt border border-border text-text-secondary hover:border-primary/50 hover:text-primary hover:bg-surface-hover',
      destructive:
        'bg-error/10 text-error border border-error/30 hover:bg-error hover:text-white',
    };

    const sizes: Record<string, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-5 text-sm gap-2',
      lg: 'h-12 px-7 text-base gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.015 }}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {children as any}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
