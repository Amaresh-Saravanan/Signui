import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from '../components/Navbar';
import { Sidebar, MobileNav } from '../components/Sidebar';
import { cn } from '../utils/cn';
import { pageVariants } from '../lib/motion';

interface MainLayoutProps {
  hideSidebar?: boolean;
}

export function MainLayout({ hideSidebar = false }: MainLayoutProps) {
  const { pathname } = useLocation();
  const immersive = pathname === '/workspace';

  // Sidebar collapse state. High-contrast / reduce-motion preferences are
  // applied globally by AccessibilityEffects, driven by AppDataContext.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('signbridge.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Move focus to main content on route change (PRD F-25), skipping first mount.
  const mainRef = useRef<HTMLElement>(null);
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('signbridge.sidebar.collapsed', String(next));
      } catch { }
      return next;
    });
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col transition-all duration-300",
      )}
    >
      <Navbar hideSidebar={hideSidebar} />
      <div className="flex flex-1 min-h-0">
        {!hideSidebar && (
          <Sidebar collapsed={immersive || collapsed} onToggleCollapse={toggleCollapse} />
        )}
        <main
          ref={mainRef}
          tabIndex={-1}
          className={cn(
            'flex-1 min-w-0 overflow-y-auto outline-none transition-all duration-300',
            hideSidebar || immersive ? '' : 'p-5 md:p-8 pb-24 md:pb-8',
          )}
          id="main-content"
        >
          {/* Outlet automatically receives high contrast rendering context via global class wrapper */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {!hideSidebar && <MobileNav />}
    </div>
  );
}