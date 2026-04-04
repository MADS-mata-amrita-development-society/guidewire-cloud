import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchDrivers } from '@/services/api.ts';
import { TierBadge } from '@/components/Badge/Badge.tsx';
import { Input } from '@/components/Input/Input.tsx';
import { EmptyState } from '@/components/EmptyState/EmptyState.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Users, MagnifyingGlass } from '@phosphor-icons/react';
import type { DriverWithProfile } from '@/types/index.ts';

export function DriversListPage() {
  const { profile } = useAuth();
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!profile?.company_id) { setLoading(false); return; }
      const { data, error: err } = await fetchDrivers(profile.company_id);
      if (err) {
        setError('Failed to load drivers.');
        console.error('[DriversListPage] Error:', err);
      }
      setDrivers((data || []) as DriverWithProfile[]);
      setLoading(false);
    };
    load();
  }, [profile]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return <div className="page-content"><EmptyState icon={Users} title="Error" description={error} /></div>;
  }

  const filtered = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">{drivers.length} in your company</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)', maxWidth: '320px' }}>
        <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} icon={<MagnifyingGlass size={16} />} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No drivers found" description={search ? 'Try a different search term.' : 'No drivers registered with your company yet.'} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>Driver</th><th>Email</th><th>Zone</th><th>Tier</th><th>Premium</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.full_name}</td>
                  <td className="text-muted">{d.email}</td>
                  <td>{d.driver_profile?.zone || '—'}</td>
                  <td>{d.driver_profile?.tier ? <TierBadge tier={d.driver_profile.tier} /> : '—'}</td>
                  <td className="font-serif">{formatCurrency(d.driver_profile?.premium_amount ?? 0)}</td>
                  <td className="font-serif">{formatCurrency(d.wallet?.balance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
