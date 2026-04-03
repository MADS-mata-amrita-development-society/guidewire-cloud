import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchDrivers } from '@/services/api.ts';
import { TierBadge } from '@/components/Badge/Badge.tsx';
import { Input } from '@/components/Input/Input.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { MagnifyingGlass , House } from '@phosphor-icons/react';

export function DriversPage() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDrivers().then(({ data }) => {
      setDrivers(data || []);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
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
          <p className="page-subtitle">{drivers.length} registered</p>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)', maxWidth: '320px' }}>
        <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} icon={<MagnifyingGlass size={16} />} />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Driver</th><th>Email</th><th>Zone</th><th>Tier</th><th>Balance</th></tr>
          </thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(180deg, #8DBDFF, #6AA1F5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                      {d.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium">{d.full_name}</span>
                  </div>
                </td>
                <td className="text-muted">{d.email}</td>
                <td>{d.driver_profile?.zone || '—'}</td>
                <td>{d.driver_profile?.tier ? <TierBadge tier={d.driver_profile.tier} /> : '—'}</td>
                <td className="font-serif">{formatCurrency(d.wallet?.[0]?.balance ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
