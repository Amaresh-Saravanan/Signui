import { Zap, Globe, Shield, Activity, Users, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { StrokeDivider } from '../components/SignStroke';

const MISSION_STATS = [
  { icon: Activity, label: 'Real-Time Clarity', body: 'Sub-150ms on-device processing handles natural conversations natively without lag.' },
  { icon: Globe, label: 'Global Dialects', body: 'Bridging regional variations across ISL, ASL, and BSL with localized intelligence.' },
  { icon: Shield, label: 'Absolute Privacy', body: 'Zero cloud pipeline data routing. Camera frames remain completely within your control.' },
];

const IMPACT_STORY = [
  { icon: Users, label: 'Our Purpose', text: 'To build a fluid digital bridge where gesture transforms instantly into spoken phrase, giving every user an uncompromised voice in any digital workspace.' },
  { icon: Heart, label: 'The Blueprint', text: 'Designed around real human workflows. Moving past cold algorithms to deliver an accessible interface that feels like natural interaction.' }
];

export function About() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-12 pb-16 px-4 md:px-0 page-enter">

      {/* ── HERO BANNER SECTION ─────────────────────────────────── */}
      <div className="text-center md:text-left pt-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary mb-4 font-semibold">
          The SignBridge Manifesto
        </p>
        <h1
          className="text-4xl md:text-5xl font-general font-black tracking-tight leading-none mb-6 text-text-primary"
          style={{ fontFamily: 'var(--font-general)' }}
        >
          Motion into <span className="bg-gradient-to-r from-primary to-[#3cd0bc] bg-clip-text text-transparent">meaning.</span>
        </h1>
        <p className="text-base md:text-lg text-text-secondary leading-relaxed max-w-2xl font-medium">
          Communication isn’t just about transferring data—it’s about presence. SignBridge was engineered to completely smash the wall separating sign language users from spoken-word platforms. By processing complex spatial hand coordinates seamlessly in the viewport, we turn human movement into instant, expressive dialogue.
        </p>
      </div>

      <StrokeDivider />

      {/* ── DRAMATIC CORE VALUES PILLS ──────────────────────────── */}
      <div>
        <div className="mb-6 text-center md:text-left">
          <h2 className="text-lg font-general font-bold tracking-tight text-text-primary">Core Architecture</h2>
          <p className="text-xs text-text-secondary mt-1">Built to prioritize the user experience at scale.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MISSION_STATS.map(v => (
            <Card key={v.label} padding="md" className="bg-white/[0.02] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-md rounded-2xl hover:border-primary/30 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center text-primary mb-5">
                <v.icon size={20} />
              </div>
              <h3 className="text-sm font-general font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-general)' }}>
                {v.label}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">{v.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <StrokeDivider />

      {/* ── VISIONARY IMPACT STORYLINE ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IMPACT_STORY.map((story) => (
          <div
            key={story.label}
            className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent dark:from-white/[0.01] border border-black/[0.04] dark:border-white/[0.04]"
          >
            <div className="flex items-center gap-3 mb-3">
              <story.icon size={16} className="text-primary" />
              <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-text-primary">
                {story.label}
              </h4>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed font-medium">
              {story.text}
            </p>
          </div>
        ))}
      </div>

      {/* ── CLOSING BANNER STATEMENT ────────────────────────────── */}
      <div className="relative overflow-hidden p-8 rounded-2xl bg-gradient-to-r from-primary/[0.05] via-primary/[0.02] to-transparent border border-primary/10 text-center md:text-left">
        <h3 className="text-md font-general font-bold text-text-primary mb-1">Looking Forward</h3>
        <p className="text-xs text-text-secondary max-w-xl leading-relaxed">
          We believe accessibility shouldn't be an afterthought package or a heavy secondary installation. It must be beautiful, ultra-fast, and integrated natively into modern web applications from day one.
        </p>
        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-5 hidden md:block">
          <Zap size={120} className="text-primary" />
        </div>
      </div>

      {/* ── OSS ATTRIBUTION LINK ─────────────────────────────────── */}
      <div className="text-center md:text-left">
        <Link
          to="/licenses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
        >
          Open source licenses & attribution <ArrowRight size={12} />
        </Link>
      </div>

    </div>
  );
}