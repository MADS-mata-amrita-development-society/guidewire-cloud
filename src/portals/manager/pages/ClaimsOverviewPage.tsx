import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchAllClaims } from '@/services/api.ts';
import { StatusBadge } from '@/components/Badge/Badge.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { CloudRain, Megaphone } from '@phosphor-icons/react';

export function ClaimsOverviewPage() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) { setLoading(false); return; }
    fetchAllClaims({ company_id: profile.company_id }).then(({ data }) => {
      setClaims(data || []);
      setLoading(false);
    });
  }, [profile]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claims</h1>
          <p className="page-subtitle">{claims.length} total claims</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Driver</th><th>Type</th><th>Amount</th><th>Status</th><th>Filed</th></tr>
          </thead>
          <tbody>
            {claims.map((c: any) => (
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
  );
}
