/* ============================================
   AEGIS — TypeScript Type Definitions
   ============================================ */

// ── User Roles ──
export type UserRole = 'driver' | 'manager' | 'admin';

// ── Insurance Tiers ──
export type InsuranceTier = 'basic' | 'standard' | 'premium';

// ── Claim Types ──
export type ClaimType = 'natural_disaster' | 'strike_curfew';

// ── Claim Statuses ──
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

// ── Wallet Transaction Types ──
export type TransactionType = 'credit' | 'debit';

// ── Disruption Event Types ──
export type DisruptionEventType = 'flood' | 'heavy_rain' | 'strike' | 'curfew';

// ── Severity Levels ──
export type Severity = 'low' | 'moderate' | 'severe';

// ── Database Models ──

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  company_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  zone: string;
  city: string;
  avg_weekly_earnings: number;
  tier: InsuranceTier;
  premium_amount: number;
  tier_updated_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: TransactionType;
  description: string;
  related_claim_id: string | null;
  created_at: string;
}

export interface Claim {
  id: string;
  driver_id: string;
  company_id: string;
  claim_type: ClaimType;
  status: ClaimStatus;
  description: string;
  claimed_amount: number;
  approved_amount: number | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  filed_at: string;
  reviewed_at: string | null;
  evidence: ClaimEvidence | null;
  metadata: Record<string, unknown> | null;
}

export interface ClaimEvidence {
  photos?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
}

export interface DisruptionEvent {
  id: string;
  event_type: DisruptionEventType;
  city: string;
  zone: string;
  description: string;
  event_date: string;
  severity: Severity;
  is_active: boolean;
  created_at: string;
}

// ── Extended Types (with JOINs) ──

export interface ClaimWithDriver extends Claim {
  driver?: User;
  driver_profile?: DriverProfile;
  company?: Company;
  reviewer?: User;
}

export interface DriverWithProfile extends User {
  driver_profile?: DriverProfile;
  wallet?: Wallet;
  company?: Company;
}

export interface WalletTransactionWithClaim extends WalletTransaction {
  claim?: Claim;
}

// ── UI State Types ──

export type Portal = 'driver' | 'manager' | 'admin' | 'landing';

export interface AuthState {
  user: User | null;
  session: unknown;
  loading: boolean;
  error: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ── Tier Config ──

export const TIER_CONFIG: Record<InsuranceTier, {
  label: string;
  coverage: string;
  coveragePercent: number;
  color: string;
  bgColor: string;
}> = {
  basic: {
    label: 'Basic',
    coverage: 'Up to 50%',
    coveragePercent: 50,
    color: '#64748B',
    bgColor: '#F1F5F9',
  },
  standard: {
    label: 'Standard',
    coverage: 'Up to 75%',
    coveragePercent: 75,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  premium: {
    label: 'Premium',
    coverage: 'Up to 100%',
    coveragePercent: 100,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
};

export const CLAIM_TYPE_CONFIG: Record<ClaimType, {
  label: string;
  icon: string;
  description: string;
}> = {
  natural_disaster: {
    label: 'Natural Disaster',
    icon: 'cloud-rain',
    description: 'Heavy rain, flooding, or other natural events',
  },
  strike_curfew: {
    label: 'Strike / Curfew',
    icon: 'megaphone',
    description: 'Political strikes, curfews, or civil disruptions',
  },
};

export const CLAIM_STATUS_CONFIG: Record<ClaimStatus, {
  label: string;
  badgeClass: string;
}> = {
  pending: {
    label: 'Pending Review',
    badgeClass: 'badge-warning',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'badge-success',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'badge-danger',
  },
};
