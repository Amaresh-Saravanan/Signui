import { Zap, Globe, Shield } from 'lucide-react';
import { Card } from '../components/Card';
import { StrokeDivider } from '../components/SignStroke';

const VALUES = [
  { icon: Zap,    label: 'Speed',      body: 'Sub-150ms inference on-device. No round-trips.' },
  { icon: Globe,  label: 'Coverage',   body: 'ISL, ASL, and BSL with dedicated regional models for India, US, and UK users.' },
  { icon: Shield, label: 'Privacy',    body: 'Camera frames never leave your machine.' },
];

export function About() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-10 pb-10">
      <div>
        <p className="text-[10px] font-mono-sb uppercase tracking-widest text-primary mb-3">About SignBridge</p>
        <h1 className="text-3xl font-general font-semibold leading-tight mb-4" style={{ fontFamily: 'var(--font-general)' }}>
          Motion into meaning.
        </h1>
        <p className="text-text-secondary leading-relaxed">
          SignBridge was built to close the gap between sign language and spoken language — in real time,
          on your device, without any data leaving the room. Our model runs on MediaPipe with a custom
          ISL/ASL/BSL landmark classifier, achieving {'>'}98% word-level accuracy on a validation corpus of 500+ signs.
        </p>
      </div>

      <StrokeDivider />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {VALUES.map(v => (
          <Card key={v.label} padding="md">
            <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center text-primary mb-4">
              <v.icon size={18} />
            </div>
            <h3 className="text-sm font-general font-semibold mb-2" style={{ fontFamily: 'var(--font-general)' }}>{v.label}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{v.body}</p>
          </Card>
        ))}
      </div>

      <StrokeDivider />

      <div>
        <h2 className="text-lg font-general font-semibold mb-4" style={{ fontFamily: 'var(--font-general)' }}>Stack</h2>
        <div className="flex flex-wrap gap-2">
          {['React 18', 'Vite', 'Tailwind CSS v4', 'Framer Motion', 'MediaPipe', 'TensorFlow.js', 'Web Speech API', 'WebRTC'].map(t => (
            <span key={t} className="text-xs font-mono-sb px-3 py-1.5 rounded-md border border-border bg-surface-alt text-text-secondary">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}