import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Toggle } from '../components/Toggle';
import { cn } from '../utils/cn';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';

const LANGUAGES = SUPPORTED_SIGN_LANGUAGES.map((language) => language.label);

const ROLES = [
  { id: 'deaf', label: 'Deaf / HoH', sub: 'I primarily use sign language.' },
  { id: 'hearing', label: 'Hearing', sub: 'I communicate with signers.' },
  { id: 'interpreter', label: 'Interpreter', sub: 'I work across both.' },
] as const;

export function Preferences() {
  const { state, updateUserProfile, updatePreferences, setPrimaryLanguage } = useAppData();
  const [role, setRole] = useState(state.user.role);
  const [lang, setLang] = useState(
    SUPPORTED_SIGN_LANGUAGES.find((language) => language.code === state.user.primaryLanguage)?.label ?? LANGUAGES[0]
  );
  const [highContrast, setHighContrast] = useState(state.preferences.highContrast);
  const navigate = useNavigate();

  const handleComplete = () => {
    updateUserProfile({ role: role as 'deaf' | 'hearing' | 'interpreter' });
    updatePreferences({ highContrast });
    const selected = SUPPORTED_SIGN_LANGUAGES.find((language) => language.label === lang);
    if (selected) {
      setPrimaryLanguage(selected.code);
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>
            Your preferences
          </h1>
          <p className="text-sm text-text-secondary">These help us tailor the experience. Editable anytime in Settings.</p>
        </div>

        <div className="flex flex-col gap-6 mb-8">
          <div>
            <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">I am a</p>
            <div className="flex flex-col gap-2">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150',
                    role === r.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-border hover:border-primary/40 hover:bg-surface-alt'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors',
                    role === r.id ? 'border-primary bg-primary' : 'border-border'
                  )} />
                  <div>
                    <p className={cn('text-sm font-semibold', role === r.id ? 'text-primary' : 'text-text-primary')}>{r.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{r.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">Primary sign language</p>
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-surface-alt text-sm px-4 text-text-primary outline-none focus:border-primary"
              aria-label="Primary sign language"
            >
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <p className="text-xs font-mono-sb uppercase tracking-widest text-text-secondary mb-3">Accessibility</p>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border">
              <div>
                <p className="text-sm font-medium">High contrast mode</p>
                <p className="text-xs text-text-secondary mt-0.5">Increases text/border contrast.</p>
              </div>
              <Toggle checked={highContrast} onChange={setHighContrast} label="" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/permissions')} className="flex-1">Back</Button>
          <Button onClick={handleComplete} className="flex-2">Complete setup</Button>
        </div>
      </div>
    </div>
  );
}