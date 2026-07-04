import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar, MobileNav } from '../components/Sidebar';
import { cn } from '../utils/cn';

interface MainLayoutProps {
  hideSidebar?: boolean;
}

export function MainLayout({ hideSidebar = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar hideSidebar={hideSidebar} />
      <div className="flex flex-1 min-h-0">
        {!hideSidebar && <Sidebar />}
        <main
          className={cn(
            'flex-1 min-w-0 overflow-y-auto',
            hideSidebar ? '' : 'p-5 md:p-8 pb-24 md:pb-8',
          )}
          id="main-content"
        >
          <Outlet />
        </main>
      </div>
      {!hideSidebar && <MobileNav />}
    </div>
  );
}
