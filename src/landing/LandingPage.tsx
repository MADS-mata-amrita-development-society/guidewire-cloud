import { Shield } from '@phosphor-icons/react';
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
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, #8DBDFF, #6AA1F5)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-4)',
          boxShadow: 'var(--shadow-btn)',
        }}>
          <Shield size={24} />
        </div>

        <h1 className="font-serif" style={{ fontSize: 'var(--text-3xl)', color: 'var(--aegis-gray-900)', marginBottom: 'var(--space-2)' }}>
          Aegis
        </h1>
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
