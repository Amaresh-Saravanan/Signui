import { cn } from '../utils/cn';

/** The "infinity hands" brand mark — two intersecting rings with a center dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-8 h-8 flex items-center justify-center select-none scale-105', className)}>
      <div className="absolute top-0 left-0 w-5 h-5 border-[3.5px] border-primary rounded-full rounded-tl-none -rotate-45 group-hover:scale-105 transition-transform duration-300" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-[3.5px] border-primary rounded-full rounded-br-none -rotate-45 group-hover:scale-105 transition-transform duration-300" />
      <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-80 absolute top-[13px] left-[13px]" />
    </div>
  );
}
