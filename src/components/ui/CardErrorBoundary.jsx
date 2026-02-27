import { Component } from 'react';

/**
 * Error boundary that wraps individual dashboard cards.
 * Prevents a single card crash from taking down the whole dashboard.
 */
export default class CardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`Card crashed [${this.props.cardId}]:`, error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { t, cardId } = this.props;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <div className="text-xs font-bold tracking-widest text-red-400 uppercase">
            {t?.('error.cardCrash') || 'Card Error'}
          </div>
          <div className="max-w-full truncate font-mono text-[10px] text-[var(--text-muted)]">
            {cardId}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-red-400 uppercase transition-colors hover:bg-red-500/20"
          >
            {t?.('error.retry') || 'Retry'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
