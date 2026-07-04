import { Link } from 'react-router-dom';
import { Moon, Sun, Video } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ hideSidebar }: { hideSidebar?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center border-b border-border bg-surface/90 backdrop-blur-md px-4 md:px-6">
      <div className="flex items-center gap-2 mr-auto">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group" aria-label="SignBridge home">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Video size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="font-general font-semibold text-base tracking-tight text-text-primary group-hover:text-primary transition-colors"
            style={{ fontFamily: 'var(--font-general)' }}
          >
            SignBridge
          </span>
        </Link>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {!hideSidebar && (
          <>
            <Link
              to="/workspace"
              className="hidden sm:flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
            >
              <Video size={14} />
              Start
            </Link>
          </>
        )}

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-primary hover:bg-surface-alt transition-colors"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}
