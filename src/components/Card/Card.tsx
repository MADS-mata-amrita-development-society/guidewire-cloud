import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'flat' | 'highlight';
  hover?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  children,
  variant = 'default',
  hover = false,
  interactive = false,
  className = '',
  onClick,
  style,
}: CardProps) {
  const variantClass = variant === 'flat' ? 'card-flat' : variant === 'highlight' ? 'card-highlight' : '';
  const hoverClass = hover ? 'card-hover' : '';
  const interactiveClass = interactive ? 'card-interactive' : '';

  return (
    <div
      className={`card ${variantClass} ${hoverClass} ${interactiveClass} ${className}`.trim()}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
