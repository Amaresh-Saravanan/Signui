import { NavLink } from 'react-router-dom';
import { Home, Video, Clock, BookOpen, BarChart2, Settings, User, Info, Mail } from 'lucide-react';
import { cn } from '../utils/cn';

const navItems = [
  { icon: Home,     label: 'Dashboard',  path: '/dashboard' },
  { icon: Video,    label: 'Workspace',  path: '/workspace' },
  { icon: Clock,    label: 'History',    path: '/history' },
  { icon: BookOpen, label: 'Phrasebook', path: '/phrasebook' },
  { icon: BarChart2,label: 'Analytics',  path: '/analytics' },
  { icon: Settings, label: 'Settings',   path: '/settings' },
];

const secondaryItems = [
  { icon: User,  label: 'Profile', path: '/profile' },
  { icon: Info,  label: 'About',   path: '/about' },
  { icon: Mail,  label: 'Contact', path: '/contact' },
];

function NavItem({ icon: Icon, label, path }: { icon: any; label: string; path: string }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
          isActive
            ? 'text-primary font-semibold bg-primary-soft'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt font-medium'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Clean, simple active indicator line */}
          {isActive && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
          )}
          <Icon size={18} className="shrink-0" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-surface h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto scrollbar-hide">
      <nav className="flex flex-col gap-0.5 p-3 pt-4 flex-1" aria-label="Main navigation">
        <div className="mb-1 px-3 py-1">
          <span className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary">App</span>
        </div>
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        <div className="my-3 px-3">
          <div className="h-px bg-border" />
        </div>

        <div className="mb-1 px-3 py-1">
          <span className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary">Account</span>
        </div>
        {secondaryItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>
    </aside>
  );
}

/** Mobile bottom bar */
export function MobileNav() {
  // Use first 5 items to fit mobile standard (Dashboard, Workspace, History, Phrasebook, Analytics)
  const mainItems = navItems.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around px-2 py-1 safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.05)]" aria-label="Mobile navigation">
      {mainItems.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-[10px] transition-colors relative',
              isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Clean active indicator for mobile */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="leading-none font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
