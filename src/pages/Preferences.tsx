import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { cn } from '../utils/cn';
import { useAppData } from '../context/AppDataContext';

const ROLES = [
  { id: 'deaf', label: 'Deaf / HoH', sub: 'I primarily communicate using sign gesture models.' },
  { id: 'hearing', label: 'Hearing Individual', sub: 'I am here to parse and transcribe incoming sign language.' },
  { id: 'interpreter', label: 'Professional Interpreter', sub: 'I assist bridging conversations cross-platform.' },
] as const;

export function Preferences() {
  const { state, updateUserProfile } = useAppData();
  const [role, setRole] = useState(state.user.role);
  const navigate = useNavigate();

  const handleComplete = () => {
    updateUserProfile({ role: role as 'deaf' | 'hearing' | 'interpreter' });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-gradient-to-b from-transparent to-black/[0.01] dark:to-white/[0.01]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl shadow-xl">

        <div className="mb-8">
          <h1 className="text-2xl font-general font-bold tracking-tight text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
            App Personalization
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Tailor the default communication environment to best fit your immediate workflow needs.
          </p>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          {/* Identity/Role Selector */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-secondary mb-3 font-semibold">
              Primary Use Case
            </p>
            <div className="flex flex-col gap-2.5">
              {ROLES.map(r => {
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 backdrop-blur-md cursor-pointer select-none',
                      isSelected
                        ? 'bg-[#00bfa5]/[0.08] border-[#00bfa5] shadow-[0_0_15px_rgba(0,191,165,0.05)]'
                        : 'bg-white/[0.01] border-black/[0.08] dark:border-white/[0.06] hover:border-[#00bfa5]/40 hover:bg-white/[0.04]'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-all',
                      isSelected ? 'border-[#00bfa5]' : 'border-border'
                    )}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-[#00bfa5]" />
                      )}
                    </div>

                    <div>
                      <p className={cn('text-sm font-bold transition-colors', isSelected ? 'text-[#00bfa5]' : 'text-text-primary')}>
                        {r.label}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-normal">{r.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Operations */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/permissions')}
            className="flex-1 h-11 border border-border bg-transparent hover:bg-white/[0.04] rounded-xl text-sm font-semibold transition-all"
          >
            Back
          </Button>
          <Button
            onClick={handleComplete}
            className="flex-2 h-11 rounded-xl text-sm font-bold bg-[#00bfa5] hover:bg-[#00a892] text-white transition-all shadow-md active:scale-[0.98]"
          >
            Complete Setup
          </Button>
        </div>

      </div>
    </div>
  );
}