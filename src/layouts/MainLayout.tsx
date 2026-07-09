import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar, MobileNav } from '../components/Sidebar';
import { cn } from '../utils/cn';

interface MainLayoutProps {
  hideSidebar?: boolean;
}

export function MainLayout({ hideSidebar = false }: MainLayoutProps) {
  // Sidebar collapse state. High-contrast / reduce-motion preferences are
  // applied globally by AccessibilityEffects, driven by AppDataContext.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('signbridge.sidebar.collapsed') === 'true';
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

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col transition-all duration-300",
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