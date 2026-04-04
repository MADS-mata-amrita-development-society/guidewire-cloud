import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchManagerStats, fetchAllClaims } from '@/services/api.ts';
import { StatCard } from '@/components/StatCard/StatCard.tsx';
import { StatusBadge } from '@/components/Badge/Badge.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Users, FileText, Wallet, CloudRain, Megaphone } from '@phosphor-icons/react';
import type { ClaimWithDriver } from '@/types/index.ts';

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ drivers: 0, pendingClaims: 0, totalPayouts: 0 });
  const [recentClaims, setRecentClaims] = useState<ClaimWithDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.company_id) { setLoading(false); return; }
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          fetchManagerStats(profile.company_id!),
          fetchAllClaims({ company_id: profile.company_id! }),
        ]);
        setStats(s);
        setRecentClaims((c.data || []).slice(0, 5) as ClaimWithDriver[]);
      } catch (e) {
        console.error('[ManagerDashboard] Error:', e);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return <div className="page-content"><p className="text-sm text-muted">{error}</p></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Driver insurance overview</p>
        </div>
      </div>

      <div className="grid-stats">
        <StatCard label="Active Drivers" value={stats.drivers} icon={Users} iconColor="blue" />
        <StatCard label="Pending Claims" value={stats.pendingClaims} icon={FileText} iconColor="amber" />
        <StatCard label="Total Payouts" value={formatCurrency(stats.totalPayouts)} icon={Wallet} iconColor="green" />
      </div>

      {recentClaims.length > 0 && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Recent Claims</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Driver</th><th>Type</th><th>Amount</th><th>Status</th><th>Filed</th></tr>
              </thead>
              <tbody>
                {recentClaims.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.driver?.full_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {c.claim_type === 'natural_disaster' ? <CloudRain size={12} className="text-primary" /> : <Megaphone size={12} style={{ color: 'var(--aegis-warning)' }} />}
                        <span>{c.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike'}</span>
                      </div>
                    </td>
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
