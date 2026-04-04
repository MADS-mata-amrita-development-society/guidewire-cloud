import aegisLogo from '@/assets/aegis.png';
import { Button } from '@/components/Button/Button.tsx';

export function LandingPage() {
  const goTo = (sub: string) => {
    window.location.href = `${window.location.protocol}//${sub}.${window.location.host}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--aegis-gray-50)',
      padding: 'var(--space-6)',
      textAlign: 'center',
    }}>
      <div className="animate-in" style={{ maxWidth: '400px' }}>
        <img
          src={aegisLogo}
          alt="Aegis logo"
          style={{
            width: 64,
            height: 'auto',
            margin: '0 auto var(--space-4)',
            display: 'block',
            objectFit: 'contain',
          }}
        />

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--aegis-gray-500)', marginBottom: 'var(--space-6)' }}>
          AI-Powered Income Insurance for Gig Workers
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Button size="lg" fullWidth onClick={() => goTo('driver')}>Driver Portal</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => goTo('manager')}>Company Portal</Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => goTo('admin')}>Admin Portal</Button>
        </div>
      </div>
    </div>
  );
}
