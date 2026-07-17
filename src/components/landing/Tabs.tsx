import { useState } from 'react';
import { Lock, Zap, Globe } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: {
    steps: {
      number: string;
      title: string;
      description: string;
      stat?: { label: string; value: string };
    }[];
  };
}

const tabs: Tab[] = [
  {
    id: 'privacy',
    label: 'Privacy',
    icon: <Lock size={16} />,
    content: {
      steps: [
        {
          number: '01',
          title: 'Local Processing',
          description: 'All sign language detection happens in your browser using WebAssembly. No data ever reaches our servers — everything stays on your device.',
          stat: { label: 'Cloud Calls', value: '0' },
        },
        {
          number: '02',
          title: 'No Cloud Dependency',
          description: 'Your camera feed, transcripts, and translations stay on your device. No cloud storage, no third-party access, no data collection whatsoever.',
          stat: { label: 'Data Collection', value: 'None' },
        },
        {
          number: '03',
          title: 'Transparent by Design',
          description: 'Open-source code means you can verify exactly how your data is handled. No black boxes, no hidden telemetry, no surprises.',
          stat: { label: 'Code Transparency', value: '100%' },
        },
      ],
    },
  },
  {
    id: 'speed',
    label: 'Speed',
    icon: <Zap size={16} />,
    content: {
      steps: [
        {
          number: '01',
          title: 'Real-Time Detection',
          description: 'MediaPipe WASM runs at 18+ FPS for instant hand landmark detection and letter recognition with sub-100ms latency.',
          stat: { label: 'Detection FPS', value: '18+' },
        },
        {
          number: '02',
          title: 'Zero Latency',
          description: 'No network round-trips. Sign language is detected and translated in milliseconds, right in your browser. No buffering, no waiting.',
          stat: { label: 'Network Latency', value: '0ms' },
        },
        {
          number: '03',
          title: 'Smooth Animations',
          description: 'GPU-accelerated rendering ensures fluid transitions between signs and natural conversation flow at 60 FPS.',
          stat: { label: 'Animation FPS', value: '60' },
        },
      ],
    },
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    icon: <Globe size={16} />,
    content: {
      steps: [
        {
          number: '01',
          title: 'Multi-Language Support',
          description: 'ASL, ISL, and BSL sign languages supported out of the box. Switch between dialects with one click.',
          stat: { label: 'Languages', value: '3+' },
        },
        {
          number: '02',
          title: 'Reduced Motion',
          description: 'Full support for prefers-reduced-motion. All animations respect user accessibility preferences automatically.',
          stat: { label: 'A11y Score', value: 'AAA' },
        },
        {
          number: '03',
          title: 'Screen Reader Friendly',
          description: 'ARIA labels, keyboard navigation, and semantic HTML ensure everyone can use SignBridge, regardless of ability.',
          stat: { label: 'WCAG Level', value: '2.1 AA' },
        },
      ],
    },
  },
];

export function Tabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <section className="why-section container" id="why">
      <header className="section-header">
        <p className="section-kicker" data-reveal>Why SignBridge /</p>
        <h2 className="section-title" data-reveal>Built for everyone, designed for privacy</h2>
        <p className="section-subtitle" data-reveal>
          Three pillars that make SignBridge the most trusted sign language
          translation platform available.
        </p>
      </header>
      <div className="tabs__list" role="tablist" aria-label="Why SignBridge">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className="tabs__tab"
            onKeyDown={(e) => {
              const currentIndex = tabs.findIndex((t) => t.id === activeTab);
              let newIndex = currentIndex;

              if (e.key === 'ArrowRight') {
                newIndex = (currentIndex + 1) % tabs.length;
              } else if (e.key === 'ArrowLeft') {
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              } else if (e.key === 'Home') {
                newIndex = 0;
              } else if (e.key === 'End') {
                newIndex = tabs.length - 1;
              } else {
                return;
              }

              e.preventDefault();
              setActiveTab(tabs[newIndex].id);
              document.getElementById(`tab-${tabs[newIndex].id}`)?.focus();
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
        >
          <ol>
            {tab.content.steps.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.stat && (
                  <div className="tabs__stat">
                    <span className="tabs__stat-value">{step.stat.value}</span>
                    <span className="tabs__stat-label">{step.stat.label}</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
