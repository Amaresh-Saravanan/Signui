import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Zap, Mic, Camera, Shield, Eye, Languages } from 'lucide-react';

interface Feature {
  index: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string }[];
  highlights: string[];
}

const features: Feature[] = [
  {
    index: '01',
    icon: <Camera size={28} />,
    title: 'Sign-to-Text Translation',
    description: 'Our advanced hand landmark detection reads complex signs and fingerspelling with precision. Using MediaPipe WASM, we detect 21 hand landmarks in real-time and translate them into natural text sentences.',
    stats: [
      { label: 'Detection Speed', value: '18+ FPS' },
      { label: 'Letters Supported', value: '26' },
      { label: 'Accuracy', value: '95%+' },
    ],
    highlights: [
      'Real-time hand tracking',
      'Temporal smoothing algorithm',
      'Confidence scoring',
      'Multi-hand detection',
    ],
  },
  {
    index: '02',
    icon: <Mic size={28} />,
    title: 'Text-to-Sign Display',
    description: 'Type any message and watch it come alive as a 3D avatar performs the ASL fingerspelling. Our browser-native 3D renderer shows each letter with smooth transitions between signs.',
    stats: [
      { label: 'Animation FPS', value: '60' },
      { label: 'Transition Speed', value: '0.3s' },
      { label: 'Languages', value: '3+' },
    ],
    highlights: [
      '3D avatar rendering',
      'Smooth pose transitions',
      'Letter-by-letter display',
      'Customizable speed',
    ],
  },
  {
    index: '03',
    icon: <Zap size={28} />,
    title: 'Instant Word Building',
    description: 'Letters are automatically composed into words using our intelligent temporal algorithm. When you pause signing, the system commits the word to your transcript — no typing required.',
    stats: [
      { label: 'Word Commit', value: '<1s' },
      { label: 'Buffer Frames', value: '22' },
      { label: 'Min Confidence', value: '55%' },
    ],
    highlights: [
      'Auto word composition',
      'Stable letter detection',
      'Smart pause detection',
      'Confidence filtering',
    ],
  },
  {
    index: '04',
    icon: <Eye size={28} />,
    title: 'Browser-Native Detection',
    description: 'No downloads, no installs, no plugins. Our detection engine runs entirely in your browser using WebAssembly and WebGPU acceleration. Works on any modern browser across all devices.',
    stats: [
      { label: 'Bundle Size', value: '7.8MB' },
      { label: 'Load Time', value: '<2s' },
      { label: 'Browser Support', value: '95%' },
    ],
    highlights: [
      'WebAssembly runtime',
      'GPU acceleration',
      'Zero setup required',
      'Cross-platform',
    ],
  },
  {
    index: '05',
    icon: <Shield size={28} />,
    title: 'Privacy-First Architecture',
    description: 'Your camera feed, audio, and transcripts never leave your device. All processing happens locally using WebAssembly. No cloud uploads, no third-party access, no data collection.',
    stats: [
      { label: 'Cloud Calls', value: '0' },
      { label: 'Data Storage', value: 'Local' },
      { label: 'Privacy Score', value: '100%' },
    ],
    highlights: [
      'On-device processing',
      'No cloud dependency',
      'Open-source code',
      'WCAG 2.1 AA compliant',
    ],
  },
];

export function StackingCards() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const cards = cardsRef.current.filter(Boolean);
    if (cards.length === 0) return;

    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;

      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        scale: 0.95,
        opacity: 0.6,
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="stacking-section container" id="features">
      <header className="section-header">
        <p className="section-kicker" data-reveal>Features /</p>
        <h2 className="section-title" data-reveal>One suite for seamless communication</h2>
        <p className="section-subtitle" data-reveal>
          Everything you need to translate sign language in real-time,
          powered by browser-native AI that runs entirely on your device.
        </p>
      </header>
      <div className="stack">
        {features.map((feature, i) => (
          <article
            key={feature.index}
            ref={(el: HTMLDivElement | null) => { if (el) cardsRef.current[i] = el; }}
            className="card"
          >
            <div className="card__top">
              <span className="card__index">{feature.index}</span>
              <div className="card__icon">
                {feature.icon}
              </div>
            </div>
            <h3 className="card__title">{feature.title}</h3>
            <p className="card__desc">{feature.description}</p>

            <div className="card__content">
              <div className="card__stats">
                {feature.stats.map((stat) => (
                  <div key={stat.label} className="card__stat">
                    <span className="card__stat-value">{stat.value}</span>
                    <span className="card__stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="card__highlights">
                {feature.highlights.map((h) => (
                  <div key={h} className="card__highlight">
                    <Languages size={14} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
