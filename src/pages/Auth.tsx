import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ArrowLeft, KeyRound, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();
  const { setAuthUser } = useAppData();

  // Muted Atmosphere Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];
    const particleCount = 25; // Lower count for minimal look

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5, // Tiny subtle specs
          speedX: (Math.random() - 0.5) * 0.15,
          speedY: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.15, // Barely visible whisper
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        ctx.fillStyle = `rgba(68, 226, 205, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => init();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const nameInput = (form.elements.namedItem('name') as HTMLInputElement | null)?.value?.trim();

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsSubmitted(true);
      return;
    }

    const emailPrefix = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    const fallbackName = emailPrefix
      ? emailPrefix.replace(/\b\w/g, (letter) => letter.toUpperCase())
      : 'New User';

    setAuthUser(mode === 'signup' && nameInput ? nameInput : fallbackName, email);
    setError('');
    navigate('/onboarding');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full relative flex flex-col justify-between items-center px-6 py-6 bg-[#101415] selection:bg-[#44e2cd]/20 overflow-hidden antialiased font-sans text-[#e0e3e5]">

      {/* ── CLEAN CRUNCHY NOISE OVERLAY ────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* ── LIVE CANVAS ENGINE ────────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* ── ULTRA-MUTED BACKGROUND GLOWS ────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[45%] h-[45%] rounded-full bg-[#44e2cd]/03 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#1e0052]/20 blur-[140px]" />
      </div>

      {/* ── TIDY MINIMAL SIDE GEOMETRIC ACCENTS ────────────────── */}
      <div className="fixed top-1/2 left-8 -translate-y-1/2 hidden xl:block opacity-10 pointer-events-none z-10 space-y-3">
        <div className="h-[1px] w-16 bg-gradient-to-r from-[#44e2cd] to-transparent" />
        <div className="h-[1px] w-32 bg-gradient-to-r from-[#44e2cd] to-transparent" />
      </div>

      {/* ── HEADER ────────────────── */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 relative px-2 py-2">
        <Link to="/" className="text-lg font-bold tracking-tight text-white/90 hover:opacity-80 transition-opacity">
          SignBridge
        </Link>
        <a href="#" className="text-xs font-medium text-[#c6c6cd]/80 hover:text-white transition-colors">
          Support
        </a>
      </header>

      {/* ── COMPACT AUTH STAGE CARD ────────────────── */}
      <main className="w-full max-w-[380px] my-auto z-10 relative flex flex-col items-center">

        {/* Subtle, Un-blurred Minimal Circle Framework */}
        <div className="mb-4 w-12 h-12 rounded-full bg-[#1d2022]/60 border border-white/[0.06] flex items-center justify-center text-[#44e2cd]/90 relative shadow-inner">
          {isSubmitted ? (
            <CheckCircle2 size={20} className="animate-in zoom-in-50 duration-300" />
          ) : (
            <>
              {mode === 'login' && <LogIn size={18} />}
              {mode === 'signup' && <UserPlus size={18} />}
              {mode === 'forgot' && <KeyRound size={18} />}
            </>
          )}
        </div>

        {/* Text Area */}
        <div className="text-center mb-5 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isSubmitted ? 'Email Sent' : (
              <>
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create account'}
                {mode === 'forgot' && 'Forgot Password?'}
              </>
            )}
          </h1>
          <p className="text-xs text-[#c6c6cd]/80 max-w-xs mx-auto">
            {isSubmitted ? (
              'Check your email coordinates for recovery parameters.'
            ) : (
              <>
                {mode === 'login' && 'Sign in to access your tracking environment.'}
                {mode === 'signup' && 'Register your profile to deploy interactive nodes.'}
                {mode === 'forgot' && 'Enter your email to configure a reset loop.'}
              </>
            )}
          </p>
        </div>

        {/* High-Fidelity Refined Modular Card wrapper */}
        <div className="w-full bg-[#1d2022]/30 border border-white/[0.06] backdrop-blur-md rounded-xl p-5 sm:p-6 shadow-2xl relative">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-3.5"
              >
                {mode === 'signup' && (
                  <Input label="Full Name" name="name" placeholder="Akshaya B" required className="bg-transparent border-white/[0.08] focus:border-[#44e2cd]/60 h-10 text-xs" />
                )}

                <Input label="Email Address" name="email" type="email" placeholder="name@company.com" error={error} required className="bg-transparent border-white/[0.08] focus:border-[#44e2cd]/60 h-10 text-xs" />

                {mode !== 'forgot' && (
                  <Input label="Password" name="password" type="password" placeholder="••••••••" required className="bg-transparent border-white/[0.08] focus:border-[#44e2cd]/60 h-10 text-xs" />
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-[#44e2cd]/80 hover:text-[#44e2cd] font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  className="bg-[#44e2cd] hover:bg-[#3cd3be] text-[#00201c] font-bold rounded-lg h-10 text-xs active:scale-[0.99] transition-all duration-200 mt-1 shadow-none"
                >
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </Button>

                {mode !== 'forgot' && (
                  <>
                    <div className="flex items-center my-0.5 text-[9px] font-bold text-[#c6c6cd]/20 tracking-widest uppercase before:content-[''] before:flex-1 before:border-b before:border-white/[0.04] before:mr-2.5 after:content-[''] after:flex-1 after:border-b after:border-white/[0.04] after:ml-2.5">
                      or
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      className="gap-2 h-10 rounded-lg bg-transparent border-white/[0.08] text-[#e0e3e5] hover:bg-white/[0.03] font-medium text-xs transition-all shadow-none"
                    >
                      <Globe size={13} className="text-[#c6c6cd]" />
                      Continue with Google
                    </Button>
                  </>
                )}
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-2 space-y-4 flex flex-col items-center"
              >
                <p className="text-xs text-[#c6c6cd]/80 leading-relaxed">
                  A verification transmission token link was directed successfully toward your layout address.
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="secondary"
                  className="text-xs font-semibold text-[#44e2cd] border-[#44e2cd]/20 hover:bg-[#44e2cd]/5 bg-transparent transition-all px-4 h-9 rounded-lg"
                >
                  Resend Email Index
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lower Navigation Linkages */}
        <div className="mt-5">
          {mode === 'forgot' || isSubmitted ? (
            <button
              onClick={() => { setMode('login'); setIsSubmitted(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c6c6cd]/80 hover:text-[#44e2cd] transition-all duration-150 group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Sign In
            </button>
          ) : (
            <p className="text-xs text-[#c6c6cd]/70 font-medium">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                className="text-[#44e2cd] hover:underline font-bold ml-0.5"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </main>

      {/* ── FOOTER REMARKS ────────────────── */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-medium text-[#c6c6cd]/30 z-10 relative border-t border-white/[0.04] pt-4 mt-6">
        <div>© 2026 SignBridge AI. Precision in every gesture.</div>
        <div className="flex items-center gap-4">
          <span className="hover:text-white/60 cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Security</span>
        </div>
      </footer>

    </div>
  );
}