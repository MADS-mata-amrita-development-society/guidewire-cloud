import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { SquaresFour, Users, FileText, ChartBar, Shield, SignOut , CalendarBlank , CaretRight , MagnifyingGlass , House } from '@phosphor-icons/react';

const navItems = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/claims', icon: FileText, label: 'Claims' },
  { to: '/analytics', icon: ChartBar, label: 'Analytics' },
];

export function ManagerLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="manager-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'linear-gradient(180deg, #8DBDFF, #6AA1F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Shield size={16} />
          </div>
          <div className="sidebar-brand"><span>Aegis</span> Manager</div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">Navigation</span>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
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
