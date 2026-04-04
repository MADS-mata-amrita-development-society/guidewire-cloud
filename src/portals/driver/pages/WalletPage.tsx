import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchWallet, fetchWalletTransactions } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { EmptyState } from '@/components/EmptyState/EmptyState.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { ArrowCircleUp, ArrowCircleDown, Wallet as WalletIcon, Receipt } from '@phosphor-icons/react';
import type { WalletTransaction } from '@/types/index.ts';

export function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: wallet } = await fetchWallet(user.id);
        if (wallet) {
          setBalance(wallet.balance);
          const { data: txs } = await fetchWalletTransactions(wallet.id);
          setTransactions(txs || []);
        }
      } catch (e) {
        console.error('[WalletPage] Error:', e);
        setError('Failed to load wallet data.');
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
    return (
      <div className="wallet-page">
        <div className="page-content">
          <EmptyState icon={Receipt} title="Error" description={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <div className="page-content">
        <Card className="wallet-balance-card">
          <div className="wallet-balance-icon"><WalletIcon size={20} /></div>
          <p className="text-sm text-muted" style={{ marginBottom: '2px' }}>Available Balance</p>
          <p className="wallet-balance-amount font-serif">{formatCurrency(balance)}</p>
        </Card>

        <div className="section-header" style={{ marginTop: 'var(--space-5)' }}>
          <h2 className="section-title">Transactions</h2>
        </div>

        {transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions" description="Your wallet transactions will appear here." />
        ) : (
          <div className="transactions-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-item">
                <div className={`transaction-icon ${tx.type}`}>
                  {tx.type === 'credit' ? <ArrowCircleDown size={18} /> : <ArrowCircleUp size={18} />}
                </div>
                <div className="transaction-info">
                  <span className="transaction-desc">{tx.description}</span>
                  <span className="text-xs text-muted">{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`transaction-amount font-serif font-semibold ${tx.type}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
