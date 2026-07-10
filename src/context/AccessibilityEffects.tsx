import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useAppData } from './AppDataContext';

/**
 * Applies accessibility preferences to the live document:
 *  - `reduce-motion` root class → CSS zeroes out animations/transitions (UX-6)
 *  - `high-contrast` root class → CSS token overrides (UX-2)
 *  - MotionConfig.reducedMotion → makes Framer Motion honor the app toggle
 *    (`always`) or the OS setting (`user`), since Framer animates via JS and
 *    is not affected by the CSS override alone.
 *
 * Rendered inside AppDataProvider so it can read persisted preferences.
 */
export function AccessibilityEffects({ children }: { children: ReactNode }) {
  const { state } = useAppData();
  const { reduceMotion, highContrast } = state.preferences;

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}
