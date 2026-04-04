import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth.tsx';
import { fetchDriverClaims, fetchWallet, fetchDriverProfile, fetchActiveDisruptions } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { StatusBadge, TierBadge } from '@/components/Badge/Badge.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { estimateMaxClaimAmount, formatCurrency, getTierCoveragePercent } from '@/config/constants.ts';
import { ShieldCheck, Wallet, Plus, Warning, CaretRight, CloudRain, Megaphone } from '@phosphor-icons/react';
import type { Claim, DriverProfile as DriverProfileType, DisruptionEvent } from '@/types/index.ts';
import './DashboardPage.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [walletBalance, setWalletBalance] = useState(0);
  const [driverProfile, setDriverProfile] = useState<DriverProfileType | null>(null);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [walletRes, profileRes, claimsRes, disruptRes] = await Promise.all([
          fetchWallet(user.id),
          fetchDriverProfile(user.id),
          fetchDriverClaims(user.id),
          fetchActiveDisruptions(),
        ]);
        if (walletRes.error || profileRes.error || claimsRes.error || disruptRes.error) {
          console.error('[Dashboard] Data fetch errors:', { wallet: walletRes.error, profile: profileRes.error, claims: claimsRes.error, disruptions: disruptRes.error });
        }
        setWalletBalance(walletRes.data?.balance ?? 0);
        setDriverProfile(profileRes.data);
        setRecentClaims((claimsRes.data || []).slice(0, 3));
        setDisruptions(disruptRes.data || []);
      } catch (e) {
        console.error('[Dashboard] Unexpected error:', e);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return (
      <div className="loading-screen">
        <p className="loading-screen-text">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const tier = driverProfile?.tier || 'basic';
  const coveragePercent = getTierCoveragePercent(tier);
  const premiumAmount = driverProfile?.premium_amount ?? 0;
  const maxClaimAmount = estimateMaxClaimAmount(driverProfile?.avg_weekly_earnings ?? 0, tier);

  return (
    <div className="driver-dashboard">
      <div className="driver-topbar">
        <div>
          <p className="driver-greeting text-sm text-muted">{greeting()},</p>
          <h1 className="driver-name">{profile?.full_name || 'Driver'}</h1>
        </div>
      </div>

      <div className="driver-dashboard-content page-content">
        {/* Disruption alert */}
        {disruptions.length > 0 && (
          <div className="disruption-alert">
            <Warning size={16} />
            <div>
              <strong>Active disruption</strong>
              <span>{disruptions[0].description} in {disruptions[0].zone}</span>
            </div>
            <Button size="sm" onClick={() => navigate('/file-claim')}>File Claim</Button>
          </div>
        )}

        {/* Wallet */}
        <Card className="wallet-card" interactive onClick={() => navigate('/wallet')}>
          <div className="wallet-card-top">
            <div className="wallet-card-icon"><Wallet size={16} /></div>
            <CaretRight size={16} className="text-muted" />
          </div>
          <p className="wallet-label text-sm text-muted">Wallet Balance</p>
          <p className="wallet-amount font-serif">{formatCurrency(walletBalance)}</p>
        </Card>

        {/* Policy */}
        <Card className="policy-card">
          <div className="policy-card-header">
            <div className="policy-card-icon"><ShieldCheck size={16} /></div>
            <TierBadge tier={tier} />
          </div>
          <h3 className="policy-title">Active Policy</h3>
          <p className="policy-coverage text-sm text-muted">
            Covers up to {coveragePercent}% of average earnings
          </p>
          <p className="policy-coverage text-sm text-muted">Weekly premium: {formatCurrency(premiumAmount)}</p>
          <p className="policy-coverage text-sm text-muted">Estimated max claim: {formatCurrency(maxClaimAmount)}</p>
        </Card>

        {/* File Claim CTA */}
        <Button fullWidth size="lg" icon={<Plus size={18} />} onClick={() => navigate('/file-claim')} className="file-claim-cta">
          File a New Claim
        </Button>

        {/* Recent Claims */}
        {recentClaims.length > 0 && (
          <>
            <div className="section-header">
              <h2 className="section-title">Recent Claims</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/claims')}>View All</button>
            </div>
            <div className="claims-list">
              {recentClaims.map((claim) => (
                <Card key={claim.id} className="claim-item" hover>
                  <div className="claim-item-icon">
                    {claim.claim_type === 'natural_disaster' ? <CloudRain size={16} /> : <Megaphone size={16} />}
                  </div>
                  <div className="claim-item-info">
                    <span className="claim-item-type">
                      {claim.claim_type === 'natural_disaster' ? 'Natural Disaster' : 'Strike / Curfew'}
                    </span>
                    <span className="text-xs text-muted">{new Date(claim.filed_at).toLocaleDateString()}</span>
                  </div>
                  <div className="claim-item-right">
                    <span className="claim-item-amount font-serif font-semibold">{formatCurrency(claim.claimed_amount)}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
