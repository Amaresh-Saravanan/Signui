/**
 * Empty visual placeholder for removed avatar slots.
 */
import { cn } from '../utils/cn';

interface AvatarPlaceholderProps {
  variant?: 'hero' | 'workspace' | 'profile';
  className?: string;
}

export function AvatarPlaceholder({ variant = 'profile', className }: AvatarPlaceholderProps) {
  const wrappers = {
    hero:      'w-full h-48 flex items-center justify-center rounded-2xl bg-surface-alt',
    workspace: 'w-full h-full flex items-center justify-center',
    profile:   'w-20 h-20 flex items-center justify-center rounded-2xl bg-surface-alt border border-border',
  };

  return (
    <div className={cn(wrappers[variant], className)} aria-hidden="true" />
  );
}
