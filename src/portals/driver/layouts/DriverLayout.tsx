import { Outlet, NavLink } from 'react-router-dom';
import { House, FileText, Wallet, UserCircle } from '@phosphor-icons/react';

export function DriverLayout() {
  return (
    <div className="layout-with-bottomnav">
      <Outlet />

      <nav className="bottomnav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}
        >
          <House className="nav-icon" size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/claims"
          className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}
        >
          <FileText className="nav-icon" size={22} />
          <span>Claims</span>
        </NavLink>
        <NavLink
          to="/wallet"
          className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}
        >
          <Wallet className="nav-icon" size={22} />
          <span>Wallet</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `bottomnav-item ${isActive ? 'active' : ''}`}
        >
          <UserCircle className="nav-icon" size={22} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
