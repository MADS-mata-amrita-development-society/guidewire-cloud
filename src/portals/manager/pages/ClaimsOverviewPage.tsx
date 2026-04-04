import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchAllClaims } from '@/services/api.ts';
import { StatusBadge } from '@/components/Badge/Badge.tsx';
import { EmptyState } from '@/components/EmptyState/EmptyState.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { CloudRain, Megaphone, FileText } from '@phosphor-icons/react';
import type { ClaimWithDriver, ClaimStatus } from '@/types/index.ts';

export function ClaimsOverviewPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<ClaimWithDriver[]>([]);
  const [filter, setFilter] = useState<'all' | ClaimStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!profile?.company_id) { setLoading(false); return; }
      const { data, error: err } = await fetchAllClaims({ company_id: profile.company_id });
      if (err) {
        setError('Failed to load claims.');
        console.error('[ClaimsOverviewPage] Error:', err);
      }
      setClaims((data || []) as ClaimWithDriver[]);
      setLoading(false);
    };
    load();
  }, [profile]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return <div className="page-content"><EmptyState icon={FileText} title="Error" description={error} /></div>;
  }

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claims</h1>
          <p className="page-subtitle">{claims.length} total claims from your company</p>
        </div>
      </div>

      <div className="filter-pills" style={{ marginBottom: 'var(--space-3)' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No claims found" description={`No ${filter === 'all' ? '' : filter} claims to show.`} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Driver</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {c.claim_type === 'natural_disaster' ? <CloudRain size={12} className="text-primary" /> : <Megaphone size={12} style={{ color: 'var(--aegis-warning)' }} />}
                      <span>{c.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike'}</span>
                    </div>
                  </td>
                  <td className="font-medium">{c.driver?.full_name || '—'}</td>
                  <td className="font-serif">{formatCurrency(c.claimed_amount)}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-muted">{new Date(c.filed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
