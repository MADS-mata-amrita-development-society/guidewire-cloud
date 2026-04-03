import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { fetchAdminStats, fetchAllClaims } from '@/services/api.ts';
import { StatCard } from '@/components/StatCard/StatCard.tsx';
import { Card } from '@/components/Card/Card.tsx';
import { StatusBadge } from '@/components/Badge/Badge.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Buildings, Users, MagnifyingGlass, Wallet, Warning, CaretRight , SignOut , CalendarBlank , House } from '@phosphor-icons/react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ companies: 0, drivers: 0, pendingClaims: 0, totalPayouts: 0 });
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          fetchAdminStats(),
          fetchAllClaims(),
        ]);
        setStats(s);
        setRecentClaims((c.data || []).slice(0, 5));
      } catch (e) {
        console.error('[AdminDashboard] Error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Platform overview</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Companies" value={stats.companies} icon={Buildings} iconColor="blue" />
        <StatCard label="Drivers" value={stats.drivers} icon={Users} iconColor="green" />
        <StatCard label="Pending Claims" value={stats.pendingClaims} icon={MagnifyingGlass} iconColor="amber" />
        <StatCard label="Total Payouts" value={formatCurrency(stats.totalPayouts)} icon={Wallet} iconColor="blue" />
      </div>

      {stats.pendingClaims > 0 && (
        <Card interactive onClick={() => navigate('/claims')} style={{ marginTop: 'var(--space-4)', borderLeft: '3px solid var(--aegis-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Warning size={18} style={{ color: 'var(--aegis-warning)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{stats.pendingClaims} claims waiting for review</div>
              <div className="text-xs text-muted">Click to review</div>
            </div>
            <CaretRight size={16} className="text-muted" />
          </div>
        </Card>
      )}

      {recentClaims.length > 0 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Recent Claims</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Driver</th><th>Type</th><th>Amount</th><th>Status</th><th>Filed</th></tr>
              </thead>
              <tbody>
                {recentClaims.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.driver?.full_name || '—'}</td>
                    <td>{c.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike'}</td>
                    <td className="font-serif">{formatCurrency(c.claimed_amount)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-muted">{new Date(c.filed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
