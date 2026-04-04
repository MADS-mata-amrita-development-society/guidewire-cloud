import { PortalLoginPage } from '@/components/PortalLogin/PortalLoginPage.tsx';
import '../../driver/pages/LoginPage.css';

export function LoginPage() {
  return (
    <PortalLoginPage
      portalName="Company Portal"
      placeholder="manager@company.com"
    />
  );
}
