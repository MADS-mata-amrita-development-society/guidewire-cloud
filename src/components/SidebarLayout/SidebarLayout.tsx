import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { Moon, SignOut, Sun } from '@phosphor-icons/react';
import type { Icon as PhosphorIconType } from '@phosphor-icons/react';

export interface SidebarNavItem {
  to: string;
  icon: PhosphorIconType;
  label: string;
  end?: boolean;
}

interface SidebarLayoutProps {
  portalName: string;
  navItems: SidebarNavItem[];
  sectionTitle?: string;
  layoutClassName?: string;
}

export function SidebarLayout({
  portalName,
  navItems,
  sectionTitle = 'Main',
  layoutClassName = 'admin-layout',
}: SidebarLayoutProps) {
  const { profile, signOut } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('aegis-theme');
    const shouldUseDark = storedTheme === 'dark';
    setIsDarkMode(shouldUseDark);
    document.documentElement.dataset.theme = shouldUseDark ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('aegis-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className={layoutClassName}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <img className="sidebar-logo-image" src="/pictures/aegis%20logo.png" alt="Aegis" />
          <div className="sidebar-brand">{portalName}</div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">{sectionTitle}</span>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link" style={{ width: '100%', marginBottom: '4px' }} onClick={() => setIsDarkMode(prev => !prev)}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div style={{ padding: '8px 12px', marginBottom: '4px' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--aegis-gray-900)' }}>{profile?.full_name}</div>
            <div className="text-xs text-muted">{profile?.email}</div>
          </div>
          <button className="sidebar-link" style={{ width: '100%' }} onClick={signOut}>
            <SignOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="layout-with-sidebar">
        <Outlet />
      </div>
    </div>
  );
}
