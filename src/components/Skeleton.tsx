import { cn } from '../utils/cn';

/** Loading placeholder built on the .skeleton shimmer utility (index.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}
