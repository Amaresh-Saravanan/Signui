import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Video, Clock, BookOpen, BarChart2, Settings, User, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { SignStroke } from './SignStroke';
import { cn } from '../utils/cn';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Video, label: 'Workspace', path: '/workspace' },
  { icon: Clock, label: 'History', path: '/history' },
  { icon: BookOpen, label: 'Phrasebook', path: '/phrasebook' },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const secondaryItems = [
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Info, label: 'About', path: '/about' },
  // 💡 Contact section has been completely removed from here
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function NavItem({ icon: Icon, label, path, collapsed }: { icon: any; label: string; path: string; collapsed?: boolean }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
          isActive
            ? 'text-[#00bfa5] font-semibold bg-[#00bfa5]/[0.08] dark:bg-[#00bfa5]/[0.1]'
            : 'text-text-secondary hover:text-[#00bfa5] hover:bg-white/[0.04] font-medium',
          collapsed ? 'justify-center px-0 w-10 mx-auto' : ''
        )
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span>{label}</span>}

          {/* SignStroke custom teal indicator */}
          {isActive && !collapsed && (
            <motion.div
              layoutId="nav-stroke"
              className="absolute bottom-0.5 left-3 right-3 pointer-events-none"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <SignStroke variant="nav-accent" color="#00bfa5" width={52} height={8} />
            </motion.div>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside className={cn(
      "hidden md:flex flex-col shrink-0 border-r border-border/80 bg-surface h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto scrollbar-hide transition-all duration-300",
      collapsed ? "w-16" : "w-56"
    )}>
      <nav className="flex flex-col gap-0.5 p-3 pt-4 flex-1" aria-label="Main navigation">
        <div className={cn("mb-1 px-3 py-1 transition-all duration-300", collapsed ? "opacity-0 h-0 p-0 m-0 overflow-hidden" : "")}>
          <span className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary">App</span>
        </div>
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} />
        ))}

        <div className="my-3 px-3">
          <div className="h-px bg-border" />
        </div>

        <div className={cn("mb-1 px-3 py-1 transition-all duration-300", collapsed ? "opacity-0 h-0 p-0 m-0 overflow-hidden" : "")}>
          <span className="text-[10px] font-mono-sb uppercase tracking-widest text-text-secondary">Account</span>
        </div>
        {secondaryItems.map((item) => (
          <NavItem key={item.path} {...item} collapsed={collapsed} />
        ))}

        {/* Bottom Expand/Collapse Controller */}
        <div className="mt-auto pt-4 flex justify-center">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-border bg-surface-alt/50 text-text-secondary hover:text-[#00bfa5] hover:bg-white/[0.04] hover:border-[#00bfa5]/30 transition-all duration-200"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </nav>
    </aside>
  );
}

/** Mobile bottom bar */
export function MobileNav() {
  const mainItems = navItems.slice(0, 4);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex items-center justify-around px-2 py-1 safe-bottom" aria-label="Mobile navigation">
      {mainItems.map(({ icon: Icon, label, path }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors',
              isActive ? 'text-[#00bfa5]' : 'text-text-secondary hover:text-[#00bfa5]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}