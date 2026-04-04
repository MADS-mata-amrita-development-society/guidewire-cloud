import { PortalLoginPage } from '@/components/PortalLogin/PortalLoginPage.tsx';
import './LoginPage.css';

export function LoginPage() {
  return (
    <PortalLoginPage
      portalName="Driver Portal"
      placeholder="driver@example.com"
    />
  );
}
