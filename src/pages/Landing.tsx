import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { HeroCanvas } from '../components/landing/HeroCanvas';
import { StackingCards } from '../components/landing/StackingCards';
import { Carousel } from '../components/landing/Carousel';
import { Tabs } from '../components/landing/Tabs';
import '../styles/landing.css';

const stats = [
  { value: '26', suffix: '+', label: 'ASL Letters Detected' },
  { value: '0', suffix: 'ms', label: 'Latency (On-Device)' },
  { value: '100', suffix: '%', label: 'Private & Secure' },
  { value: '3', suffix: '+', label: 'Sign Languages' },
];

const howItWorks = [
  {
    num: '01',
    title: 'Activate Camera',
    desc: 'Securely connect your webcam. All processing happens locally — nothing leaves your device.',
    icon: '📹',
  },
  {
    num: '02',
    title: 'Sign Naturally',
    desc: 'Use ASL, ISL, or BSL fingerspelling. Our AI recognizes hand shapes in real-time at 18+ FPS.',
    icon: '🤟',
  },
  {
    num: '03',
    title: 'Instant Translation',
    desc: 'See text appear as you sign. Copy, share, or have it read aloud — zero delays.',
    icon: '⚡',
  },
  {
    num: '04',
    title: 'Save & Review',
    desc: 'Conversation history is saved locally. Review past translations anytime, completely private.',
    icon: '💾',
  },
];

const testimonials = [
  {
    quote: "SignBridge replaced three different translation tools on day one. The setup felt effortless — and our deaf students can now participate in every class discussion.",
    name: "Dr. Sarah Chen",
    role: "Director of Accessibility, State University",
    avatar: "SC",
  },
  {
    quote: "As a deaf professional, this tool has transformed my daily meetings. I can finally communicate with hearing colleagues without needing an interpreter present.",
    name: "Marcus Williams",
    role: "Software Engineer, TechCorp",
    avatar: "MW",
  },
  {
    quote: "The privacy-first approach is what sold us. No cloud uploads, no data collection — just pure, instant translation right in the browser.",
    name: "Aisha Patel",
    role: "CTO, AccessFirst Inc.",
    avatar: "AP",
  },
];

export function Landing() {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const html = document.documentElement;
    html.classList.add('has-js');
    if (reducedMotion) html.classList.add('reduce-motion');

    let lenis: Lenis | null = null;
    if (!reducedMotion) {
      lenis = new Lenis({ anchors: { offset: -96 } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Reveal animations with stagger
    const revealElements = document.querySelectorAll('[data-reveal]');
    revealElements.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        }
      );
    });

    // Parallax for floating elements
    const parallaxElements = document.querySelectorAll<HTMLElement>('[data-parallax]');
    parallaxElements.forEach((el) => {
      gsap.to(el, {
        y: -30,
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
        },
      });
    });

    return () => {
      lenis?.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="relative min-h-screen text-white antialiased" style={{ background: '#0a0a0f' }}>
      {/* HEADER */}
      <header className="header">
        <a className="header__logo" href="#top" aria-label="SignBridge home">
          <span className="logo-text">SignBridge</span>
          <span className="logo-dot" />
        </a>
        <nav className="header__nav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#use-cases">Use Cases</a>
          <a href="#why">Why SignBridge</a>
          <Link to="/workspace" className="btn btn--small">Get Started</Link>
        </nav>
      </header>

      <main ref={mainRef} id="top">
        {/* ═══════ HERO ═══════ */}
        <section className="hero">
          <HeroCanvas />
          <div className="container hero__content">
            <div className="hero__badges" data-reveal>
              <span className="badge badge--cyan">
                <span className="badge-dot" /> Real-Time Detection
              </span>
              <span className="badge badge--emerald">
                <span className="badge-dot badge-dot--emerald" /> 100% Private
              </span>
            </div>
            <h1 className="hero__title" data-reveal>
              Breaking the<br />
              <span className="gradient-text">distance</span> with ease
            </h1>
            <p className="hero__sub" data-reveal>
              Connect instantly using our smart sign language translator. ASL, ISL, BSL
              and more — all detected through your browser camera with zero data leaving
              your device. Experience instant voice generation, visual helpers, and
              fluid responses for everyday interactions.
            </p>
            <div className="hero__actions" data-reveal>
              <Link to="/workspace" className="btn btn--lg">
                Start Translating
                <span className="btn-arrow">→</span>
              </Link>
              <a href="#how-it-works" className="btn btn--ghost btn--lg">
                See How It Works
              </a>
            </div>
            <div className="hero__stats" data-reveal>
              {stats.map((stat) => (
                <div key={stat.label} className="hero__stat">
                  <span className="hero__stat-value">
                    {stat.value}<span className="hero__stat-suffix">{stat.suffix}</span>
                  </span>
                  <span className="hero__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <a className="hero__scroll-cue" href="#platform" aria-label="Scroll to content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
          <div className="marquee" aria-hidden="true">
            <div className="marquee__track">
              <span>ASL · ISL · BSL · Privacy · Real-Time · Accessible · Browser-Native · Open Source ·&nbsp;</span>
              <span>ASL · ISL · BSL · Privacy · Real-Time · Accessible · Browser-Native · Open Source ·&nbsp;</span>
            </div>
          </div>
        </section>

        {/* ═══════ PLATFORM ═══════ */}
        <section className="platform-section container" id="platform">
          <div className="platform__grid">
            <div className="platform__left">
              <p className="section-kicker" data-reveal>One app /</p>
              <h2 className="platform__title" data-reveal>
                One platform for every sign language
              </h2>
            </div>
            <div className="platform__right">
              <p className="platform__lead" data-reveal>
                SignBridge unifies every sign language you need — one source of truth
                for communication, replacing the barriers that slow teams and communities down.
              </p>
              <div className="platform__highlights" data-reveal>
                <div className="platform__highlight">
                  <span className="highlight-icon">🔒</span>
                  <div>
                    <strong>Zero Cloud Dependency</strong>
                    <p>All processing happens in your browser. No uploads, no servers, no third parties.</p>
                  </div>
                </div>
                <div className="platform__highlight">
                  <span className="highlight-icon">⚡</span>
                  <div>
                    <strong>Instant Detection</strong>
                    <p>MediaPipe WASM runs at 18+ FPS for real-time hand landmark detection.</p>
                  </div>
                </div>
                <div className="platform__highlight">
                  <span className="highlight-icon">🌐</span>
                  <div>
                    <strong>Works Everywhere</strong>
                    <p>Any modern browser, any device. No downloads, no installs required.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section className="how-it-works-section" id="how-it-works">
          <div className="container">
            <div className="section-header" data-reveal>
              <span className="section-kicker">How It Works /</span>
              <h2 className="section-title">Four simple steps to seamless interaction</h2>
              <p className="section-subtitle">
                From camera activation to saved conversations — everything happens
                in your browser with zero setup time.
              </p>
            </div>
            <div className="steps-grid">
              {howItWorks.map((step, i) => (
                <div key={step.num} className="step-card" data-reveal>
                  <div className="step-card__number">{step.num}</div>
                  <div className="step-card__icon">{step.icon}</div>
                  <h3 className="step-card__title">{step.title}</h3>
                  <p className="step-card__desc">{step.desc}</p>
                  {i < howItWorks.length - 1 && (
                    <div className="step-card__connector" aria-hidden="true">→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ FEATURES (Stacking Cards) ═══════ */}
        <StackingCards />

        {/* ═══════ USE CASES (Carousel) ═══════ */}
        <Carousel />

        {/* ═══════ WHY SIGNBRIDGE (Tabs) ═══════ */}
        <Tabs />

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="testimonials-section container">
          <div className="section-header" data-reveal>
            <span className="section-kicker">Testimonials /</span>
            <h2 className="section-title">Trusted by communities worldwide</h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="testimonial-card" data-reveal>
                <div className="testimonial-card__stars">★★★★★</div>
                <p className="testimonial-card__quote">"{t.quote}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">{t.avatar}</div>
                  <div>
                    <strong className="testimonial-card__name">{t.name}</strong>
                    <span className="testimonial-card__role">{t.role}</span>
                  </div>
                </div>
              </blockquote>
            ))}
          </div>
        </section>

        {/* ═══════ CTA ═══════ */}
        <section className="cta-section" id="contact">
          <div className="cta__bg" aria-hidden="true">
            <div className="cta__orb cta__orb--1" />
            <div className="cta__orb cta__orb--2" />
          </div>
          <div className="cta__content">
            <h2 className="cta__title" data-reveal>
              Start translating<br />today
            </h2>
            <p className="cta__subtitle" data-reveal>
              Join thousands of users breaking communication barriers.
              Free, private, and works in any browser.
            </p>
            <div className="cta__actions" data-reveal>
              <Link to="/workspace" className="btn btn--lg btn--glow">
                Get Started Free
                <span className="btn-arrow">→</span>
              </Link>
            </div>
            <p className="cta__note" data-reveal>
              No account required · No data collection · Works offline
            </p>
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="footer-section">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__brand">
              <h4 className="footer__logo">
                <span className="logo-text">SignBridge</span>
                <span className="logo-dot" />
              </h4>
              <p className="footer__tagline">
                Making sign language accessible to everyone through browser-native
                real-time translation. Privacy-first, open-source, and built for all.
              </p>
              <div className="footer__social">
                <a href="https://github.com" rel="noopener" aria-label="GitHub">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="https://twitter.com" rel="noopener" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://linkedin.com" rel="noopener" aria-label="LinkedIn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            <div className="footer__links">
              <h5 className="footer__heading">Product</h5>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#use-cases">Use Cases</a>
              <Link to="/workspace">Try Now</Link>
            </div>
            <div className="footer__links">
              <h5 className="footer__heading">Resources</h5>
              <a href="#why">Why SignBridge</a>
              <a href="https://github.com" rel="noopener">Documentation</a>
              <a href="https://github.com" rel="noopener">Open Source</a>
              <a href="https://github.com" rel="noopener">Contributing</a>
            </div>
            <div className="footer__links">
              <h5 className="footer__heading">Legal</h5>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Accessibility</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="footer__bottom">
            <p className="footer__legal">
              © 2026 SignBridge. Making communication clear.
            </p>
            <div className="footer__badges">
              <span className="footer__badge">Privacy-First</span>
              <span className="footer__badge">Open Source</span>
              <span className="footer__badge">WCAG 2.1 AA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
