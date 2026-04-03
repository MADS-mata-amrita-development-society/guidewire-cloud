import type { ClaimStatus, InsuranceTier } from '@/types/index.ts';
import { CLAIM_STATUS_CONFIG, TIER_CONFIG } from '@/types/index.ts';

interface StatusBadgeProps {
  status: ClaimStatus;
  dot?: boolean;
}

export function StatusBadge({ status, dot = true }: StatusBadgeProps) {
  const config = CLAIM_STATUS_CONFIG[status];
  return (
    <span className={`badge ${config.badgeClass} ${dot ? 'badge-dot' : ''}`}>
      {config.label}
    </span>
  );
}

interface TierBadgeProps {
  tier: InsuranceTier;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className="badge"
      style={{ background: config.bgColor, color: config.color }}
    >
      {config.label}
    </span>
  );
}
