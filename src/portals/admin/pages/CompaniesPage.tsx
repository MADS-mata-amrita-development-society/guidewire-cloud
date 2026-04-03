import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchCompanies, fetchAllClaims, fetchDrivers } from '@/services/api.ts';
import { Buildings , SignOut , CalendarBlank , CaretRight , MagnifyingGlass , House } from '@phosphor-icons/react';

export function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: companiesList } = await fetchCompanies();
      if (!companiesList) { setLoading(false); return; }

      // Get driver counts and claim counts per company
      const enriched = await Promise.all(
        companiesList.map(async (c: any) => {
          const [drivers, claims] = await Promise.all([
            fetchDrivers(c.id),
            fetchAllClaims({ company_id: c.id }),
          ]);
          const activeClaims = (claims.data || []).filter((cl: any) => cl.status === 'pending').length;
          const totalPayouts = (claims.data || []).filter((cl: any) => cl.status === 'approved').reduce((sum: number, cl: any) => sum + (cl.approved_amount || 0), 0);
          return { ...c, driverCount: (drivers.data || []).length, activeClaims, totalPayouts };
        })
      );

      setCompanies(enriched);
      setLoading(false);
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
            {companies.map((c: any) => (
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
                <td className="font-serif">₹{c.totalPayouts.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
