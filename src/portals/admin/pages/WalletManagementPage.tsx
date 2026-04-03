import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { supabase } from '@/config/supabase.ts';
import { adminTopUpWallet, fetchDrivers } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { Input, Select } from '@/components/Input/Input.tsx';
import { Modal } from '@/components/Modal/Modal.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Plus, MagnifyingGlass } from '@phosphor-icons/react';

export function WalletManagementPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpDriverId, setTopUpDriverId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    const [txRes, driverRes] = await Promise.all([
      supabase.from('wallet_transactions').select('*, wallet:wallets(user_id, user:users(full_name))').order('created_at', { ascending: false }).limit(50),
      fetchDrivers(),
    ]);
    setTransactions(txRes.data || []);
    setDrivers(driverRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const handleTopUp = async () => {
    if (!topUpDriverId || !topUpAmount) return;
    setProcessing(true);
    await adminTopUpWallet(topUpDriverId, Number(topUpAmount), topUpNote || 'Admin top-up');
    setProcessing(false);
    setShowTopUp(false);
    setTopUpDriverId('');
    setTopUpAmount('');
    setTopUpNote('');
    loadData();
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  // Compute pool totals
  const totalBalance = drivers.reduce((sum, d) => sum + (d.wallet?.[0]?.balance ?? 0), 0);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallets</h1>
          <p className="page-subtitle">Manage driver wallet balances</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setShowTopUp(true)}>Top Up</Button>
      </div>

      <div className="grid-stats" style={{ marginBottom: 'var(--space-4)' }}>
        <Card>
          <span className="text-xs text-muted" style={{ display: 'block', marginBottom: '2px' }}>Total Pool Balance</span>
          <span className="font-serif font-bold" style={{ fontSize: 'var(--text-xl)', color: 'var(--aegis-gray-900)' }}>{formatCurrency(totalBalance)}</span>
        </Card>
      </div>

      <h3 style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Recent Transactions</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Type</th><th>Driver</th><th>Description</th><th>Amount</th><th>Date</th></tr>
          </thead>
          <tbody>
            {transactions.map((tx: any) => (
              <tr key={tx.id}>
                <td>
                  <span className={`badge ${tx.type === 'credit' ? 'badge-success' : 'badge-danger'} badge-dot`}>
                    {tx.type === 'credit' ? 'Credit' : 'Debit'}
                  </span>
                </td>
                <td>{tx.wallet?.user?.full_name || '—'}</td>
                <td className="text-sm">{tx.description}</td>
                <td className={`font-serif font-medium ${tx.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
                <td className="text-muted">{new Date(tx.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showTopUp} onClose={() => setShowTopUp(false)} title="Top Up Wallet"
        footer={<><Button variant="secondary" onClick={() => setShowTopUp(false)}>Cancel</Button><Button onClick={handleTopUp} loading={processing} icon={<Plus size={12} />}>Confirm</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Select label="Driver" value={topUpDriverId} onChange={e => setTopUpDriverId(e.target.value)}
            options={[{ value: '', label: 'Select a driver...' }, ...drivers.map((d: any) => ({ value: d.id, label: d.full_name }))]} />
          <Input label="Amount (₹)" type="number" placeholder="Amount to credit" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
          <Input label="Note (optional)" placeholder="Reason for top-up" value={topUpNote} onChange={e => setTopUpNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
