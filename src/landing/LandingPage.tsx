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
      background: 'linear-gradient(90deg, #9ed0e6 0%, #dff0f7 9%, #f7f3e9 22%, #f7f3e9 78%, #dff0f7 91%, #9ed0e6 100%)',
      padding: 'var(--space-6)',
      textAlign: 'center',
    }}>
      <div className="animate-in" style={{ maxWidth: '620px' }}>
        <img
          src="/pictures/aegis%20logo.png"
          alt="Aegis logo"
          style={{
            width: 'min(100%, 520px)',
            height: 'auto',
            display: 'block',
            margin: '0 auto var(--space-6)',
          }}
        />
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--aegis-gray-500)', marginBottom: 'var(--space-8)' }}>
          AI-Powered Income Insurance for Gig Workers
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center' }}>
          <Button size="lg" fullWidth onClick={() => goTo('driver')}>Driver Portal</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => goTo('manager')}>Company Portal</Button>
          <Button className="landing-admin-btn" size="lg" fullWidth onClick={() => goTo('admin')}>Admin Portal</Button>
        </div>
      </div>
    </div>
  );
}
