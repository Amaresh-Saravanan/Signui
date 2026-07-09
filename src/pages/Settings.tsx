import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe, Shield, Trash2, AlertTriangle, Download } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Toggle } from '../components/Toggle';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';
import { cn } from '../utils/cn';

export function Settings() {
  const navigate = useNavigate();
  const { state, updateUserProfile, updatePreferences, setPrimaryLanguage, exportData, signOut } = useAppData();
  const [firstName, setFirstName] = useState(state.user.firstName);
  const [lastName, setLastName] = useState(state.user.lastName);
  const [email, setEmail] = useState(state.user.email);
  const [primaryLanguage, setPrimaryLanguageValue] = useState(state.user.primaryLanguage);
  const [notifications, setNotifications] = useState(state.preferences.notifications);
  const [localOnly, setLocalOnly] = useState(state.preferences.localOnly);
  const [reduceMotion, setReduceMotion] = useState(state.preferences.reduceMotion);
  const [highContrast, setHighContrast] = useState(state.preferences.highContrast);
  const [autoExport, setAutoExport] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUserProfile({ firstName, lastName, email });
    setPrimaryLanguage(primaryLanguage);
    updatePreferences({ notifications, localOnly, reduceMotion, highContrast });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    // SEC-3: download all locally-held data as JSON.
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signbridge-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    // SEC-3: irreversible local wipe. Confirm, clear everything, return home.
    const ok = window.confirm(
      'This permanently deletes your profile, history, saved phrases, and preferences from this browser. This cannot be undone. Continue?',
    );
    if (!ok) return;
    signOut();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-16 px-4 md:px-0 page-enter">
      <div>
        <h1 className="text-2xl font-general font-bold tracking-tight text-text-primary mb-1" style={{ fontFamily: 'var(--font-general)' }}>
          Settings
        </h1>
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-secondary font-semibold">Preferences and account management</p>
      </div>

      {/* ── PROFILE SECTION ────────────────────────────────────── */}
      <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
        <h2 className="text-sm font-bold mb-5 flex items-center gap-2.5 text-text-primary">
          <Globe size={16} className="text-[#00bfa5]" /> Account Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:col-span-2" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className={cn(
            "text-xs font-mono font-bold transition-all duration-300",
            saved ? "text-[#00bfa5] opacity-100 translate-x-0" : "text-transparent opacity-0 -translate-x-2"
          )}>
            ✓ Changes updated successfully
          </p>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-9 px-4 text-xs font-bold bg-[#00bfa5]/[0.12] dark:bg-[#00bfa5]/[0.15] border border-[#00bfa5]/20 hover:bg-[#00bfa5]/[0.25] text-[#00bfa5] dark:text-[#3cd0bc] rounded-xl transition-all shadow-sm"
          >
            Save changes
          </Button>
        </div>
      </Card>

      {/* ── SYSTEM PARAMETERS ─────────────────────────────────── */}
      <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2.5 text-text-primary">
          <Shield size={16} className="text-[#00bfa5]" /> System Parameters
        </h2>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary mb-1">Primary Sign Language</p>
          <select
            value={primaryLanguage}
            onChange={(e) => setPrimaryLanguageValue(e.target.value as 'ISL' | 'ASL' | 'BSL')}
            className="w-full h-10 rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.02] text-sm px-4 text-text-primary outline-none focus:border-[#00bfa5]/40 transition-all cursor-pointer"
            aria-label="Primary sign language"
          >
            {SUPPORTED_SIGN_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code} disabled={!language.available}>
                {language.label}{language.available ? '' : ' — coming soon'}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-text-secondary mt-2">Only American Sign Language has a live detection model today. Other languages are in development.</p>
        </div>
      </Card>

      {/* ── APP PREFERENCES & TOGGLES ──────────────────────────── */}
      <Card padding="lg" className="bg-white/[0.02] dark:bg-white/[0.01] border-black/[0.06] dark:border-white/[0.05] backdrop-blur-md rounded-2xl">
        <h2 className="text-sm font-bold mb-5 flex items-center gap-2.5 text-text-primary">
          <Bell size={16} className="text-[#00bfa5]" /> App Preferences
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Push Alerts</p>
              <p className="text-xs text-text-secondary mt-0.5">Translation checkpoint completions and daily history logs updates.</p>
            </div>
            <Toggle checked={notifications} onChange={setNotifications} label="" />
          </div>
          <div className="h-px bg-border/50" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Isolated Sandbox Execution</p>
              <p className="text-xs text-text-secondary mt-0.5">Enforces localized structural mapping. Data stream bypasses external networks entirely.</p>
            </div>
            <Toggle checked={localOnly} onChange={setLocalOnly} label="" />
          </div>
          <div className="h-px bg-border/50" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Reduce Dynamic Motion</p>
              <p className="text-xs text-text-secondary mt-0.5">Disables animations and viewport transitions across the app.</p>
            </div>
            <Toggle checked={reduceMotion} onChange={setReduceMotion} label="" />
          </div>
          <div className="h-px bg-border/50" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">High Contrast</p>
              <p className="text-xs text-text-secondary mt-0.5">Maximizes text and border contrast for improved legibility.</p>
            </div>
            <Toggle checked={highContrast} onChange={setHighContrast} label="" />
          </div>
          <div className="h-px bg-border/50" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-semibold text-text-primary">Automated Phrase Backup</p>
              <p className="text-xs text-text-secondary mt-0.5">Periodically exports your history and local preferences directly to internal cache storage.</p>
            </div>
            <Toggle checked={autoExport} onChange={setAutoExport} label="" />
          </div>
        </div>
      </Card>

      {/* ── DANGER ZONE ────────────────────────────────────────── */}
      <Card padding="lg" className="bg-transparent border-red-500/[0.12] rounded-2xl bg-gradient-to-br from-red-500/[0.01] to-transparent">
        <h2 className="text-sm font-bold mb-1 flex items-center gap-2.5 text-red-500/90">
          <AlertTriangle size={16} /> Danger Boundary
        </h2>
        <p className="text-xs text-text-secondary mb-5 leading-relaxed">
          Purging account data is irreversible. All history profiles, saved vocabulary items, and application preferences will be permanently wiped from your browser memory setup immediately.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="gap-2 h-9 text-xs font-bold rounded-xl transition-all duration-200"
          >
            <Download size={14} /> Export My Data
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAccount}
            className="gap-2 h-9 text-xs font-bold rounded-xl border border-red-500/20 bg-red-500/[0.08] hover:bg-red-500/20 text-red-500 transition-all duration-200 shadow-sm"
          >
            <Trash2 size={14} /> Delete Account & Clear Cache
          </Button>
        </div>
      </Card>
    </div>
  );
}