import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Mic, Camera, Zap, Shield, Globe, WifiOff, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { StrokeDivider } from '../components/SignStroke';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';

/* ── Typewriter hook ──────────────────────────────────── */
function useTypewriter(words: string[], speed = 60, pause = 2000) {
  const [display, setDisplay] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIndex + 1));
        if (charIndex + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIndex((c) => c + 1);
        }
      } else {
        setDisplay(current.slice(0, charIndex - 1));
        if (charIndex - 1 === 0) {
          setDeleting(false);
          setWordIndex((w) => (w + 1) % words.length);
          setCharIndex(0);
        } else {
          setCharIndex((c) => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex, words, speed, pause]);

  return display;
}

/* ── Live Demo visual inside hero ─────────────────────── */
const DEMO_SEQUENCE = {
  ISL: [
    { text: 'Namaste, can you help me?' },
    { text: 'Please wait one minute.' },
    { text: 'Thank you for your support.' },
  ],
  ASL: [
    { text: 'Hello, how are you?' },
    { text: 'Where is the station?' },
    { text: 'I need assistance.' },
  ],
  BSL: [
    { text: 'Good afternoon, nice to meet you.' },
    { text: 'Could you repeat that slowly?' },
    { text: 'Thank you for helping today.' },
  ],
} as const;

const PROCESS_STEPS = [
  {
    key: 'camera-on',
    title: 'Camera wakes up',
    sentence: 'The feed starts locally with no upload and hand landmarks are initialized on your device.',
  },
  {
    key: 'sign-detected',
    title: 'Signing is detected',
    sentence: 'Hand motion is tracked frame-by-frame to identify gestures in ISL, ASL, or BSL contexts.',
  },
  {
    key: 'translated',
    title: 'Meaning is translated',
    sentence: 'Detected signs are mapped into readable text in under 150ms for live conversation flow.',
  },
  {
    key: 'delivered',
    title: 'Message is delivered',
    sentence: 'The result is shown and can be spoken instantly for hearing partners nearby.',
  },
] as const;

const FAQS = [
  {
    q: 'Which sign languages are supported right now?',
    a: 'SignBridge currently supports exactly three sign languages: ISL (India), ASL (US), and BSL (UK).',
  },
  {
    q: 'Is my camera feed uploaded anywhere?',
    a: 'No. Translation runs on-device. Camera frames stay local and are not sent to cloud servers.',
  },
  {
    q: 'Can I use SignBridge offline?',
    a: 'Yes for core translation after the app is loaded. Offline mode supports local inference for ISL/ASL/BSL.',
  },
  {
    q: 'How accurate is translation?',
    a: 'Word-level confidence is typically around 98% in supported environments, with quality improving in clear lighting and framing.',
  },
];

function StepVisual({ step }: { step: (typeof PROCESS_STEPS)[number]['key'] }) {
  if (step === 'camera-on') {
    return (
      <div className="relative h-24 rounded-xl border border-border bg-surface-alt overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-16 h-12 rounded-lg border-2 border-primary/70"
            animate={{ scale: [0.96, 1.02, 0.96] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ember ember-pulse" />
          <span className="text-[10px] font-mono-sb text-white/80">Cam On</span>
        </div>
      </div>
    );
  }

  if (step === 'sign-detected') {
    return (
      <div className="relative h-24 rounded-xl border border-border bg-surface-alt overflow-hidden">
        <svg viewBox="0 0 120 48" className="w-full h-full opacity-75">
          {Array.from({ length: 10 }, (_, i) => (
            <motion.circle
              key={i}
              cx={16 + (i % 5) * 18}
              cy={14 + Math.floor(i / 5) * 16}
              r="2"
              fill="var(--color-primary)"
              animate={{
                cy: [14 + Math.floor(i / 5) * 16, 10 + Math.floor(i / 5) * 16, 14 + Math.floor(i / 5) * 16],
              }}
              transition={{ repeat: Infinity, duration: 1.4 + i * 0.07, ease: 'easeInOut' }}
            />
          ))}
          <motion.path
            d="M 16 14 L 34 14 L 52 18 M 34 14 L 34 30 M 34 30 L 24 38 M 34 30 L 44 38"
            stroke="var(--color-primary)"
            strokeWidth="1"
            fill="none"
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    );
  }

  if (step === 'translated') {
    return (
      <div className="relative h-24 rounded-xl border border-border bg-surface-alt flex items-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key="translated-text"
            className="text-sm text-text-primary"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            "Please wait one minute."
          </motion.p>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative h-24 rounded-xl border border-border bg-surface-alt overflow-hidden">
      <motion.div
        className="absolute left-3 top-5 rounded-lg bg-primary text-white text-xs px-2 py-1"
        animate={{ x: [0, 90, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        Delivered
      </motion.div>
      <div className="absolute right-3 bottom-5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-secondary">
        Voice output
      </div>
    </div>
  );
}

function LiveDemoPanel() {
  const [activeCode, setActiveCode] = useState<'ISL' | 'ASL' | 'BSL'>('ASL');
  const [current, setCurrent] = useState(0);
  const activeLanguage = SUPPORTED_SIGN_LANGUAGES.find((language) => language.code === activeCode) ?? SUPPORTED_SIGN_LANGUAGES[1];
  const activeSequence = DEMO_SEQUENCE[activeCode];

  useEffect(() => {
    setCurrent(0);
    const ticker = setInterval(() => {
      setCurrent((prev) => (prev + 1) % activeSequence.length);
    }, 2800);
    return () => clearInterval(ticker);
  }, [activeCode, activeSequence.length]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Panel */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
        {/* Top chrome bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface-alt">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-error opacity-80" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F2994A] opacity-80" />
            <div className="w-2.5 h-2.5 rounded-full bg-success opacity-80" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            {/* Ember live dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-ember ember-pulse" />
            <span className="text-xs font-mono-sb text-text-secondary">Live · {activeCode} Engine {activeLanguage.engineVersion}</span>
          </div>
        </div>

        <div className="px-5 pt-3 pb-2 border-b border-border bg-surface">
          <p className="text-[10px] font-mono-sb text-text-secondary uppercase tracking-widest mb-2">Mini demo language</p>
          <div className="inline-flex gap-1 rounded-lg border border-border bg-surface-alt p-1">
            {SUPPORTED_SIGN_LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => setActiveCode(language.code)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono-sb transition-colors ${
                  activeCode === language.code
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-label={`Switch demo to ${language.label}`}
              >
                {language.code}
              </button>
            ))}
          </div>
        </div>

        {/* Camera feed mock */}
        <div className="relative bg-[#0D0A14] aspect-video flex items-center justify-center overflow-hidden">
          <div className="w-48 h-32 rounded-xl border border-border bg-surface-alt/70" aria-hidden="true" />

          {/* Accuracy badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur text-[11px] font-mono-sb text-success">
            99.2% conf.
          </div>
        </div>

        {/* Translation output */}
        <div className="px-5 py-4 bg-surface">
          <div className="text-[10px] font-mono-sb text-text-secondary uppercase tracking-widest mb-2">Output</div>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${activeCode}-${current}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="text-xl font-general font-semibold text-text-primary"
              style={{ fontFamily: 'var(--font-general)' }}
            >
              "{activeSequence[current].text}"
            </motion.p>
          </AnimatePresence>
          <div className="mt-3 flex items-center gap-4 text-[11px] font-mono-sb text-text-secondary">
            <span>{activeCode} → EN</span>
            <span>·</span>
            <span>120ms latency</span>
            <span>·</span>
            <span className="text-success">Edge processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Feature list ──────────────────────────────────────── */
const FEATURES = [
  {
    big: true,
    icon: Zap,
    title: 'Edge-first inference that keeps conversations natural',
    body: 'SignBridge runs fully on-device with quantized hand-tracking models tuned for ISL, ASL, and BSL. That means camera frames stay local, latency stays low (typically 120-150ms), and the conversation keeps flowing without waiting on cloud round trips.',
  },
  { icon: Globe,   title: 'Focused language support',  body: 'Purpose-built models for ISL (India), ASL (US), and BSL (UK) only.' },
  { icon: Mic,     title: 'Instant voice handoff',    body: 'Translated text can be spoken aloud for hearing participants in real time.' },
  { icon: Shield,  title: 'Privacy by default', body: 'No camera uploads, no remote storage, and local-first processing throughout.' },
  { icon: WifiOff, title: 'Offline-ready workflow', body: 'Core translation works after initial load, useful in low-connectivity environments.' },
];

/* ── Landing Page ──────────────────────────────────────── */
export function Landing() {
  const rotating = useTypewriter(['ISL in India.', 'ASL in the US.', 'BSL in the UK.'], 55, 1500);

  return (
    <div className="min-h-screen bg-background text-text-primary">

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pt-16 pb-20">
        <div className="max-w-xl mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xs font-mono-sb uppercase tracking-widest text-primary mb-5"
          >
            Motion → Meaning
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="text-5xl md:text-6xl font-general font-semibold leading-[1.08] tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-general)' }}
          >
            Your hands are already speaking.{' '}
            <span className="text-primary">We give them a voice.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="text-lg text-text-secondary mb-8 leading-relaxed"
          >
            Real-time sign language translation for exactly three languages.
            <br />
            <span className="text-text-primary">{rotating}</span>
            <br />
            No cloud upload. Low latency. Clear communication.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex flex-wrap gap-3"
          >
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Try SignBridge free <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/workspace">
              <Button variant="secondary" size="lg">
                <Camera size={16} /> Open workspace
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Live Demo — THE hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <LiveDemoPanel />
        </motion.div>
      </section>

      {/* ── STROKE DIVIDER ──────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <StrokeDivider />
      </div>

      {/* ── LANGUAGE COVERAGE ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-20">
        <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">Language Coverage</p>
        <h2 className="text-3xl font-general font-semibold mb-10" style={{ fontFamily: 'var(--font-general)' }}>
          Supported sign languages, with clear regional scope.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUPPORTED_SIGN_LANGUAGES.map((language, i) => (
            <motion.div
              key={language.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-surface p-6 hover:border-primary/40 transition-colors"
            >
              <p className="text-xs font-mono-sb text-primary uppercase tracking-widest mb-3">{language.code}</p>
              <h3 className="text-xl font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>
                {language.label}
              </h3>
              <p className="text-sm text-text-secondary mb-4">Primary region: {language.region}</p>
              <div className="text-xs font-mono-sb text-text-primary rounded-md bg-surface-alt border border-border px-3 py-2 inline-block">
                Direction: {language.direction}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <StrokeDivider />
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-20">
        <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">How It Works</p>
        <h2 className="text-3xl font-general font-semibold mb-10" style={{ fontFamily: 'var(--font-general)' }}>
          A real-time translation path you can follow at a glance.
        </h2>
        <div className="flex flex-col gap-5">
          {PROCESS_STEPS.map((step, index) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className="grid grid-cols-1 md:grid-cols-[84px,1fr,260px] gap-4 border border-border rounded-2xl bg-surface p-5 md:p-6"
            >
              <div className="text-xs font-mono-sb text-primary">Step {index + 1}</div>
              <div>
                <h3 className="text-lg font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.sentence}</p>
              </div>
              <StepVisual step={step.key} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 py-20">
        <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">Why SignBridge</p>
        <h2
          className="text-3xl font-general font-semibold mb-12 max-w-2xl"
          style={{ fontFamily: 'var(--font-general)' }}
        >
          Built around real signing environments, with one core strength and practical supporting tools.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
          {/* Big feature */}
          {FEATURES.filter((f) => f.big).map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-4 border border-border rounded-2xl p-7 bg-surface hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center text-primary mb-5">
                <f.icon size={20} />
              </div>
              <h3 className="text-xl font-general font-semibold mb-3" style={{ fontFamily: 'var(--font-general)' }}>
                {f.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">{f.body}</p>
            </motion.div>
          ))}

          {/* Small features */}
          <div className="md:col-span-2 grid grid-cols-1 gap-5">
            {FEATURES.filter((f) => !f.big).map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i + 1) * 0.07 }}
              className="border border-border rounded-2xl p-5 bg-surface hover:border-primary/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center text-primary mb-4">
                <f.icon size={18} />
              </div>
              <h3 className="text-base font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>
                {f.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.body}</p>
            </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-2xl border border-border bg-surface p-7">
            <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">Trust</p>
            <h2 className="text-3xl font-general font-semibold mb-4" style={{ fontFamily: 'var(--font-general)' }}>
              Honest performance and privacy claims.
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-6">
              We do not use fabricated social proof. Instead, we publish measurable quality indicators and local-processing guarantees.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg border border-border bg-surface-alt px-4 py-3">
                <p className="text-xs font-mono-sb text-text-secondary mb-1">Average confidence</p>
                <p className="text-xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>98.4%</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-alt px-4 py-3">
                <p className="text-xs font-mono-sb text-text-secondary mb-1">Local processing</p>
                <p className="text-xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>100%</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2 mb-4 text-success">
              <CheckCircle2 size={18} />
              <span className="text-sm font-semibold">Privacy commitment</span>
            </div>
            <ul className="text-sm text-text-secondary leading-relaxed space-y-3">
              <li>Camera frames are processed on-device.</li>
              <li>No background cloud upload for translation.</li>
              <li>Session data stays in local app state unless exported by you.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">FAQ</p>
        <h2 className="text-3xl font-general font-semibold mb-8" style={{ fontFamily: 'var(--font-general)' }}>
          Practical questions before you start.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((item, index) => (
            <motion.div
              key={item.q}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <h3 className="text-base font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>{item.q}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-24">
        <div className="border border-primary/30 rounded-2xl bg-primary-soft p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-general font-semibold mb-1" style={{ fontFamily: 'var(--font-general)' }}>
              Ready to translate?
            </h2>
            <p className="text-text-secondary">Try ISL, ASL, or BSL instantly in the workspace.</p>
          </div>
          <Link to="/workspace">
            <Button size="lg" className="shrink-0">
              Open workspace <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-5 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2 font-general font-semibold text-text-primary" style={{ fontFamily: 'var(--font-general)' }}>
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Camera size={13} className="text-white" />
            </div>
            SignBridge
          </div>
          <p className="font-mono-sb text-xs">© 2026 SignBridge — Motion into meaning.</p>
          <nav className="flex gap-5">
            <Link to="/about" className="hover:text-text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}