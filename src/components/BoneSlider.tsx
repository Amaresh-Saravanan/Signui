import { cn } from '../utils/cn';

interface BoneSliderProps {
  label: string;
  value: number; // degrees
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/** A single-axis bone-rotation slider (degrees) for the dev-only Pose Editor. */
export function BoneSlider({ label, value, onChange, min = -180, max = 180, className }: BoneSliderProps) {
  return (
    <label className={cn('flex flex-col gap-1 text-xs', className)}>
      <span className="flex items-center justify-between font-mono text-text-secondary">
        <span>{label}</span>
        <span>{value.toFixed(0)}°</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </label>
  );
}
