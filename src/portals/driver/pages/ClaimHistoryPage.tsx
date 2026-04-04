import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchDriverClaims } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { StatusBadge } from '@/components/Badge/Badge.tsx';
import { EmptyState } from '@/components/EmptyState/EmptyState.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { CloudRain, Megaphone, FileText } from '@phosphor-icons/react';
import type { Claim } from '@/types/index.ts';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function ClaimHistoryPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDriverClaims(user.id).then(({ data, error: err }) => {
      if (err) {
        setError('Failed to load claims.');
        console.error('[ClaimHistory] Error:', err);
      }
      setClaims(data || []);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load claims.');
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return <EmptyState icon={FileText} title="Error" description={error} />;
  }

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  return (
    <div className="claim-history-page">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Claims</h1>
            <p className="page-subtitle">{claims.length} total claims</p>
          </div>
        </div>

        <div className="filter-pills">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No claims found" description={`No ${filter === 'all' ? '' : filter} claims.`} />
        ) : (
          <div className="claims-list">
            {filtered.map((claim) => (
              <Card key={claim.id} className="claim-history-item" hover onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)}>
                <div className="claim-history-row">
                  <div className="claim-item-icon">
                    {claim.claim_type === 'natural_disaster' ? <CloudRain size={16} /> : <Megaphone size={16} />}
                  </div>
                  <div className="claim-item-info">
                    <span className="claim-item-type">{claim.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike / Curfew'}</span>
                    <span className="text-xs text-muted">{new Date(claim.filed_at).toLocaleDateString()}</span>
                  </div>
                  <div className="claim-item-right">
                    <span className="claim-item-amount font-serif font-semibold">{formatCurrency(claim.claimed_amount)}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                </div>

                {expandedId === claim.id && (
                  <div className="claim-expanded">
                    {claim.description && <p className="claim-description">{claim.description}</p>}
                    {claim.location_text && (
                      <div className="claim-detail-row">
                        <span className="text-sm text-muted">Location</span>
                        <span className="text-sm font-medium">{claim.location_text}</span>
                      </div>
                    )}
                    {claim.status === 'approved' && claim.approved_amount != null && (
                      <div className="claim-detail-row">
                        <span className="text-sm text-muted">Approved Amount</span>
                        <span className="font-serif font-bold text-success">{formatCurrency(claim.approved_amount)}</span>
                      </div>
                    )}
                    {claim.status === 'rejected' && claim.rejection_reason && (
                      <div className="claim-rejection">
                        <strong className="text-sm">Rejection Reason</strong>
                        <p className="text-sm text-muted">{claim.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
