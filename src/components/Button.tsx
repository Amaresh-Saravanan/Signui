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

    // Base structural style - Restored font-general matching your onboarding screens
    const base =
      'relative inline-flex items-center justify-center font-general font-semibold select-none ' +
      'transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfa5]/50 ' +
      'focus-visible:ring-offset-2 focus-visible:ring-offset-background overflow-hidden active:scale-[0.98]';

    // Premium UI Theme variants - Restored clean flat/subtle brand-aligned teal gradients
    const variants: Record<string, string> = {
      primary:
        'bg-[#00bfa5] text-white ' +
        'shadow-[0_4px_14px_rgba(0,191,165,0.2)] hover:shadow-[0_6px_20px_rgba(0,191,165,0.35)] ' +
        'hover:bg-[#00a892] border border-white/5',

      secondary:
        'bg-white/[0.03] dark:bg-white/[0.01] text-text-primary border border-black/[0.06] dark:border-white/[0.05] ' +
        'backdrop-blur-md hover:border-[#00bfa5]/30 hover:bg-[#00bfa5]/[0.04] hover:text-[#00bfa5] shadow-sm',

      outline:
        'border border-[#00bfa5]/40 text-[#00bfa5] bg-transparent ' +
        'hover:bg-[#00bfa5]/[0.06] hover:border-[#00bfa5]/80',

      ghost:
        'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] dark:hover:bg-white/[0.02]',

      icon:
        'bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.05] text-text-secondary ' +
        'backdrop-blur-sm hover:border-[#00bfa5]/30 hover:text-[#00bfa5] hover:bg-white/[0.05] shadow-sm',

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