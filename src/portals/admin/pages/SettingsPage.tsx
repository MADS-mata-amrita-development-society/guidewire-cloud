import { Card } from '@/components/Card/Card.tsx';
import { Gear as SettingsIcon, Shield, Warning , Buildings , SignOut , CalendarBlank , CaretRight , MagnifyingGlass , House } from '@phosphor-icons/react';

export function SettingsPage() {
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Platform configuration and management</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Card className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Shield size={20} style={{ color: 'var(--aegis-500)' }} />
            <h3 style={{ fontSize: 'var(--text-base)' }}>Insurance Tier Configuration</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { tier: 'Basic', coverage: '50%', color: 'var(--aegis-gray-500)' },
              { tier: 'Standard', coverage: '75%', color: 'var(--aegis-500)' },
              { tier: 'Premium', coverage: '100%', color: '#7C3AED' },
            ].map(t => (
              <div key={t.tier} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--space-3)', background: 'var(--aegis-gray-50)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: t.color,
                  }} />
                  <span className="font-semibold text-sm">{t.tier} Tier</span>
                </div>
                <span className="text-sm text-muted">Coverage: {t.coverage}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Warning size={20} style={{ color: 'var(--aegis-warning)' }} />
            <h3 style={{ fontSize: 'var(--text-base)' }}>Disruption Event Management</h3>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: 0 }}>
            Manage active disruption events. (Feature coming soon — events can be managed via direct database access for now.)
          </p>
        </Card>

        <Card className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <SettingsIcon size={20} style={{ color: 'var(--aegis-gray-500)' }} />
            <h3 style={{ fontSize: 'var(--text-base)' }}>System Configuration</h3>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: 0 }}>
            Advanced system settings will be available here in future iterations.
          </p>
        </Card>
      </div>
    </div>
  );
}
