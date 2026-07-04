import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          checked ? 'bg-primary' : 'bg-surface-alt border border-border'
        )}
      >
        <motion.div
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full shadow-sm',
            checked ? 'bg-surface' : 'bg-text-secondary'
          )}
          layout
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          initial={false}
          animate={{
            x: checked ? 20 : 0,
          }}
        />
      </button>
      {label && <span className="text-sm font-medium select-none">{label}</span>}
    </label>
  );
}
