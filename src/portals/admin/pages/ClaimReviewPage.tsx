import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchPendingClaims, approveClaim, rejectClaim } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { Input, Textarea } from '@/components/Input/Input.tsx';
import { Modal } from '@/components/Modal/Modal.tsx';
import { StatusBadge, TierBadge } from '@/components/Badge/Badge.tsx';
import { formatCurrency } from '@/config/constants.ts';
import { Check, X, CloudRain, Megaphone, CalendarBlank } from '@phosphor-icons/react';
import type { Claim } from '@/types/index.ts';

export function ClaimReviewPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchPendingClaims();
      if (error) console.error('[ClaimReview] fetchPendingClaims error:', error);
      setClaims(data || []);
    } catch (e) {
      console.error('[ClaimReview] Unexpected error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadClaims();
  }, [user]);

  const handleApprove = async () => {
    if (!selected || !user) return;
    setProcessing(true);
    try {
      const { error } = await approveClaim(selected.id, Number(approveAmount), user.id);
      if (error) console.error('[ClaimReview] approveClaim error:', error);
    } finally {
      setProcessing(false);
      setShowApprove(false);
      setSelected(null);
      loadClaims();
    }
  };

  const handleReject = async () => {
    if (!selected || !user) return;
    setProcessing(true);
    try {
      const { error } = await rejectClaim(selected.id, rejectReason, user.id);
      if (error) console.error('[ClaimReview] rejectClaim error:', error);
    } finally {
      setProcessing(false);
      setShowReject(false);
      setSelected(null);
      loadClaims();
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Claim Review</h1>
          <p className="page-subtitle">{claims.length} pending</p>
        </div>
      </div>

      {claims.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Check size={36} style={{ color: 'var(--aegis-success)', margin: '0 auto var(--space-3)' }} />
          <h3 style={{ fontSize: 'var(--text-base)' }}>All caught up</h3>
          <p className="text-sm text-muted">No pending claims to review.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {claims.map((claim: any) => (
            <Card key={claim.id} className="claim-review-card">
              <div className="claim-review-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <StatusBadge status="pending" />
                  <span className="text-xs text-muted">
                    <CalendarBlank size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                    {new Date(claim.filed_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="claim-review-driver">
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--aegis-100)', color: 'var(--aegis-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                  {claim.driver?.full_name?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--aegis-gray-900)' }}>{claim.driver?.full_name}</div>
                  <div className="text-xs text-muted">{claim.location_text || 'No location'}</div>
                </div>
                {claim.driver_profile?.tier && <TierBadge tier={claim.driver_profile.tier} />}
              </div>

              <div className="claim-review-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  {claim.claim_type === 'natural_disaster' ? <CloudRain size={14} className="text-primary" /> : <Megaphone size={14} style={{ color: 'var(--aegis-warning)' }} />}
                  <span className="text-sm font-medium">{claim.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike / Curfew'}</span>
                </div>
                {claim.description && <p className="text-sm" style={{ color: 'var(--aegis-gray-600)', margin: 0 }}>{claim.description}</p>}
              </div>

              <div className="claim-review-footer">
                <div>
                  <span className="text-xs text-muted">Claimed</span>
                  <div className="font-serif font-bold" style={{ fontSize: 'var(--text-lg)', color: 'var(--aegis-gray-900)' }}>{formatCurrency(claim.claimed_amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="danger" size="sm" icon={<X size={12} />} onClick={() => { setSelected(claim); setRejectReason(''); setShowReject(true); }}>Reject</Button>
                  <Button variant="success" size="sm" icon={<Check size={12} />} onClick={() => { setSelected(claim); setApproveAmount(String(claim.claimed_amount)); setShowApprove(true); }}>Approve</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="Approve Claim"
        footer={<><Button variant="secondary" onClick={() => setShowApprove(false)}>Cancel</Button><Button variant="success" onClick={handleApprove} loading={processing} icon={<Check size={12} />}>Confirm Approval</Button></>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p className="text-sm text-muted">Approve claim by <strong>{selected.driver?.full_name}</strong>. Amount will be credited to their wallet.</p>
            <Input label="Approved Amount (₹)" type="number" value={approveAmount} onChange={e => setApproveAmount(e.target.value)} helper={`Claimed: ${formatCurrency(selected.claimed_amount)}`} required />
          </div>
        )}
      </Modal>

      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Reject Claim"
        footer={<><Button variant="secondary" onClick={() => setShowReject(false)}>Cancel</Button><Button variant="danger" onClick={handleReject} loading={processing} disabled={!rejectReason.trim()} icon={<X size={12} />}>Confirm Rejection</Button></>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p className="text-sm text-muted">Rejecting claim by <strong>{selected.driver?.full_name}</strong>.</p>
            <Textarea label="Reason" placeholder="Why is this claim being rejected?" value={rejectReason} onChange={e => setRejectReason(e.target.value)} required rows={3} />
          </div>
        )}
      </Modal>
    </div>
  );
}
