import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar, MobileNav } from '../components/Sidebar';
import { cn } from '../utils/cn';

interface MainLayoutProps {
  hideSidebar?: boolean;
}

export function MainLayout({ hideSidebar = false }: MainLayoutProps) {
  // 1. Core Sidebar Layout State
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('signbridge.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // 2. High Contrast State (Persistent with localStorage so it stays active on reload)
  const [isHighContrast, setIsHighContrast] = useState(() => {
    try {
      return localStorage.getItem('signbridge.accessibility.highContrast') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('signbridge.sidebar.collapsed', String(next));
      } catch { }
      return next;
    });
  };

  // 3. Listen for changes and toggle the class on the document root
  useEffect(() => {
    try {
      localStorage.setItem('signbridge.accessibility.highContrast', String(isHighContrast));
    } catch { }

    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  // 4. Create a custom listener so the settings panel toggle can change this layout state
  useEffect(() => {
    const handleToggleEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsHighContrast(customEvent.detail);
    };

    window.addEventListener('toggle-high-contrast', handleToggleEvent);
    return () => window.removeEventListener('toggle-high-contrast', handleToggleEvent);
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col transition-all duration-300",
        // Automatically append high-contrast flags if active
        isHighContrast && "high-contrast bg-[#050505]"
      )}
    >
      <Navbar hideSidebar={hideSidebar} />
      <div className="flex flex-1 min-h-0">
        {!hideSidebar && <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />}
        <main
          className={cn(
            'flex-1 min-w-0 overflow-y-auto transition-all duration-300',
            hideSidebar ? '' : 'p-5 md:p-8 pb-24 md:pb-8',
          )}
          id="main-content"
        >
          {/* Outlet automatically receives high contrast rendering context via global class wrapper */}
          <Outlet />
        </main>
      </div>
      {!hideSidebar && <MobileNav />}
    </div>
  );
}