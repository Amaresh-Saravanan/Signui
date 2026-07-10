import { ShieldCheck } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Button } from './Button';

/**
 * First-run privacy consent notice (SEC-3). Persists acknowledgement so it
 * shows once. States the local-first / no-frame-egress guarantee up front.
 */
export function ConsentBanner() {
  const { state, acknowledgeConsent } = useAppData();
  if (state.consentAcknowledged) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy notice"
      className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-md z-[60] rounded-2xl border border-border bg-surface/95 backdrop-blur-md shadow-2xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-bold text-text-primary mb-1">Your camera stays on your device</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            SignBridge processes the camera entirely in your browser — video frames never leave your device.
            Your profile, history, and phrases are stored locally. You can export or delete everything in Settings.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={acknowledgeConsent} className="rounded-full font-bold px-5 text-xs">
          Got it
        </Button>
      </div>
    </div>
  );
}
