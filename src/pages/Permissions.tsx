import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../utils/cn';

const PERMS = [
  {
    key: 'camera' as const,
    icon: Camera,
    label: 'Camera Access',
    sub: 'Required to map localized hand landmarks and track gestural sequences.',
    required: true,
  },
  {
    key: 'mic' as const,
    icon: Mic,
    label: 'Microphone Access',
    sub: 'Optional — unlocks immediate localized speech-to-sign tracking utilities.',
    required: false,
  },
];

export function Permissions() {
  const [granted, setGranted] = useState<Record<string, boolean>>({ camera: false, mic: false });
  const navigate = useNavigate();

  const allRequired = PERMS.filter(p => p.required).every(p => granted[p.key]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-gradient-to-b from-transparent to-black/[0.01] dark:to-white/[0.01]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl shadow-xl">

        <div className="mb-8">
          <h1 className="text-2xl font-general font-bold tracking-tight text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
            Device Permissions
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            SignBridge pipelines run securely on-device. Camera frames and audio streams are processed in memory and never leave your hardware boundary.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {PERMS.map(({ key, icon: Icon, label, sub, required }) => {
            const isGranted = granted[key];
            return (
              <Card
                key={key}
                padding="md"
                className={cn(
                  'transition-all duration-200 bg-white/[0.01] dark:bg-white/[0.005] border border-black/[0.06] dark:border-white/[0.05] rounded-xl',
                  isGranted ? 'border-[#00bfa5]/40 bg-[#00bfa5]/[0.03] dark:bg-[#00bfa5]/[0.04]' : ''
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all border',
                    isGranted
                      ? 'bg-[#00bfa5]/[0.1] text-[#00bfa5] border-[#00bfa5]/20'
                      : 'bg-black/[0.02] dark:bg-white/[0.02] text-text-secondary border-transparent'
                  )}>
                    <Icon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary">{label}</p>
                      {!required && (
                        <span className="text-[10px] font-mono-sb text-text-secondary tracking-wide uppercase px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.04]">
                          optional
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 leading-normal">{sub}</p>
                  </div>

                  {isGranted ? (
                    <CheckCircle2 size={20} className="text-[#00bfa5] shrink-0" />
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setGranted(g => ({ ...g, [key]: true }))}
                      className="shrink-0 h-8 text-xs font-bold border border-border bg-transparent hover:bg-white/[0.05] rounded-lg transition-all"
                    >
                      Allow
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          fullWidth
          disabled={!allRequired}
          onClick={() => navigate('/preferences')}
          className={cn(
            "h-11 rounded-xl text-sm font-bold transition-all shadow-md active:scale-[0.98]",
            allRequired ? "bg-[#00bfa5] hover:bg-[#00a892] text-white" : "bg-border text-text-secondary cursor-not-allowed"
          )}
        >
          Continue
        </Button>

        {!allRequired && (
          <p className="text-center text-xs font-mono-sb text-text-secondary/80 mt-3.5 tracking-wide">
            Camera access is required to proceed.
          </p>
        )}
      </div>
    </div>
  );
}