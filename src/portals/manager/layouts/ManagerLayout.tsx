import { SidebarLayout } from '@/components/SidebarLayout/SidebarLayout.tsx';
import { SquaresFour, Users, FileText, ChartBar } from '@phosphor-icons/react';
import type { SidebarNavItem } from '@/components/SidebarLayout/SidebarLayout.tsx';

const navItems: SidebarNavItem[] = [
  { to: '/', icon: SquaresFour, label: 'Dashboard', end: true },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/claims', icon: FileText, label: 'Claims' },
  { to: '/analytics', icon: ChartBar, label: 'Analytics' },
];

export function ManagerLayout() {
  return (
    <SidebarLayout
      portalName="Manager"
      navItems={navItems}
      sectionTitle="Navigation"
      layoutClassName="manager-layout"
    />
  );
}
