import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Button } from '../components/Button';
import { cameraErrorCopy } from '../lib/cameraErrors';

/**
 * Prime → request → recover. The browser permission prompt is never the first
 * thing the user learns about the camera: explain the why (on-device, no
 * server) first, request only on explicit click, and map failures to
 * recoverable inline copy. "Not now" always exits to the same place success does.
 */
// ponytail: the old fake mic "Allow" toggle was dropped — it never requested
// anything. Add a real mic request here when speech features actually need one.
export function Permissions() {
  const navigate = useNavigate();
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const enableCamera = async () => {
    setRequesting(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      // Only the permission grant matters here — the Workspace opens its own stream.
      s.getTracks().forEach(t => t.stop());
      navigate('/preferences');
    } catch (err) {
      setError(err);
      setRequesting(false);
    }
  };

  const errCopy = error != null ? cameraErrorCopy(error) : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-gradient-to-b from-transparent to-black/[0.01] dark:to-white/[0.01]">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.05] backdrop-blur-xl shadow-xl">

        <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-6">
          <Camera size={22} aria-hidden />
        </div>

        <h1 className="text-2xl font-general font-bold tracking-tight text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
          SignBridge needs your camera to see your hands.
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          Video is processed on this device by a local model. Frames never leave your browser — there's no server that could receive them.
        </p>

        {errCopy && (
          <div role="alert" className="mb-6 p-4 rounded-xl border border-error/20 bg-error/[0.06]">
            <p className="text-sm font-bold text-text-primary">{errCopy.title}</p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{errCopy.body}</p>
          </div>
        )}

        {requesting ? (
          <p aria-live="polite" className="h-11 flex items-center justify-center text-sm font-medium text-text-secondary">
            Waiting for browser permission…
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={enableCamera} className="h-11 rounded-xl text-sm font-bold">
              {errCopy ? 'Try again' : 'Enable camera'}
            </Button>
            <Button fullWidth variant="ghost" onClick={() => navigate('/preferences')} className="h-11 rounded-xl text-sm">
              {errCopy ? 'Continue without camera' : 'Not now — explore first'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
