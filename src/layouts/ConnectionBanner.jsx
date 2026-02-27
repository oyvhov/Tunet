import { AlertTriangle } from '../icons';
import { useHomeAssistant, useModalState } from '../contexts';

/**
 * ConnectionBanner — shows a warning when HA is unavailable or OAuth has expired.
 */
export default function ConnectionBanner({ t }) {
  const { haUnavailableVisible, oauthExpired } = useHomeAssistant();
  const { setShowConfigModal, setConfigTab } = useModalState();

  if (!haUnavailableVisible) return null;

  const handleReconnect = () => {
    setShowConfigModal(true);
    setConfigTab('connection');
  };

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-yellow-100 sm:px-6">
      <AlertTriangle className="h-5 w-5 text-yellow-300" />
      <div className="text-sm font-semibold">
        {oauthExpired ? t('system.oauth.expired') : t('ha.unavailable')}
      </div>
      {oauthExpired && (
        <button
          onClick={handleReconnect}
          className="ml-auto rounded-lg border border-yellow-500/30 bg-yellow-500/20 px-3 py-1.5 text-xs font-bold tracking-wider text-yellow-200 uppercase transition-colors hover:bg-yellow-500/30"
        >
          {t('system.oauth.loginButton')}
        </button>
      )}
    </div>
  );
}
