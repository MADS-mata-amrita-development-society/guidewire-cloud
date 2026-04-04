import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/Button/Button.tsx';
import { Warning } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="loading-screen" style={{ flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Warning size={32} style={{ color: 'var(--aegis-warning)' }} />
          <h2 style={{ fontSize: 'var(--text-lg)', color: 'var(--aegis-gray-900)' }}>Something went wrong</h2>
          <p className="text-sm text-muted" style={{ maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <Button onClick={this.handleReset}>Try Again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
