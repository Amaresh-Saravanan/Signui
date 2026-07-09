import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SignStroke } from '../components/SignStroke';
import { Button } from '../components/Button';
import { Check } from 'lucide-react';

const SLIDES = [
  {
    title: 'Welcome to SignBridge',
    body: 'Real-time sign language translation powered by secure, on-device AI models custom engineered for everyone.',
    strokeVariant: 'empty-state' as const,
    hasDialectPicker: false,
  },
  {
    title: 'Select your preferred system',
    body: 'Choose a primary sign language system to optimize tracking and gesture recognition parameters.',
    strokeVariant: 'silhouette' as const,
    hasDialectPicker: true, // 👈 Triggers our new glassmorphic dialect card selector
  },
  {
    title: 'Position yourself clearly',
    body: 'For optimal performance, keep your upper torso and hands completely within the active camera view frame.',
    strokeVariant: 'loader' as const,
    hasDialectPicker: false,
  },
  {
    title: "You're ready to deploy",
    body: "Next, we will initialize camera routing. Absolutely no frames leave your system—all processing remains completely private.",
    strokeVariant: 'divider' as const,
    hasDialectPicker: false,
  },
];

const DIALECTS = [
  { id: 'isl', name: 'ISL', full: 'Indian Sign Language' },
  { id: 'asl', name: 'ASL', full: 'American Sign Language' },
  { id: 'bsl', name: 'BSL', full: 'British Sign Language' },
];

export function Onboarding() {
  const [slide, setSlide] = useState(0);
  const [selectedDialect, setSelectedDialect] = useState('isl');
  const navigate = useNavigate();

  const isLast = slide === SLIDES.length - 1;
  const currentSlideData = SLIDES[slide];
  const { title, body, strokeVariant, hasDialectPicker } = currentSlideData;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-gradient-to-b from-transparent via-transparent to-black/[0.02] dark:to-white/[0.01]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl shadow-xl transition-all duration-300">

        {/* Progress Pips */}
        <div className="flex gap-2 mb-10 justify-center">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-[#00bfa5]' : 'w-2 bg-border/60'
                }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col items-center text-center mb-8"
          >
            {/* Visual Icon Box Container */}
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
              <SignStroke
                variant={strokeVariant}
                color="#00bfa5"
                loop={strokeVariant === 'loader'}
                width={strokeVariant === 'divider' ? 160 : 90}
                height={strokeVariant === 'divider' ? 24 : 70}
              />
            </div>

            <h2
              className="text-2xl font-general font-bold mb-3 tracking-tight text-text-primary"
              style={{ fontFamily: 'var(--font-general)' }}
            >
              {title}
            </h2>

            <p className="text-sm text-text-secondary leading-relaxed mb-6 px-2">{body}</p>

            {/* ── INTERACTIVE MODERN DIALECT SELECTOR ────────────────── */}
            {hasDialectPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col gap-2.5 mt-2"
              >
                {DIALECTS.map((dialect) => {
                  const isSelected = selectedDialect === dialect.id;
                  return (
                    <button
                      key={dialect.id}
                      type="button"
                      onClick={() => setSelectedDialect(dialect.id)}
                      className={`group w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200 select-none cursor-pointer backdrop-blur-md ${isSelected
                          ? 'bg-[#00bfa5]/[0.08] border-[#00bfa5] shadow-[0_0_15px_rgba(0,191,165,0.1)]'
                          : 'bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.08] dark:border-white/[0.06] hover:border-[#00bfa5]/40 hover:bg-white/[0.05] dark:hover:bg-white/[0.03]'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-sm font-bold transition-colors ${isSelected ? 'text-[#00bfa5]' : 'text-text-primary'}`}>
                          {dialect.name}
                        </span>
                        <span className="text-xs text-text-secondary font-medium">
                          {dialect.full}
                        </span>
                      </div>

                      {/* Check Indicator */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border ${isSelected
                          ? 'bg-[#00bfa5] border-[#00bfa5] text-white scale-110'
                          : 'border-border group-hover:border-[#00bfa5]/40'
                        }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action Controls */}
        <div className="flex gap-3">
          {slide > 0 && (
            <Button
              variant="secondary"
              onClick={() => setSlide(s => s - 1)}
              className="flex-1 h-11 border border-border bg-transparent hover:bg-white/[0.04] rounded-xl text-sm font-semibold transition-all"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => isLast ? navigate('/permissions') : setSlide(s => s + 1)}
            className={`h-11 rounded-xl text-sm font-bold bg-[#00bfa5] hover:bg-[#00a892] text-white transition-all shadow-md active:scale-[0.98] ${slide === 0 ? 'w-full' : 'flex-1'
              }`}
          >
            {isLast ? 'Set up permissions' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}