import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { StrokeDivider } from '../components/SignStroke';

// Versions/licenses below are read from each package's own package.json
// (DOC-3 / MIGRATION_TRACKER.md task 3.8). Update when a dependency changes.
const RUNTIME_DEPENDENCIES = [
  { name: '@mediapipe/tasks-vision', version: '0.10.35', license: 'Apache-2.0', url: 'https://github.com/google-ai-edge/mediapipe' },
  { name: 'react', version: '19.2.7', license: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'react-dom', version: '19.2.7', license: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'react-router-dom', version: '7.18.1', license: 'MIT', url: 'https://github.com/remix-run/react-router' },
  { name: 'framer-motion', version: '12.42.2', license: 'MIT', url: 'https://github.com/framer/motion' },
  { name: 'lucide-react', version: '1.23.0', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
  { name: 'clsx', version: '2.1.1', license: 'MIT', url: 'https://github.com/lukeed/clsx' },
  { name: 'tailwind-merge', version: '3.6.0', license: 'MIT', url: 'https://github.com/dcastil/tailwind-merge' },
  { name: '@fontsource/inter', version: '5.2.8', license: 'OFL-1.1', url: 'https://github.com/fontsource/fontsource' },
  { name: '@fontsource/sora', version: '5.2.8', license: 'OFL-1.1', url: 'https://github.com/fontsource/fontsource' },
];

export function Licenses() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-12 pb-16 px-4 md:px-0 page-enter">

      <div className="text-center md:text-left pt-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary mb-4 font-semibold">
          Open Source & Attribution
        </p>
        <h1 className="text-4xl md:text-5xl font-general font-black tracking-tight leading-none mb-6 text-text-primary" style={{ fontFamily: 'var(--font-general)' }}>
          Built on <span className="bg-gradient-to-r from-primary to-[#3cd0bc] bg-clip-text text-transparent">open work.</span>
        </h1>
        <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl font-medium">
          SignBridge's on-device detection and interface are made possible by open-source
          software and a published research reference. This page credits every dependency
          that ships in the production build.
        </p>
      </div>

      <StrokeDivider />

      {/* ── ML PIPELINE ATTRIBUTION ─────────────────────────────── */}
      <div>
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-lg font-general font-bold tracking-tight text-text-primary">Detection Pipeline</h2>
          <p className="text-xs text-text-secondary mt-1">The hand-tracking model and the reference this app adapts from.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card padding="md" className="bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-md rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary mb-5">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-general font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
              MediaPipe (Google)
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              Hand landmark detection runs entirely on-device via MediaPipe's Tasks Vision
              runtime (WASM), bundled locally — no CDN. Licensed Apache License 2.0.
            </p>
            <a
              href="https://github.com/google-ai-edge/mediapipe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              github.com/google-ai-edge/mediapipe <ExternalLink size={12} />
            </a>
          </Card>

          <Card padding="md" className="bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-md rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary mb-5">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-general font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
              ASL Classifier Reference
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-3">
              The browser-native geometric classifier is adapted from a Python reference
              pipeline that extracts the same 21 hand landmarks for ASL fingerspelling
              recognition.
            </p>
            <a
              href="https://github.com/VAKULABHUSHAN/sign-language"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              github.com/VAKULABHUSHAN/sign-language <ExternalLink size={12} />
            </a>
          </Card>
        </div>
      </div>

      <StrokeDivider />

      {/* ── DEPENDENCY LICENSE TABLE ─────────────────────────────── */}
      <div>
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-lg font-general font-bold tracking-tight text-text-primary">Runtime Dependencies</h2>
          <p className="text-xs text-text-secondary mt-1">Every package shipped in the production bundle.</p>
        </div>

        <Card padding="none" className="bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-md rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] text-text-secondary">
                <th className="text-left font-semibold px-4 py-3">Package</th>
                <th className="text-left font-semibold px-4 py-3">Version</th>
                <th className="text-left font-semibold px-4 py-3">License</th>
              </tr>
            </thead>
            <tbody>
              {RUNTIME_DEPENDENCIES.map((dep) => (
                <tr key={dep.name} className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-0">
                  <td className="px-4 py-3">
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-text-primary hover:text-primary transition-colors"
                    >
                      {dep.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-text-secondary font-mono">{dep.version}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded border border-primary/20 bg-primary/[0.06] text-primary font-semibold">
                      {dep.license}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <StrokeDivider />

      {/* ── AUTHENTICATION & DATA DISCLOSURE ─────────────────────── */}
      <div>
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-lg font-general font-bold tracking-tight text-text-primary">Authentication &amp; data</h2>
          <p className="text-xs text-text-secondary mt-1">Who processes what, and what never leaves your device.</p>
        </div>

        <Card padding="md" className="bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-md rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary mb-5">
            <ShieldCheck size={20} />
          </div>
          <h3 className="text-sm font-general font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
            Clerk (third-party authentication)
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            Sign-in and account management are provided by Clerk, a third-party
            authentication service. Account data you provide during sign-up or
            sign-in (such as name and email) is processed by Clerk under its own
            privacy policy. Detection frames, hand landmarks, and recognized text
            are unrelated to authentication and are never sent to Clerk, Sentry,
            or any other third party — they never leave your device.
          </p>
        </Card>
      </div>

      {/* ── CLOSING NOTE ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-r from-primary/[0.05] via-primary/[0.02] to-transparent border border-primary/10 text-center md:text-left">
        <h3 className="text-md font-general font-bold text-text-primary mb-1">Full license texts</h3>
        <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
          Each package's own license file ships inside its published npm distribution and
          is included in this app's build output. Follow the links above for the
          authoritative source and full license text.
        </p>
      </div>

    </div>
  );
}
