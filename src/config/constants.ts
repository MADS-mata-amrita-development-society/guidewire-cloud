import type { Portal } from '@/types/index.ts';

/**
 * Determines which portal to render based on the hostname.
 * 
 * In development:
 *   - driver.localhost:5173 → driver
 *   - manager.localhost:5173 → manager
 *   - admin.localhost:5173 → admin
 *   - localhost:5173 → landing
 * 
 * In production:
 *   - driver.aegis.com → driver
 *   - manager.aegis.com → manager
 *   - admin.aegis.com → admin
 *   - aegis.com → landing
 */
export function getPortalFromHostname(): Portal {
  const hostname = window.location.hostname.toLowerCase();

  if (hostname.startsWith('driver.') || hostname.startsWith('driver-')) {
    return 'driver';
  }
  if (hostname.startsWith('manager.') || hostname.startsWith('manager-')) {
    return 'manager';
  }
  if (hostname.startsWith('admin.') || hostname.startsWith('admin-')) {
    return 'admin';
  }

  return 'landing';
}

/**
 * App-wide constants
 */
export const APP_NAME = 'Aegis';
export const APP_TAGLINE = 'AI-Powered Income Insurance for Gig Workers';

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCurrencyFull(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTierCoveragePercent(tier: string): number {
  if (tier === 'premium') return 100;
  if (tier === 'standard') return 75;
  return 50;
}

export function estimateMaxClaimAmount(avgWeeklyEarnings: number, tier: string): number {
  const coverage = getTierCoveragePercent(tier) / 100;
  const baseline = avgWeeklyEarnings > 0 ? avgWeeklyEarnings : 3000;
  return Math.max(Math.round(baseline * coverage), 500);
}
