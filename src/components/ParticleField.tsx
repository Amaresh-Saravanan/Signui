import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { hexToRgb } from '../lib/color';

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ParticleFieldHandle {
  /** Multiplies point drift speed. Used by Landing's scroll-scrub effect. */
  setSpeed: (multiplier: number) => void;
}

interface ParticleFieldProps {
  /** CSS custom property to read for particle/line color. Re-read on theme toggle. */
  colorVar?: string;
  /** Draw connecting lines between nearby points (network look) vs simple drifting dots. */
  linked?: boolean;
  /** Particles per ~14000px^2 of canvas area, capped at this value. */
  density?: number;
  /** Max px distance for a connecting line when linked=true. */
  linkDistance?: number;
  /** Base alpha for each dot. */
  dotOpacity?: number;
  className?: string;
}

const DEFAULT_DENSITY = 120;
const DEFAULT_LINK_DISTANCE = 130;
const DEFAULT_DOT_OPACITY = 0.6;
/** Fallback while the color var hasn't been read yet (matches --color-primary, light theme). */
const FALLBACK_RGB = '13,148,136';

export const ParticleField = forwardRef<ParticleFieldHandle, ParticleFieldProps>(function ParticleField(
  {
    colorVar = '--color-primary',
    linked = true,
    density = DEFAULT_DENSITY,
    linkDistance = DEFAULT_LINK_DISTANCE,
    dotOpacity = DEFAULT_DOT_OPACITY,
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const speedRef = useRef(1);
  const wRef = useRef(0);
  const hRef = useRef(0);
  const rgbRef = useRef(FALLBACK_RGB);

  useImperativeHandle(ref, () => ({
    setSpeed: (multiplier: number) => {
      speedRef.current = multiplier;
    },
  }), []);

  const readColor = useCallback(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    rgbRef.current = hexToRgb(raw) ?? rgbRef.current;
  }, [colorVar]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = pointsRef.current;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      ctx.fillStyle = `rgba(${rgbRef.current},${dotOpacity})`;
      ctx.fillRect(a.x - 1, a.y - 1, 2, 2);

      if (!linked) continue;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > linkDistance) continue;
        ctx.strokeStyle = `rgba(${rgbRef.current},${(1 - d / linkDistance) * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }, [linked, linkDistance, dotOpacity]);

  const tick = useCallback(() => {
    const points = pointsRef.current;
    const w = wRef.current;
    const h = hRef.current;
    for (const p of points) {
      p.x += p.vx * speedRef.current;
      p.y += p.vy * speedRef.current;
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

    const count = Math.min(density, Math.floor((width * height) / 14000));
    pointsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));
  }, [density]);

  useEffect(() => {
    readColor();
    resize();
    window.addEventListener('resize', resize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      draw();
      return () => window.removeEventListener('resize', resize);
    }

    // Re-read the color whenever the theme toggles (html.dark class changes).
    const colorObserver = new MutationObserver(readColor);
    colorObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const container = containerRef.current;
    let animFrameId = 0;
    let running = false;
    const animate = () => {
      tick();
      animFrameId = requestAnimationFrame(animate);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        animate();
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(animFrameId);
      }
    });
    if (container) io.observe(container);

    return () => {
      window.removeEventListener('resize', resize);
      colorObserver.disconnect();
      io.disconnect();
      cancelAnimationFrame(animFrameId);
    };
  }, [readColor, resize, tick, draw]);

  return (
    <div ref={containerRef} className={className ?? 'absolute inset-0'}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
    </div>
  );
});
