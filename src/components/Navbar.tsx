import { Link } from 'react-router-dom';
import { Moon, Sun, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ hideSidebar }: { hideSidebar?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center border-b border-border bg-surface/85 backdrop-blur-xl px-4 md:px-6 gap-4">

      {/* ── BRAND LOGO LINK (PURE CODE & CSS - NO IMAGES) ────────────────── */}
      <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="SignBridge home">

        {/* Custom Crafted Infinity Hands Logo Mark */}
        <div className="relative w-8 h-8 flex items-center justify-center select-none scale-105">
          {/* Left/Top Hand Wing */}
          <div className="absolute top-0 left-0 w-5 h-5 border-[3.5px] border-primary rounded-full rounded-tl-none -rotate-45 group-hover:scale-105 transition-transform duration-300" />

          {/* Right/Bottom Hand Wing */}
          <div className="absolute bottom-0 right-0 w-5 h-5 border-[3.5px] border-primary rounded-full rounded-br-none -rotate-45 group-hover:scale-105 transition-transform duration-300" />

          {/* Intersecting Center Bridge Dots */}
          <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-80 absolute top-[13px] left-[13px]" />
        </div>

        {/* Brand Typography */}
        <span
          className="font-general font-bold text-[19px] tracking-tight text-primary dark:text-primary transition-colors duration-200"
          style={{ fontFamily: 'var(--font-general)' }}
        >
          SignBridge
        </span>
      </Link>
      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {!hideSidebar && (
          <Link
            to="/workspace"
            className="hidden sm:flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all duration-150"
          >
            <Zap size={13} fill="currentColor" strokeWidth={2.5} />
            Start
          </Link>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-primary hover:bg-white/[0.04] transition-all duration-200"
        >
          <span className="transition-all duration-300 ease-spring">
            {theme === 'dark'
              ? <Sun size={16} strokeWidth={2} />
              : <Moon size={16} strokeWidth={2} />
            }
          </span>
        </button>
      </div>
    </header>
  );
}