import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchAllClaims, fetchDrivers } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [claimsByMonth, setClaimsByMonth] = useState<any[]>([]);
  const [tierDist, setTierDist] = useState<any[]>([]);
  const [payoutsByMonth, setPayoutsByMonth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) { setLoading(false); return; }
    const load = async () => {
      const [claimsRes, driversRes] = await Promise.all([
        fetchAllClaims({ company_id: profile.company_id! }),
        fetchDrivers(profile.company_id!),
      ]);
      const claims = claimsRes.data || [];
      const drivers = driversRes.data || [];

      // Claims by month
      const monthMap: Record<string, number> = {};
      const payoutMap: Record<string, number> = {};
      claims.forEach((c: any) => {
        const d = new Date(c.filed_at);
        const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthMap[key] = (monthMap[key] || 0) + 1;
        if (c.status === 'approved' && c.approved_amount) {
          payoutMap[key] = (payoutMap[key] || 0) + c.approved_amount;
        }
      });
      setClaimsByMonth(Object.entries(monthMap).map(([month, count]) => ({ month, claims: count })));
      setPayoutsByMonth(Object.entries(payoutMap).map(([month, amount]) => ({ month, amount })));

      // Tier distribution
      const tiers: Record<string, number> = { basic: 0, standard: 0, premium: 0 };
      drivers.forEach((d: any) => {
        const t = d.driver_profile?.tier || 'basic';
        tiers[t] = (tiers[t] || 0) + 1;
      });
      setTierDist([
        { name: 'Basic', value: tiers.basic, color: '#94A3B8' },
        { name: 'Standard', value: tiers.standard, color: '#6AA1F5' },
        { name: 'Premium', value: tiers.premium, color: '#7C3AED' },
      ]);

      setLoading(false);
    };
    load();
  }, [profile]);

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  const tooltipStyle = { borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,.06)', fontSize: '13px' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Insurance metrics and trends</p>
        </div>
      </div>

      <div className="grid-2">
        <Card>
          <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>Claims by Month</h3>
          {claimsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={claimsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" fontSize={11} stroke="#9CA3AF" />
                <YAxis fontSize={11} stroke="#9CA3AF" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="claims" fill="#6AA1F5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">No claim data yet.</p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>Tier Distribution</h3>
          {tierDist.some(t => t.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tierDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {tierDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                {tierDist.map(t => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />
                    <span>{t.name} ({t.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No drivers yet.</p>
          )}
        </Card>

        <Card style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>Monthly Payouts</h3>
          {payoutsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={payoutsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" fontSize={11} stroke="#9CA3AF" />
                <YAxis fontSize={11} stroke="#9CA3AF" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [formatCurrency(Number(value)), 'Payout']} />
                <Line type="monotone" dataKey="amount" stroke="#6AA1F5" strokeWidth={2} dot={{ r: 3, fill: '#6AA1F5' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">No payout data yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
