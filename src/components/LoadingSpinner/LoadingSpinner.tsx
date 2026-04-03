interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';

  if (fullScreen) {
    return (
      <div className="loading-screen">
        <div className={`spinner ${sizeClass}`} />
        {text && <span className="loading-screen-text">{text}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div className={`spinner ${sizeClass}`} />
      {text && <span className="text-sm text-muted">{text}</span>}
    </div>
  );
}
