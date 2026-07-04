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
    label: 'Camera',
    sub: 'Required to detect and translate hand gestures.',
    required: true,
  },
  {
    key: 'mic' as const,
    icon: Mic,
    label: 'Microphone',
    sub: 'Optional — used for speech-to-sign input.',
    required: false,
  },
];

export function Permissions() {
  const [granted, setGranted] = useState<Record<string, boolean>>({ camera: false, mic: false });
  const navigate = useNavigate();

  const allRequired = PERMS.filter(p => p.required).every(p => granted[p.key]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>
            Permissions
          </h1>
          <p className="text-sm text-text-secondary">
            SignBridge runs on-device. Your camera and mic are never uploaded.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {PERMS.map(({ key, icon: Icon, label, sub, required }) => (
            <Card
              key={key}
              padding="md"
              className={cn(
                'transition-colors',
                granted[key] ? 'border-success/40 bg-success/5' : ''
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  granted[key] ? 'bg-success/15 text-success' : 'bg-surface-alt text-text-secondary'
                )}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {!required && (
                      <span className="text-[10px] font-mono-sb text-text-secondary">optional</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{sub}</p>
                </div>
                {granted[key] ? (
                  <CheckCircle2 size={20} className="text-success shrink-0" />
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setGranted(g => ({ ...g, [key]: true }))}
                    className="shrink-0"
                  >
                    Allow
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button fullWidth disabled={!allRequired} onClick={() => navigate('/preferences')}>
          Continue
        </Button>
        {!allRequired && (
          <p className="text-center text-xs font-mono-sb text-text-secondary mt-3">
            Camera access is required to continue.
          </p>
        )}
      </div>
    </div>
  );
}