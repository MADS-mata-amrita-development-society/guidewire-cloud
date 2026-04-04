import { useEffect, useState } from 'react';
import { useAuth } from '@/services/auth.tsx';
import { fetchDriverProfile, updateDriverTier, fetchWallet } from '@/services/api.ts';
import { Card } from '@/components/Card/Card.tsx';
import { Button } from '@/components/Button/Button.tsx';
import { Select } from '@/components/Input/Input.tsx';
import { TierBadge } from '@/components/Badge/Badge.tsx';
import { LoadingSpinner } from '@/components/LoadingSpinner/LoadingSpinner.tsx';
import { useToast } from '@/components/Toast/ToastProvider.tsx';
import { estimateMaxClaimAmount, formatCurrency } from '@/config/constants.ts';
import { Envelope, Phone, MapPin, Shield, FloppyDisk, SignOut } from '@phosphor-icons/react';
import type { InsuranceTier, DriverProfile as DriverProfileType } from '@/types/index.ts';

export function ProfilePage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const toast = useToast();
  const [driverProfile, setDriverProfile] = useState<DriverProfileType | null>(null);
  const [balance, setBalance] = useState(0);
  const [tier, setTier] = useState<InsuranceTier>('basic');
  const [originalTier, setOriginalTier] = useState<InsuranceTier>('basic');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [dp, w] = await Promise.all([
        fetchDriverProfile(user.id),
        fetchWallet(user.id),
      ]);
      if (dp.data) {
        setDriverProfile(dp.data);
        setTier(dp.data.tier as InsuranceTier);
        setOriginalTier(dp.data.tier as InsuranceTier);
      }
      setBalance(w.data?.balance ?? 0);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleTierUpdate = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await updateDriverTier(user.id, tier);
    setSaving(false);
    if (error) {
      toast.error('Failed to update tier. Please try again.');
    } else {
      setOriginalTier(tier);
      toast.success('Insurance tier updated successfully.');
      await refreshProfile();
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="profile-page">
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Profile</h1>
        </div>

        {/* Avatar & Name */}
        <div className="profile-hero">
          <div className="profile-avatar">{profile?.full_name?.charAt(0) || '?'}</div>
          <h2 className="profile-name">{profile?.full_name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TierBadge tier={originalTier} />
          </div>
        </div>

        {/* Info */}
        <Card className="profile-info-card">
          <div className="profile-info-row">
            <Envelope size={14} className="text-muted" />
            <div><span className="text-xs text-muted">Email</span><span className="profile-info-value">{profile?.email}</span></div>
          </div>
          {profile?.phone && (
            <div className="profile-info-row">
              <Phone size={14} className="text-muted" />
              <div><span className="text-xs text-muted">Phone</span><span className="profile-info-value">{profile.phone}</span></div>
            </div>
          )}
          {driverProfile?.zone && (
            <div className="profile-info-row">
              <MapPin size={14} className="text-muted" />
              <div><span className="text-xs text-muted">Zone</span><span className="profile-info-value">{driverProfile.zone}{driverProfile.city ? `, ${driverProfile.city}` : ''}</span></div>
            </div>
          )}
        </Card>

        {/* Tier */}
        <Card style={{ marginTop: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-3)' }}>
            <Shield size={16} className="text-primary" />
            <h3 style={{ fontSize: 'var(--text-sm)' }}>Insurance Tier</h3>
          </div>
          <Select
            label="Tier"
            value={tier}
            onChange={e => setTier(e.target.value as InsuranceTier)}
            options={[
              { value: 'basic', label: 'Basic — 50% coverage' },
              { value: 'standard', label: 'Standard — 75% coverage' },
              { value: 'premium', label: 'Premium — 100% coverage' },
            ]}
          />
          {tier !== originalTier && (
            <Button size="sm" icon={<FloppyDisk size={12} />} loading={saving} onClick={handleTierUpdate} style={{ marginTop: 'var(--space-3)' }}>
              Update Tier
            </Button>
          )}
        </Card>

        {/* Balance */}
        <Card style={{ marginTop: 'var(--space-3)' }}>
          <div className="profile-stat-row">
            <span className="text-sm text-muted">Wallet Balance</span>
            <span className="font-serif font-bold">{formatCurrency(balance)}</span>
          </div>
          <div className="profile-stat-row">
            <span className="text-sm text-muted">Weekly Premium</span>
            <span className="font-serif font-bold">{formatCurrency(driverProfile?.premium_amount || 0)}</span>
          </div>
          {driverProfile?.avg_weekly_earnings && driverProfile.avg_weekly_earnings > 0 && (
            <>
            <div className="profile-stat-row">
              <span className="text-sm text-muted">Avg Weekly Earnings</span>
              <span className="font-serif font-bold">{formatCurrency(driverProfile.avg_weekly_earnings)}</span>
            </div>
            <div className="profile-stat-row" style={{ borderBottom: 'none' }}>
              <span className="text-sm text-muted">Tier Max Claim (est.)</span>
              <span className="font-serif font-bold">{formatCurrency(estimateMaxClaimAmount(driverProfile.avg_weekly_earnings, tier))}</span>
            </div>
            </>
          )}
        </Card>

        {/* Sign Out */}
        <Button variant="secondary" fullWidth icon={<SignOut size={14} />} onClick={signOut} style={{ marginTop: 'var(--space-4)' }}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
