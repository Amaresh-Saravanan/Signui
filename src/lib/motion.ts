/**
 * Single source of truth for Framer Motion variants.
 * Rules:
 *  - Every variant animates ONLY transform + opacity. MotionConfig
 *    (AccessibilityEffects) strips transforms under reduce-motion, so each
 *    variant automatically degrades to a clean crossfade — never write a
 *    second "reduced" variant.
 *  - Durations 150–250ms. Users are mid-task; motion conveys state, not decoration.
 */
import type { Variants, Transition } from 'framer-motion';

/** ease-out-expo family — fast start, gentle settle. */
export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1];

/** Shared tactile spring — matches Button/Card hover physics. */
export const spring = { type: 'spring', stiffness: 400, damping: 24 } as const;

/** Route transitions (MainLayout wraps Outlet). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

/** Stagger container for ONE list on mount (History entries, Dashboard cards). */
export const listVariants: Variants = {
  enter: { transition: { staggerChildren: 0.04 } },
};
export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } },
};

/** Live transcript word arriving. Degrades to pure fade under reduce-motion. */
export const wordVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 4 },
  enter: { opacity: 1, scale: 1, y: 0, transition: spring },
};

/** Floating overlay panels (workspace control bar, modals). */
export const overlayVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};
