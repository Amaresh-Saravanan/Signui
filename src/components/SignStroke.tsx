/**
 * SignStroke — the signature SVG motif for SignBridge.
 * A single continuous hand-drawn line that draws itself via stroke-dasharray animation.
 * Used as: loading indicator, section dividers, empty state illustrations, nav active accent.
 */
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface SignStrokeProps {
  variant?: 'divider' | 'loader' | 'nav-accent' | 'silhouette' | 'empty-state';
  className?: string;
  color?: string;
  width?: number;
  height?: number;
  loop?: boolean;
  duration?: number;
}

/** Thin wave divider — replaces <hr> between sections */
function DividerPath() {
  return (
    <path
      d="M 0 12 C 40 4, 80 20, 120 12 S 200 4, 240 12 S 320 20, 360 12 S 440 4, 480 12"
      fill="none"
    />
  );
}

/** Short underline stroke — used as sidebar active indicator */
function NavAccentPath() {
  return <path d="M 0 4 C 8 0, 20 8, 28 4 S 44 0, 52 4" fill="none" />;
}

/** Processing / loading loop */
function LoaderPath() {
  return (
    <path
      d="M 16 32 C 16 16, 32 8, 48 16 S 64 40, 48 48 S 24 56, 16 48 S 8 32, 16 32"
      fill="none"
    />
  );
}

/** Loose hand-drawn figure silhouette — replaces avatar dashed box */
function SilhouettePath() {
  return (
    <path
      d="M 50 20 C 50 20, 52 8, 60 8 S 70 8, 70 20 C 70 28, 65 32, 60 34
         C 60 34, 42 38, 38 55 S 36 85, 36 85
         M 60 34 C 60 34, 78 38, 82 55 S 84 85, 84 85
         M 44 60 L 36 85 M 76 60 L 84 85
         M 60 34 L 60 55
         M 44 44 L 36 62 M 76 44 L 84 62"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Empty state illustration — a hand beginning to sign */
function EmptyStatePath() {
  return (
    <path
      d="M 30 70 C 30 50, 35 30, 50 25 S 70 30, 70 50
         C 70 50, 68 40, 75 38 S 82 42, 80 52
         C 80 52, 82 44, 88 43 S 94 48, 92 58
         C 92 58, 93 52, 98 52 S 103 57, 100 68
         L 98 78 C 95 88, 85 92, 75 90
         L 60 88"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const pathMap = {
  divider: { Path: DividerPath, vb: '0 0 480 24', defaultW: 480, defaultH: 24 },
  'nav-accent': { Path: NavAccentPath, vb: '0 0 52 8', defaultW: 52, defaultH: 8 },
  loader: { Path: LoaderPath, vb: '0 0 64 64', defaultW: 48, defaultH: 48 },
  silhouette: { Path: SilhouettePath, vb: '0 0 120 100', defaultW: 120, defaultH: 100 },
  'empty-state': { Path: EmptyStatePath, vb: '0 0 130 110', defaultW: 130, defaultH: 110 },
};

export function SignStroke({
  variant = 'divider',
  className,
  color = 'var(--color-primary)',
  width,
  height,
  loop = false,
  duration = 1.4,
}: SignStrokeProps) {
  const { Path, vb, defaultW, defaultH } = pathMap[variant];
  const w = width ?? defaultW;
  const h = height ?? defaultH;

  return (
    <svg
      width={w}
      height={h}
      viewBox={vb}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <motion.g
        stroke={color}
        strokeWidth={variant === 'nav-accent' ? 2.5 : 2}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={
          loop
            ? { pathLength: [0, 1, 0], opacity: [0.4, 1, 0.4] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={
          loop
            ? { duration, repeat: Infinity, ease: 'easeInOut' }
            : { duration, ease: [0.25, 0.1, 0.25, 1] }
        }
      >
        <Path />
      </motion.g>
    </svg>
  );
}

/** Convenience: full-width divider with fade edges */
export function StrokeDivider({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center my-2', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <div className="relative bg-background px-4">
        <SignStroke variant="divider" className="opacity-60" />
      </div>
    </div>
  );
}

/** Spinning / looping SignStroke loader — replaces generic spinners */
export function SignLoader({ size = 48, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <SignStroke variant="loader" width={size} height={size} loop duration={2} />
    </div>
  );
}
