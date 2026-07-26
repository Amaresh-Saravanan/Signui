import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ArrowLeft, KeyRound, LogIn, UserPlus, CheckCircle2, MailCheck } from 'lucide-react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { LogoMark } from '../components/LogoMark';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAppData } from '../context/AppDataContext';
import { hasClerk } from '../lib/clerk';

type Mode = 'login' | 'signup' | 'forgot';
type AuthResult = { status: 'complete' } | { status: 'needs_verification' };

/**
 * Auth behavior seam. Two implementations (local fallback + real Clerk) both
 * feed the same presentational form. `authenticate` performs the credential
 * step; when it returns 'needs_verification' the form shows an email-code step
 * and later calls `verifyCode`. Both mirror the local AppData session on
 * success so RequireAuth's guard (which reads the local session) keeps working.
 */
interface AuthActions {
  authenticate: (mode: Mode, name: string, email: string, password: string) => Promise<AuthResult>;
  verifyCode: (code: string, name: string, email: string) => Promise<void>;
  googleSignIn?: () => Promise<void>;
  /** Sends a password-reset email code. Absent → local fallback (no backend). */
  requestPasswordReset?: (email: string) => Promise<void>;
  /** Completes reset with the emailed code + new password, then signs in. */
  resetPassword?: (code: string, newPassword: string, name: string, email: string) => Promise<void>;
  ready: boolean;
}

function nameFromEmail(email: string): string {
  const prefix = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return prefix ? prefix.replace(/\b\w/g, (c) => c.toUpperCase()) : 'New User';
}

function errorMessage(err: unknown): string {
  // Clerk throws { errors: [{ message, longMessage }] }; fall back to generic.
  const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
  return (
    clerkErr?.errors?.[0]?.longMessage ||
    clerkErr?.errors?.[0]?.message ||
    (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  );
}

// --- Local (no-key) fallback: establishes the local session only -----------
function useLocalAuthActions(): AuthActions {
  const { signIn } = useAppData();
  return {
    ready: true,
    authenticate: async (_mode, name, email) => {
      signIn(name, email);
      return { status: 'complete' };
    },
    verifyCode: async () => {},
  };
}

// --- Real Clerk auth (only mounted when hasClerk) --------------------------
function useClerkAuthActions(): AuthActions {
  // Keep the hook results whole (don't destructure) so `isLoaded` narrows the
  // discriminated union — after `if (!si.isLoaded)` TS knows si.signIn exists.
  const si = useSignIn();
  const su = useSignUp();
  const { signIn: mirrorSession } = useAppData();

  return {
    ready: si.isLoaded && su.isLoaded,
    authenticate: async (mode, name, email, password) => {
      if (mode === 'login') {
        if (!si.isLoaded) throw new Error('Auth is still loading — try again.');
        const res = await si.signIn.create({ identifier: email, password });
        if (res.status === 'complete') {
          await si.setActive({ session: res.createdSessionId });
          mirrorSession(name, email);
          return { status: 'complete' };
        }
        throw new Error('Additional verification is required to sign in.');
      }
      // signup
      if (!su.isLoaded) throw new Error('Auth is still loading — try again.');
      const res = await su.signUp.create({ emailAddress: email, password });
      if (res.status === 'complete') {
        await su.setActive({ session: res.createdSessionId });
        mirrorSession(name, email);
        return { status: 'complete' };
      }
      // Clerk requires email verification by default → show the code step.
      await su.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      return { status: 'needs_verification' };
    },
    verifyCode: async (code, name, email) => {
      if (!su.isLoaded) throw new Error('Auth is still loading — try again.');
      const res = await su.signUp.attemptEmailAddressVerification({ code });
      if (res.status !== 'complete') throw new Error('That code was not accepted.');
      await su.setActive({ session: res.createdSessionId });
      mirrorSession(name, email);
    },
    googleSignIn: async () => {
      if (!si.isLoaded) return;
      // Redirects out to Google; returns to /sso-callback (see App.tsx).
      await si.signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    },
    requestPasswordReset: async (email) => {
      if (!si.isLoaded) throw new Error('Auth is still loading — try again.');
      await si.signIn.create({ strategy: 'reset_password_email_code', identifier: email });
    },
    resetPassword: async (code, newPassword, name, email) => {
      if (!si.isLoaded) throw new Error('Auth is still loading — try again.');
      const res = await si.signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });
      if (res.status !== 'complete') throw new Error('That code was not accepted.');
      await si.setActive({ session: res.createdSessionId });
      mirrorSession(name, email);
    },
  };
}

export function Auth() {
  // hasClerk is a build-time constant, so this branch never changes at runtime
  // — each controller calls its hooks unconditionally (rules of hooks satisfied).
  return hasClerk ? <ClerkAuth /> : <LocalAuth />;
}

function LocalAuth() {
  return <AuthForm actions={useLocalAuthActions()} />;
}

function ClerkAuth() {
  return <AuthForm actions={useClerkAuthActions()} />;
}

function AuthForm({ actions }: { actions: AuthActions }) {
  const [mode, setMode] = useState<Mode>('login');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Email-code verification step (Clerk sign-up).
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pending, setPending] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [code, setCode] = useState('');
  // Password-reset step (Clerk forgot-password: email code + new password).
  const [resetStage, setResetStage] = useState<'idle' | 'code'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useAppData();

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

  const goAfterAuth = () => {
    // New users go through onboarding; returning (onboarded) users go to their
    // intended destination (?redirect=) or the dashboard.
    if (!state.onboardingComplete) {
      navigate('/onboarding');
    } else {
      const redirect = searchParams.get('redirect');
      navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (form.elements.namedItem('password') as HTMLInputElement | null)?.value ?? '';
    const nameInput = (form.elements.namedItem('name') as HTMLInputElement | null)?.value?.trim();

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      if (actions.requestPasswordReset) {
        setError('');
        setBusy(true);
        try {
          await actions.requestPasswordReset(email);
          setPending({ name: nameFromEmail(email), email });
          setResetStage('code');
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      } else {
        // Local fallback (no backend): keep the "email sent" confirmation UX.
        setIsSubmitted(true);
      }
      return;
    }

    const name = mode === 'signup' && nameInput ? nameInput : nameFromEmail(email);
    setError('');
    setBusy(true);
    try {
      const result = await actions.authenticate(mode, name, email, password);
      if (result.status === 'needs_verification') {
        setPending({ name, email });
        setPendingVerification(true);
        setBusy(false);
        return;
      }
      goAfterAuth();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await actions.verifyCode(code.trim(), pending.name, pending.email);
      goAfterAuth();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!actions.resetPassword) return;
    const form = e.currentTarget;
    const resetCode = (form.elements.namedItem('code') as HTMLInputElement)?.value?.trim();
    const newPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value ?? '';
    setError('');
    setBusy(true);
    try {
      await actions.resetPassword(resetCode, newPassword, pending.name, pending.email);
      goAfterAuth();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (!actions.googleSignIn) return;
    setError('');
    try {
      await actions.googleSignIn();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full relative flex flex-col justify-between items-center px-6 py-6 bg-background selection:bg-primary/20 overflow-hidden antialiased font-sans text-text-primary">

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
        <div className="absolute top-[-20%] left-[-10%] w-[45%] h-[45%] rounded-full bg-primary/5 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-ember/10 blur-[140px]" />
      </div>

      {/* ── TIDY MINIMAL SIDE GEOMETRIC ACCENTS ────────────────── */}
      <div className="fixed top-1/2 left-8 -translate-y-1/2 hidden xl:block opacity-10 pointer-events-none z-10 space-y-3">
        <div className="h-[1px] w-16 bg-gradient-to-r from-primary to-transparent" />
        <div className="h-[1px] w-32 bg-gradient-to-r from-primary to-transparent" />
      </div>

      {/* ── HEADER ────────────────── */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 relative px-2 py-2">
        <Link to="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight text-text-primary hover:opacity-80 transition-opacity">
          <LogoMark className="w-6 h-6" />
          SignBridge
        </Link>
        <a href="#" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
          Support
        </a>
      </header>

      {/* ── COMPACT AUTH STAGE CARD ────────────────── */}
      <main className="w-full max-w-[380px] my-auto z-10 relative flex flex-col items-center">

        {/* Subtle, Un-blurred Minimal Circle Framework */}
        <div className="mb-4 w-12 h-12 rounded-full bg-surface-alt border border-border flex items-center justify-center text-primary relative shadow-inner">
          {resetStage === 'code' ? (
            <KeyRound size={18} className="animate-in zoom-in-50 duration-300" />
          ) : isSubmitted || pendingVerification ? (
            pendingVerification ? (
              <MailCheck size={20} className="animate-in zoom-in-50 duration-300" />
            ) : (
              <CheckCircle2 size={20} className="animate-in zoom-in-50 duration-300" />
            )
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
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {resetStage === 'code' ? 'Reset password' : pendingVerification ? 'Verify your email' : isSubmitted ? 'Email Sent' : (
              <>
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create account'}
                {mode === 'forgot' && 'Forgot Password?'}
              </>
            )}
          </h1>
          <p className="text-xs text-text-secondary max-w-xs mx-auto">
            {resetStage === 'code' ? (
              `Enter the code sent to ${pending.email} and a new password.`
            ) : pendingVerification ? (
              `Enter the code we sent to ${pending.email}.`
            ) : isSubmitted ? (
              'Check your email for a link to reset your password.'
            ) : (
              <>
                {mode === 'login' && 'Sign in to continue to SignBridge.'}
                {mode === 'signup' && 'Create an account to get started.'}
                {mode === 'forgot' && "Enter your email and we'll send you a reset code."}
              </>
            )}
          </p>
        </div>

        {/* High-Fidelity Refined Modular Card wrapper */}
        <div className="glass w-full rounded-xl p-5 sm:p-6 shadow-2xl relative">
          <AnimatePresence mode="wait">
            {resetStage === 'code' ? (
              <motion.form
                key="reset"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={handleReset}
                className="flex flex-col gap-3.5"
              >
                <Input
                  label="Reset Code"
                  name="code"
                  placeholder="123456"
                  error={error}
                  required
                  className="bg-transparent h-10 text-xs tracking-[0.3em]"
                />
                <Input
                  label="New Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-transparent h-10 text-xs"
                />
                <Button
                  type="submit"
                  fullWidth
                  disabled={busy}
                  className="font-bold rounded-lg h-10 text-xs active:scale-[0.99] transition-all duration-200 mt-1 shadow-none disabled:opacity-60"
                >
                  {busy ? 'Resetting…' : 'Reset Password & Sign In'}
                </Button>
              </motion.form>
            ) : pendingVerification ? (
              <motion.form
                key="verify"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onSubmit={handleVerify}
                className="flex flex-col gap-3.5"
              >
                <Input
                  label="Verification Code"
                  name="code"
                  placeholder="123456"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value)}
                  error={error}
                  required
                  className="bg-transparent h-10 text-xs tracking-[0.3em]"
                />
                <Button
                  type="submit"
                  fullWidth
                  disabled={busy}
                  className="font-bold rounded-lg h-10 text-xs active:scale-[0.99] transition-all duration-200 mt-1 shadow-none disabled:opacity-60"
                >
                  {busy ? 'Verifying…' : 'Verify & Continue'}
                </Button>
              </motion.form>
            ) : !isSubmitted ? (
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
                  <Input label="Full Name" name="name" placeholder="Akshaya B" required className="bg-transparent h-10 text-xs" />
                )}

                <Input label="Email Address" name="email" type="email" placeholder="name@company.com" error={error} required className="bg-transparent h-10 text-xs" />

                {mode !== 'forgot' && (
                  <Input label="Password" name="password" type="password" placeholder="••••••••" required className="bg-transparent h-10 text-xs" />
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-primary/80 hover:text-primary font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  disabled={busy}
                  className="font-bold rounded-lg h-10 text-xs active:scale-[0.99] transition-all duration-200 mt-1 shadow-none disabled:opacity-60"
                >
                  {busy ? 'Please wait…' : (
                    <>
                      {mode === 'login' && 'Sign In'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot' && 'Send Reset Link'}
                    </>
                  )}
                </Button>

                {mode !== 'forgot' && (
                  <>
                    <div className="flex items-center my-0.5 text-[9px] font-bold text-text-secondary tracking-widest uppercase before:content-[''] before:flex-1 before:border-b before:border-border/40 before:mr-2.5 after:content-[''] after:flex-1 after:border-b after:border-border/40 after:ml-2.5">
                      or
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={handleGoogle}
                      className="gap-2 h-10 rounded-lg text-xs transition-all shadow-none"
                    >
                      <Globe size={13} className="text-text-secondary" />
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
                <p className="text-xs text-text-secondary leading-relaxed">
                  We sent a confirmation link to your email address.
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  variant="secondary"
                  className="text-xs font-semibold px-4 h-9 rounded-lg"
                >
                  Resend Email
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lower Navigation Linkages */}
        <div className="mt-5">
          {resetStage === 'code' ? (
            <button
              onClick={() => { setResetStage('idle'); setMode('login'); setError(''); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary transition-all duration-150 group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Sign In
            </button>
          ) : pendingVerification ? (
            <button
              onClick={() => { setPendingVerification(false); setError(''); setCode(''); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary transition-all duration-150 group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
          ) : mode === 'forgot' || isSubmitted ? (
            <button
              onClick={() => { setMode('login'); setIsSubmitted(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary transition-all duration-150 group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to Sign In
            </button>
          ) : (
            <p className="text-xs text-text-secondary font-medium">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                className="text-primary hover:underline font-bold ml-0.5"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </main>

      {/* ── FOOTER REMARKS ────────────────── */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-medium text-text-secondary/70 z-10 relative border-t border-border/40 pt-4 mt-6">
        <div>© 2026 SignBridge AI. Precision in every gesture.</div>
        <div className="flex items-center gap-4">
          <span className="hover:text-text-primary cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-text-primary cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-text-primary cursor-pointer transition-colors">Security</span>
        </div>
      </footer>

    </div>
  );
}
