import { PortalLoginPage } from '@/components/PortalLogin/PortalLoginPage.tsx';
import '../../driver/pages/LoginPage.css';

export function LoginPage() {
  return (
    <PortalLoginPage
      portalName="Admin Portal"
      placeholder="admin@aegis.com"
      footerText="Aegis Insurance Admin Console"
    />
  );
}
