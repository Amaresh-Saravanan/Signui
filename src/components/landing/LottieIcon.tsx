import { useRef, useEffect } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

interface LottieIconProps {
  animationPath: string;
  className?: string;
}

export function LottieIcon({ animationPath, className = '' }: LottieIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: animationPath,
    });

    return () => {
      animRef.current?.destroy();
    };
  }, [animationPath]);

  return <div ref={containerRef} className={className} />;
}
