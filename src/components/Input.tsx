import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { cn } from '../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: 'search';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, icon, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon === 'search' && (
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'w-full h-10 rounded-lg border border-border bg-surface-alt px-4 text-sm',
              'text-text-primary placeholder:text-text-secondary/60',
              'transition-all duration-200 outline-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/15',
              'hover:border-primary/40',
              icon === 'search' && 'pl-9',
              isPassword && 'pr-10',
              error && 'border-error focus:border-error focus:ring-error/15',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-error mt-0.5">{error}</span>}
        {hint && !error && <span className="text-xs text-text-secondary mt-0.5">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
