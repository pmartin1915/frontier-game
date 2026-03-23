import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { colors, typography } from '@/ui/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>Something went wrong</h1>
            <p style={styles.message}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button style={styles.button} onClick={this.handleReload}>
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.text,
  },
  card: {
    background: colors.card,
    borderRadius: '8px',
    padding: '32px 40px',
    maxWidth: '420px',
    textAlign: 'center',
    fontFamily: typography.fontFamily,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: '20px',
    color: colors.warning,
    margin: '0 0 12px',
  },
  message: {
    fontSize: '14px',
    color: colors.textBody,
    margin: '0 0 24px',
    lineHeight: '1.5',
  },
  button: {
    background: colors.primary,
    color: colors.base,
    border: 'none',
    borderRadius: '4px',
    padding: '10px 24px',
    fontSize: '14px',
    fontFamily: typography.fontFamily,
    cursor: 'pointer',
  },
};
