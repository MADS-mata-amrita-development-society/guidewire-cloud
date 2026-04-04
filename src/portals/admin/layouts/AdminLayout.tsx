import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import aegisLogo from '@/assets/aegis.png';
import { SquaresFour, MagnifyingGlass, Buildings, Users, Wallet, SignOut } from '@phosphor-icons/react';

const navItems = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/claims', icon: MagnifyingGlass, label: 'Claim Review' },
  { to: '/companies', icon: Buildings, label: 'Companies' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
];

export function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={aegisLogo} alt="Aegis logo" className="sidebar-logo" />
          <div className="sidebar-brand">admin</div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-section-title">Main</span>
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
