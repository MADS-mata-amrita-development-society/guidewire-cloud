import { SidebarLayout } from '@/components/SidebarLayout/SidebarLayout.tsx';
import { SquaresFour, MagnifyingGlass, Buildings, Users, Wallet } from '@phosphor-icons/react';
import type { SidebarNavItem } from '@/components/SidebarLayout/SidebarLayout.tsx';

const navItems: SidebarNavItem[] = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/claims', icon: MagnifyingGlass, label: 'Claim Review' },
  { to: '/companies', icon: Buildings, label: 'Companies' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/wallets', icon: Wallet, label: 'Wallets' },
];

export function AdminLayout() {
  return (
    <SidebarLayout
      portalName="Admin"
      navItems={navItems}
      layoutClassName="admin-layout"
    />
  );
}
