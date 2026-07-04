import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ArrowLeft } from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { SignStroke } from '../components/SignStroke';
import { useAppData } from '../context/AppDataContext';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuthUser } = useAppData();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const nameInput = (form.elements.namedItem('name') as HTMLInputElement | null)?.value?.trim();
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
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
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors mb-8">
          <ArrowLeft size={15} /> Back to home
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {mode === 'login' ? 'Welcome back.' : 'Start translating for free.'}
            </p>
          </div>
          <SignStroke variant="loader" loop duration={2.5} color="var(--color-primary)" />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0 mb-6 border-b border-border">
          {(['login', 'signup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setMode(tab); setError(''); }}
              className={`flex-1 pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                mode === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {mode === 'signup' && (
              <Input label="Full name" name="name" placeholder="Alex Doe" required />
            )}
            <Input label="Email" name="email" type="email" placeholder="you@example.com" error={error} required />
            <Input label="Password" name="password" type="password" placeholder="••••••••" required />

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
            )}

            <Button type="submit" fullWidth size="md">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-text-secondary">or</span>
              </div>
            </div>

            <Button type="button" variant="secondary" fullWidth className="gap-2">
              <Globe size={15} /> Continue with Google
            </Button>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}