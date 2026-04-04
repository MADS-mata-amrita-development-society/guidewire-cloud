import { createRoot } from 'react-dom/client';
import { getPortalFromHostname } from '@/config/constants.ts';
import { ToastProvider } from '@/components/Toast/ToastProvider.tsx';
import '@/design/global.css';

// Dynamic portal imports
import { DriverApp } from '@/portals/driver/DriverApp.tsx';
import { AdminApp } from '@/portals/admin/AdminApp.tsx';
import { ManagerApp } from '@/portals/manager/ManagerApp.tsx';
import { LandingPage } from '@/landing/LandingPage.tsx';

export function App() {
  const portal = getPortalFromHostname();

  let PortalComponent;
  switch (portal) {
    case 'driver':
      PortalComponent = DriverApp;
      break;
    case 'admin':
      PortalComponent = AdminApp;
      break;
    case 'manager':
      PortalComponent = ManagerApp;
      break;
    default:
      PortalComponent = LandingPage;
  }

  return (
    <ToastProvider>
      <PortalComponent />
    </ToastProvider>
  );
}

// Remove initial loading overlay
const initialLoading = document.getElementById('initial-loading');
if (initialLoading) initialLoading.remove();

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(<App />);
