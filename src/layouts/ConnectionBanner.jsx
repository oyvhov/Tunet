import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from '../icons';
import { useHomeAssistant, useModalActions } from '../contexts';

/** Format elapsed seconds into a human-readable string. */
function formatElapsed(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * ConnectionBanner — shows a warning when HA is unavailable or OAuth has expired.
 * Includes a live elapsed timer so users know how long the connection has been down,
 * and a manual retry button that reloads the page.
 */
export default function ConnectionBanner({ t, setConfigTab }) {
  const { haUnavailableVisible, oauthExpired, disconnectedSince } = useHomeAssistant();
  const { setShowConfigModal } = useModalActions();
  const [elapsed, setElapsed] = useState(0);

  // Tick every second while the banner is visible
  useEffect(() => {
    if (!haUnavailableVisible || !disconnectedSince) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - disconnectedSince) / 1000));
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - disconnectedSince) / 1000)),
      1000
    );
    return () => clearInterval(id);
  }, [haUnavailableVisible, disconnectedSince]);

  if (!haUnavailableVisible) return null;

  const handleReconnect = () => {
    setConfigTab?.('connection');
    setShowConfigModal(true);
  };

  const handleRetry = () => {
    globalThis.window.location.reload();
  };

  return (
    <div
      className={`popup-anim flex items-center gap-2 border ${oauthExpired ? 'mb-6 w-full rounded-2xl border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-4 text-[var(--status-warning-fg)] sm:px-6' : 'mb-2 w-fit rounded-full border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-[var(--text-secondary)] opacity-80 backdrop-blur-xl sm:mb-6 sm:w-full sm:gap-3 sm:rounded-2xl sm:border-[var(--status-warning-border)] sm:bg-[var(--status-warning-bg)] sm:px-6 sm:py-4 sm:text-[var(--status-warning-fg)] sm:opacity-100'}`}
      role="status"
      aria-live="polite"
    >
      <WifiOff
        className={`h-3.5 w-3.5 shrink-0 sm:h-5 sm:w-5 ${oauthExpired ? 'text-[var(--status-warning-fg)]' : 'text-[var(--text-secondary)] sm:text-[var(--status-warning-fg)]'}`}
      />
      <div className="min-w-0 flex-1 text-xs font-semibold sm:text-sm">
        {oauthExpired ? (
          <span>{t('system.oauth.expired')}</span>
        ) : (
          <>
            <span className="sm:hidden">{t('ha.reconnecting')}</span>
            <span className="hidden sm:inline">{t('ha.unavailable')}</span>
          </>
        )}
        {!oauthExpired && disconnectedSince && elapsed > 0 && (
          <span className="ml-2 hidden font-normal opacity-70 sm:inline">
            {t('ha.disconnectedFor').replace('{time}', formatElapsed(elapsed))}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!oauthExpired && (
          <button
            onClick={handleRetry}
            title={t('ha.retry')}
            className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-1 text-[var(--text-secondary)] transition-colors hover:opacity-90 sm:border-[var(--status-warning-border)] sm:bg-[var(--status-warning-bg)] sm:p-1.5 sm:text-[var(--status-warning-fg)]"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
        {oauthExpired && (
          <button
            onClick={handleReconnect}
            className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1.5 text-xs font-bold tracking-wider text-[var(--status-warning-fg)] uppercase transition-colors hover:opacity-90"
          >
            {t('system.oauth.loginButton')}
          </button>
        )}
      </div>
    </div>
  );
}
