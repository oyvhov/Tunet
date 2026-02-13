import { AlertTriangle } from '../icons';

/**
 * ConnectionBanner — shows a warning when HA is unavailable or OAuth has expired.
 */
export default function ConnectionBanner({ oauthExpired, onReconnect, t }) {
  return (
    <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 px-4 sm:px-6 py-4 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-yellow-300" />
      <div className="text-sm font-semibold">
        {oauthExpired ? t('system.oauth.expired') : t('ha.unavailable')}
      </div>
      {oauthExpired && (
        <button
          onClick={onReconnect}
          className="ml-auto px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-xs font-bold uppercase tracking-wider transition-colors border border-yellow-500/30"
        >
          {t('system.oauth.loginButton')}
        </button>
      )}
    </div>
  );
}
