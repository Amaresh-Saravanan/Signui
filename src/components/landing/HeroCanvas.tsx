import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const LINK_DIST = 130;

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function HeroCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const progressRef = useRef(0);
  const wRef = useRef(0);
  const hRef = useRef(0);
  const rgbRef = useRef('34,211,238');

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const fade = 1 - progressRef.current * 0.8;
    const points = pointsRef.current;

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      ctx.fillStyle = `rgba(242,242,240,${0.5 * fade})`;
      ctx.fillRect(a.x - 1, a.y - 1, 2, 2);

      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > LINK_DIST) continue;
        ctx.strokeStyle = `rgba(${rgbRef.current},${(1 - d / LINK_DIST) * 0.35 * fade})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }, []);

  const tick = useCallback(() => {
    const speed = 1 + progressRef.current * 4;
    const points = pointsRef.current;
    const w = wRef.current;
    const h = hRef.current;

    for (const p of points) {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      if (p.x < 0) p.x += w;
      if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      if (p.y > h) p.y -= h;
    }
    draw();
  }, [draw]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = container.getBoundingClientRect();
    wRef.current = width;
    hRef.current = height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(120, Math.floor((width * height) / 14000));
    pointsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    resize();
    window.addEventListener('resize', resize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      draw();
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const container = containerRef.current;
    if (!container) return;

    ScrollTrigger.create({
      trigger: container,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (st) => {
        progressRef.current = st.progress;
      },
    });

    let animFrameId: number;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const animate = () => {
          tick();
          animFrameId = requestAnimationFrame(animate);
        };
        animate();
      } else {
        cancelAnimationFrame(animFrameId);
      }
    });
    io.observe(container);

    return () => {
      window.removeEventListener('resize', resize);
      io.disconnect();
      cancelAnimationFrame(animFrameId);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [resize, tick, draw]);

  return (
    <div ref={containerRef} className="hero__canvas-container">
      <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
    </div>
  );
}
