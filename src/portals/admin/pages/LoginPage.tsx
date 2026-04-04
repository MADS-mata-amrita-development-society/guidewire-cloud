import { PortalLoginPage } from '@/components/PortalLogin/PortalLoginPage.tsx';
import '../../driver/pages/LoginPage.css';

export function LoginPage() {
  return (
    <PortalLoginPage
      portalName="Admin Portal"
      placeholder="admin@portal.com"
      footerText="Admin Console"
    />
  );
}
