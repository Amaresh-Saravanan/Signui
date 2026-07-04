import { useState } from 'react';
import { Bell, Globe, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Toggle } from '../components/Toggle';
import { SUPPORTED_SIGN_LANGUAGES } from '../constants/languages';
import { useAppData } from '../context/AppDataContext';

export function Settings() {
  const { state, updateUserProfile, updatePreferences, setPrimaryLanguage } = useAppData();
  const [firstName, setFirstName] = useState(state.user.firstName);
  const [lastName, setLastName] = useState(state.user.lastName);
  const [email, setEmail] = useState(state.user.email);
  const [primaryLanguage, setPrimaryLanguageValue] = useState(state.user.primaryLanguage);
  const [notifications, setNotifications] = useState(state.preferences.notifications);
  const [localOnly, setLocalOnly] = useState(state.preferences.localOnly);
  const [reduceMotion, setReduceMotion] = useState(state.preferences.reduceMotion);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateUserProfile({ firstName, lastName, email });
    setPrimaryLanguage(primaryLanguage);
    updatePreferences({ notifications, localOnly, reduceMotion });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-general font-semibold mb-0.5" style={{ fontFamily: 'var(--font-general)' }}>
          Settings
        </h1>
        <p className="text-[11px] font-mono-sb text-text-secondary">Preferences and account management</p>
      </div>

      {/* Profile section */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Globe size={15} className="text-primary" /> Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sm:col-span-2" />
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs font-mono-sb transition-colors ${saved ? 'text-success' : 'text-transparent'}`}>
            Saved
          </p>
          <Button size="sm" onClick={handleSave}>Save changes</Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Bell size={15} className="text-primary" /> Preferences
        </h2>
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-xs text-text-secondary mt-0.5">Translation completions and daily summaries.</p>
            </div>
            <Toggle checked={notifications} onChange={setNotifications} label="" />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">Local processing only</p>
              <p className="text-xs text-text-secondary mt-0.5">Camera frames never leave your device.</p>
            </div>
            <Toggle checked={localOnly} onChange={setLocalOnly} label="" />
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">Reduce motion</p>
              <p className="text-xs text-text-secondary mt-0.5">Disables non-essential animations app-wide.</p>
            </div>
            <Toggle checked={reduceMotion} onChange={setReduceMotion} label="" />
          </div>
        </div>
      </Card>

      {/* Sign language */}
      <Card padding="lg">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Shield size={15} className="text-primary" /> Sign language
        </h2>
        <select
          value={primaryLanguage}
          onChange={(e) => setPrimaryLanguageValue(e.target.value as 'ISL' | 'ASL' | 'BSL')}
          className="w-full h-10 rounded-lg border border-border bg-surface-alt text-sm px-4 text-text-primary outline-none focus:border-primary"
          aria-label="Primary sign language"
        >
          {SUPPORTED_SIGN_LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>{language.label}</option>
          ))}
        </select>
      </Card>

      {/* Danger zone */}
      <Card padding="lg" className="border-error/25">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2 text-error">
          <AlertTriangle size={15} /> Danger zone
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Deleting your account is permanent. All translation history, saved phrases, and preferences will be erased.
        </p>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 size={14} /> Delete account
        </Button>
      </Card>
    </div>
  );
}