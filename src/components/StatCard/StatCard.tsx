import type { Icon as PhosphorIconType } from '@phosphor-icons/react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: PhosphorIconType;
  iconColor?: 'blue' | 'green' | 'amber' | 'red';
  change?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'blue',
  change,
  className = '',
}: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className={`stat-card-icon ${iconColor}`}>
        <Icon size={20} />
      </div>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
      {change && (
        <span className={`stat-card-change ${change.positive ? 'positive' : 'negative'}`}>
          {change.positive ? '↑' : '↓'} {change.value}
        </span>
      )}
    </div>
  );
}
