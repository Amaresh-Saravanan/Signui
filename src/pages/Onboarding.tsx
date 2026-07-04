import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SignStroke } from '../components/SignStroke';
import { Button } from '../components/Button';

const SLIDES = [
  {
    title: 'Welcome to SignBridge',
    body: 'Real-time sign language translation for ISL, ASL, and BSL — powered by on-device AI, designed for everyone.',
    strokeVariant: 'empty-state' as const,
  },
  {
    title: 'Position yourself clearly',
    body: 'For best accuracy, keep your upper body and hands visible in the camera frame. Good lighting helps.',
    strokeVariant: 'silhouette' as const,
  },
  {
    title: 'Two-way translation',
    body: 'Sign to get text output. Or type text and the SignBridge avatar will sign it back — useful for hearing partners.',
    strokeVariant: 'loader' as const,
  },
  {
    title: "You're ready",
    body: "Next, we'll ask for camera and microphone access. Nothing is recorded — all processing happens on your device.",
    strokeVariant: 'divider' as const,
  },
];

export function Onboarding() {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();

  const isLast = slide === SLIDES.length - 1;
  const { title, body, strokeVariant } = SLIDES[slide];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Progress pips */}
        <div className="flex gap-1.5 mb-8 justify-center">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === slide ? 'w-6 bg-primary' : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center text-center mb-8"
          >
            <div className="mb-6 p-5 rounded-2xl bg-primary-soft">
              <SignStroke
                variant={strokeVariant}
                color="var(--color-primary)"
                loop={strokeVariant === 'loader'}
                width={strokeVariant === 'divider' ? 160 : 100}
                height={strokeVariant === 'divider' ? 24 : 80}
              />
            </div>
            <h2 className="text-xl font-general font-semibold mb-3" style={{ fontFamily: 'var(--font-general)' }}>
              {title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          {slide > 0 && (
            <Button variant="secondary" onClick={() => setSlide(s => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          <Button
            onClick={() => isLast ? navigate('/permissions') : setSlide(s => s + 1)}
            className={slide === 0 ? 'w-full' : 'flex-1'}
          >
            {isLast ? 'Set up permissions' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}