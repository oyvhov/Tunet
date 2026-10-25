import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface CardErrorBoundaryProps {
  cardId?: string;
  t?: (key: string) => string;
  children?: ReactNode;
}

interface CardErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/**
 * Error boundary that wraps individual dashboard cards.
 * Prevents a single card crash from taking down the whole dashboard.
 */
export default class CardErrorBoundary extends Component<
  CardErrorBoundaryProps,
  CardErrorBoundaryState
> {
  constructor(props: CardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`Card crashed [${this.props.cardId}]:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { t, cardId } = this.props;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-center">
          <div className="text-xs font-bold tracking-widest text-[var(--status-error-fg)] uppercase">
            {t?.('error.cardCrash') || 'Card Error'}
          </div>
          <div className="max-w-full truncate font-mono text-[10px] text-[var(--text-muted)]">
            {cardId}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-1 text-[10px] font-bold tracking-wider text-[var(--status-error-fg)] uppercase transition-colors hover:opacity-90"
          >
            {t?.('error.retry') || 'Retry'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
