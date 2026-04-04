import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchCompanies, fetchAllClaims, fetchDrivers } from '@/services/api.ts';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Buildings } from '@phosphor-icons/react';

interface EnrichedCompany {
  id: string;
  name: string;
  contact_email: string;
  driverCount: number;
  activeClaims: number;
  totalPayouts: number;
}

export function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<EnrichedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [companyRes, driverRes, claimRes] = await Promise.all([
          fetchCompanies(),
          fetchDrivers(),
          fetchAllClaims(),
        ]);

        const companiesList = companyRes.data || [];
        const allDrivers = driverRes.data || [];
        const allClaims = claimRes.data || [];

        const driverCountMap = new Map<string, number>();
        for (const d of allDrivers) {
          const cid = d.company_id;
          if (cid) driverCountMap.set(cid, (driverCountMap.get(cid) || 0) + 1);
        }

        const activeClaimsMap = new Map<string, number>();
        const payoutsMap = new Map<string, number>();
        for (const c of allClaims) {
          const cid = c.company_id;
          if (!cid) continue;
          if (c.status === 'pending') {
            activeClaimsMap.set(cid, (activeClaimsMap.get(cid) || 0) + 1);
          }
          if (c.status === 'approved' && c.approved_amount) {
            payoutsMap.set(cid, (payoutsMap.get(cid) || 0) + c.approved_amount);
          }
        }

        const enriched: EnrichedCompany[] = companiesList.map((c: { id: string; name: string; contact_email: string }) => ({
          ...c,
          driverCount: driverCountMap.get(c.id) || 0,
          activeClaims: activeClaimsMap.get(c.id) || 0,
          totalPayouts: payoutsMap.get(c.id) || 0,
        }));

        setCompanies(enriched);
      } catch (e) {
        console.error('[CompaniesPage] Error:', e);
        setError('Failed to load companies data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

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
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">{companies.length} partner companies</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Company</th><th>Drivers</th><th>Pending Claims</th><th>Total Payouts</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'var(--aegis-100)', color: 'var(--aegis-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Buildings size={14} />
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </td>
                <td>{c.driverCount}</td>
                <td>
                  {c.activeClaims > 0 ? (
                    <span className="badge badge-warning badge-dot">{c.activeClaims}</span>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="font-serif">{formatCurrency(c.totalPayouts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
