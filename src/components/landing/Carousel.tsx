import { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, GraduationCap, HeadphonesIcon, Users } from 'lucide-react';

interface Slide {
  index: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string }[];
}

const slides: Slide[] = [
  {
    index: '01',
    icon: <Heart size={24} />,
    title: 'Healthcare',
    description: 'Enable seamless communication between doctors and deaf patients. Real-time sign language translation for medical consultations, emergency rooms, and telehealth appointments.',
    stats: [
      { label: 'Consultation Time', value: '-40%' },
      { label: 'Patient Satisfaction', value: '98%' },
    ],
  },
  {
    index: '02',
    icon: <GraduationCap size={24} />,
    title: 'Education',
    description: 'Break barriers in classrooms. Students and teachers can communicate naturally across sign language boundaries. Perfect for inclusive learning environments.',
    stats: [
      { label: 'Student Engagement', value: '+65%' },
      { label: 'Class Participation', value: '3x' },
    ],
  },
  {
    index: '03',
    icon: <HeadphonesIcon size={24} />,
    title: 'Customer Service',
    description: 'Make every interaction accessible. Support deaf customers with instant sign language translation at any service desk, call center, or retail environment.',
    stats: [
      { label: 'Response Time', value: '-50%' },
      { label: 'Resolution Rate', value: '95%' },
    ],
  },
  {
    index: '04',
    icon: <Users size={24} />,
    title: 'Public Events',
    description: 'Conferences, concerts, and community events become inclusive with live sign language translation for all attendees. No interpreter booking required.',
    stats: [
      { label: 'Accessibility Score', value: '100%' },
      { label: 'Cost Savings', value: '$2K+' },
    ],
  },
];

export function Carousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return;

    const updateProgress = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;
      const progress = track.scrollLeft / maxScroll;
      gsap.to(bar, { scaleX: progress, duration: 0.1 });
    };

    track.addEventListener('scroll', updateProgress);

    ScrollTrigger.create({
      trigger: track,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        gsap.to(bar, { scaleX: self.progress, duration: 0.1 });
      },
    });

    return () => {
      track.removeEventListener('scroll', updateProgress);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.pageX - (trackRef.current?.offsetLeft || 0);
    scrollLeft.current = trackRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (trackRef.current?.offsetLeft || 0);
    const walk = (x - startX.current) * 1.5;
    if (trackRef.current) {
      trackRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <section className="industries-section" id="use-cases">
      <div className="container">
        <header className="section-header">
          <p className="section-kicker" data-reveal>Use Cases /</p>
          <h2 className="section-title" data-reveal>Built for real-world communication</h2>
          <p className="section-subtitle" data-reveal>
            From healthcare to education, SignBridge transforms how organizations
            communicate with deaf and hard-of-hearing individuals.
          </p>
        </header>
        <div className="carousel__viewport">
          <ul
            ref={trackRef}
            className="carousel__track"
            tabIndex={0}
            aria-label="Use cases — use left and right arrow keys to browse"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {slides.map((slide) => (
              <li key={slide.index} className="slide">
                <div className="slide__header">
                  <span className="slide__index">{slide.index}</span>
                  <div className="slide__icon">{slide.icon}</div>
                </div>
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
                <div className="slide__stats">
                  {slide.stats.map((stat) => (
                    <div key={stat.label} className="slide__stat">
                      <span className="slide__stat-value">{stat.value}</span>
                      <span className="slide__stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="carousel__progress" aria-hidden="true">
          <span ref={barRef} className="carousel__bar" />
        </div>
      </div>
    </section>
  );
}
