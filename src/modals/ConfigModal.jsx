import { useEffect, useState } from 'react';
import ModernDropdown from '../components/ui/ModernDropdown';
import M3Slider from '../components/ui/M3Slider';
import { GRADIENT_PRESETS } from '../contexts/ConfigContext';
import { hasOAuthTokens } from '../services/oauthStorage';
import { getMaxGridColumnsForWidth, MAX_GRID_COLUMNS, MIN_GRID_COLUMNS } from '../hooks/useResponsiveGrid';
import {
  X,
  Check,
  Home,
  Wifi,
  Settings,
  AlertCircle,
  Lock,
  Server,
  RefreshCw,
  Globe,
  Palette,
  Monitor,
  Sparkles,
  Download,
  ArrowRight,
  LayoutGrid,
  Columns,
  Sun,
  Moon,
  Link,
  ChevronDown,
  ChevronUp,
  Eye,
  LogIn,
  LogOut,
  Key,
  UserCircle2,
  Save,
  Trash2,
  Edit2,
} from '../icons';

export default function ConfigModal({
  open,
  isOnboardingActive,
  t,
  configTab,
  setConfigTab,
  onboardingSteps,
  onboardingStep,
  setOnboardingStep,
  canAdvanceOnboarding,
  connected,
  activeUrl,
  config,
  setConfig,
  onboardingUrlError,
  setOnboardingUrlError,
  onboardingTokenError,
  setOnboardingTokenError,
  setConnectionTestResult,
  connectionTestResult,
  validateUrl,
  testConnection,
  testingConnection,
  startOAuthLogin,
  handleOAuthLogout,
  themes,
  currentTheme,
  setCurrentTheme,
  language,
  setLanguage,
  inactivityTimeout,
  setInactivityTimeout,
  gridGapH,
  setGridGapH,
  gridGapV,
  setGridGapV,
  gridColumns,
  setGridColumns,
  dynamicGridColumns,
  setDynamicGridColumns,
  cardBorderRadius,
  setCardBorderRadius,
  bgMode,
  setBgMode,
  bgColor,
  setBgColor,
  bgGradient,
  setBgGradient,
  bgImage,
  setBgImage,
  cardTransparency,
  setCardTransparency,
  cardBorderOpacity,
  setCardBorderOpacity,
  sectionSpacing,
  updateSectionSpacing,
  entities,
  getEntityImageUrl,
  callService,
  onClose,
  onFinishOnboarding,
  // Profiles & templates
  profiles,
}) {
  const [installingIds, setInstallingIds] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [layoutPreview, setLayoutPreview] = useState(false);
  const [maxGridColumns, setMaxGridColumns] = useState(() => {
    if (typeof window === 'undefined') return MAX_GRID_COLUMNS;
    return getMaxGridColumnsForWidth(window.innerWidth);
  });
  const selectableMaxGridColumns = dynamicGridColumns ? Math.min(maxGridColumns, 4) : maxGridColumns;

  const effectiveGridColumns = Math.max(MIN_GRID_COLUMNS, Math.min(gridColumns, selectableMaxGridColumns));

  const isLayoutPreview = configTab === 'layout' && layoutPreview;

  useEffect(() => {
    if (configTab !== 'layout' && layoutPreview) {
      setLayoutPreview(false);
    }
  }, [configTab, layoutPreview]);

  useEffect(() => {
    if (layoutPreview && configTab !== 'layout') {
      setConfigTab('layout');
    }
  }, [layoutPreview, configTab, setConfigTab]);

  useEffect(() => {
    const update = () => setMaxGridColumns(getMaxGridColumnsForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleClose = () => {
    if (!isOnboardingActive) onClose?.();
  };

  const TABS = [
    { key: 'connection', icon: Wifi, label: t('system.tabConnection') },
    // Appearance and Layout have been moved to Sidebars
    // { key: 'appearance', icon: Palette, label: t('system.tabAppearance') },
    // { key: 'layout', icon: LayoutGrid, label: t('system.tabLayout') },
    { key: 'profiles', icon: UserCircle2, label: t('system.tabProfiles') },
    { key: 'updates', icon: Download, label: t('updates.title') },
  ];

  useEffect(() => {
    const supportedTabs = new Set(['connection', 'profiles', 'updates']);
    if (!isLayoutPreview && !supportedTabs.has(configTab)) {
      setConfigTab('connection');
    }
  }, [configTab, isLayoutPreview, setConfigTab]);

  const availableTabs = isLayoutPreview
    ? [{ key: 'layout', icon: LayoutGrid, label: t('system.tabLayout') }]
    : TABS;

  const handleInstallUpdate = (entityId) => {
    setInstallingIds(prev => ({ ...prev, [entityId]: true }));
    if (callService) {
      callService('update', 'install', { entity_id: entityId });
    }
    setTimeout(() => {
      setInstallingIds(prev => ({ ...prev, [entityId]: false }));
    }, 30000);
  };

  const handleSkipUpdate = (entityId) => {
    if (callService) {
      callService('update', 'skip', { entity_id: entityId });
    }
  };

  // ─── Auth Method Toggle (shared between connection tab & onboarding) ───
  const authMethod = config.authMethod || 'oauth';
  const isOAuth = authMethod === 'oauth';

  const renderAuthMethodToggle = (showRecommended = false) => (
    <div className="space-y-2">
      <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.authMethod')}</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setConfig({ ...config, authMethod: 'oauth' }); setConnectionTestResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative ${isOAuth ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
        >
          <LogIn className="w-3.5 h-3.5" />
          OAuth2
          {showRecommended && (
            <span className="absolute -top-2 -right-1 text-[8px] font-bold uppercase tracking-wider bg-green-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">{t('onboarding.recommended')}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setConfig({ ...config, authMethod: 'token' }); setConnectionTestResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${!isOAuth ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
        >
          <Key className="w-3.5 h-3.5" />
          Token
        </button>
      </div>
    </div>
  );

  const renderOAuthSection = () => {
    const oauthActive = hasOAuthTokens() && connected;
    const oauthConnecting = hasOAuthTokens() && !connected;
    return (
      <div className="space-y-4">
        {oauthConnecting ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-color)] border border-[var(--accent-color)] animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="font-bold text-sm">{t('system.oauth.connecting')}</span>
          </div>
        ) : oauthActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">
              <Check className="w-4 h-4" />
              <span className="font-bold text-sm">{t('system.oauth.authenticated')}</span>
            </div>
            <button
              type="button"
              onClick={handleOAuthLogout}
              className="w-full py-2.5 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              {t('system.oauth.logoutButton')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startOAuthLogin}
            disabled={!config.url || !validateUrl(config.url)}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${!config.url || !validateUrl(config.url) ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed' : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white '}`}
          >
            <LogIn className="w-5 h-5" />
            {t('system.oauth.loginButton')}
          </button>
        )}
        {!config.url && (
          <p className="text-xs text-[var(--text-muted)] ml-1">{t('system.oauth.urlRequired')}</p>
        )}
        {connectionTestResult && !connectionTestResult.success && isOAuth && (
          <div className="p-3 rounded-xl flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 animate-in fade-in slide-in-from-bottom-2">
            <X className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-sm">{connectionTestResult.message}</span>
          </div>
        )}
      </div>
    );
  };

  // ─── Connection Tab ───
  const haUser = profiles?.haUser;
  const renderConnectionTab = () => (
    <div className="space-y-6 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Auth Method Toggle */}
      {renderAuthMethodToggle()}

      {/* Logged-in user info */}
      {connected && haUser && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <UserCircle2 className="w-5 h-5 text-[var(--accent-color)]" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-bold text-gray-500">{t('system.loggedInAs')}</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{haUser.name}</span>
            {haUser.is_owner && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">{t('system.userRole.owner')}</span>}
            {haUser.is_admin && !haUser.is_owner && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent-color)] border border-[var(--accent-color)]">{t('system.userRole.admin')}</span>}
          </div>
        </div>
      )}

      {/* URL — always shown */}
      <div className="space-y-3">
        <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          {t('system.haUrlPrimary')}
          {connected && activeUrl === config.url && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
        </label>
        <div className="relative group">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-[var(--accent-color)] outline-none transition-all placeholder:text-[var(--text-muted)]"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
            placeholder="https://homeassistant.local:8123"
          />
          <div className="absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
        {config.url && config.url.endsWith('/') && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
            <AlertCircle className="w-3 h-3" />
            {t('onboarding.urlTrailingSlash')}
          </div>
        )}
      </div>

      {/* OAuth2 mode — login button */}
      {isOAuth && renderOAuthSection()}

      {/* Token mode — fallback URL + token */}
      {!isOAuth && (
        <>
          <div className="space-y-3">
            <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex items-center gap-2">
              <Server className="w-4 h-4" />
              {t('system.haUrlFallback')}
              {connected && activeUrl === config.fallbackUrl && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
            </label>
            <div className="relative group">
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-[var(--accent-color)] outline-none transition-all placeholder:text-[var(--text-muted)]"
                value={config.fallbackUrl}
                onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value.trim() })}
                placeholder={t('common.optional')}
              />
              <div className="absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            {config.fallbackUrl && config.fallbackUrl.endsWith('/') && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                <AlertCircle className="w-3 h-3" />
                {t('onboarding.urlTrailingSlash')}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t('system.token')}
            </label>
            <div className="relative group">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-[var(--accent-color)] outline-none transition-all font-mono text-xs leading-relaxed"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value.trim() })}
                placeholder="ey..."
              />
              <div className="absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ─── Profiles & Templates Tab ───
  const [profileName, setProfileName] = useState('');
  const [profileDeviceLabel, setProfileDeviceLabel] = useState('');
  const [publishTargets, setPublishTargets] = useState([]);
  const [selectedServerRevision, setSelectedServerRevision] = useState('');
  const [autoSyncExpanded, setAutoSyncExpanded] = useState(false);
  const [showAllKnownDevices, setShowAllKnownDevices] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const renderProfilesTab = () => {
    if (!profiles) return null;

    const {
      profiles: profileList,
      loading, error: profileError, loadSummary, backendAvailable,
      saveProfile, editProfile, loadProfile, removeProfile,
      startBlank,
      haUser,
      autoSync,
    } = profiles;

    const syncStatusLabel = {
      idle: t('profiles.autoSyncStatusIdle'),
      syncing: t('profiles.autoSyncStatusSyncing'),
      synced: t('profiles.autoSyncStatusSynced'),
      conflict: t('profiles.autoSyncStatusConflict'),
      error: t('profiles.autoSyncStatusError'),
    }[autoSync?.status] || autoSync?.status || t('common.unknown');

    const knownDevices = Array.isArray(autoSync?.knownDevices) ? autoSync.knownDevices : [];
    const otherDevices = knownDevices.filter((entry) => entry?.device_id && entry.device_id !== autoSync.deviceId);
    const selectedTargets = publishTargets.filter((id) => otherDevices.some((entry) => entry.device_id === id));
    const historyEntries = Array.isArray(autoSync?.history) ? autoSync.history : [];
    const MAX_VISIBLE_DEVICES = 8;
    const visibleKnownDevices = showAllKnownDevices ? knownDevices : knownDevices.slice(0, MAX_VISIBLE_DEVICES);
    const hiddenDeviceCount = Math.max(knownDevices.length - visibleKnownDevices.length, 0);

    const handleSaveProfile = async () => {
      const name = profileName.trim();
      if (!name) return;
      try {
        await saveProfile(name, profileDeviceLabel.trim());
        setProfileName('');
        setProfileDeviceLabel('');
      } catch {}
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        {haUser && backendAvailable && autoSync && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold text-gray-500 ml-1 tracking-wider">{t('profiles.autoSyncSection')}</h3>
            <div className="popup-surface p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setAutoSyncExpanded((prev) => !prev)}
                  className="min-w-0 text-left flex-1"
                >
                  <p className="text-sm font-bold text-[var(--text-primary)]">{t('profiles.autoSyncTitle')}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">{t('profiles.autoSyncDeviceId')}: {autoSync.deviceId}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {autoSync.enabled ? t('profiles.autoSyncEnabled') : t('profiles.autoSyncDisabled')}
                    {autoSync.lastSyncedAt ? ` • ${t('profiles.autoSyncLastSynced')} ${new Date(autoSync.lastSyncedAt).toLocaleString()}` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => autoSync.setEnabled(!autoSync.enabled)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors relative ${autoSync.enabled ? 'bg-[var(--accent-color)]' : 'bg-gray-500/30'}`}
                  title={autoSync.enabled ? t('profiles.autoSyncEnabled') : t('profiles.autoSyncDisabled')}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${autoSync.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setAutoSyncExpanded((prev) => !prev)}
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]"
                  title={autoSyncExpanded ? t('common.hide') : t('common.show')}
                >
                  {autoSyncExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {autoSyncExpanded && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-[var(--text-secondary)]">{t('profiles.autoSyncStatusLabel')}:</span>
                    <span className={`font-bold ${autoSync.status === 'error' ? 'text-red-400' : autoSync.status === 'syncing' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {syncStatusLabel}
                    </span>
                  </div>

                  {autoSync.error && (
                    <p className="text-xs text-red-400 font-bold">{autoSync.error}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => autoSync.loadCurrentFromServer(selectedServerRevision ? Number(selectedServerRevision) : undefined)}
                      className="px-3 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs font-bold transition-all"
                    >
                      {t('profiles.autoSyncLoadServer')}
                    </button>
                    <button
                      type="button"
                      disabled={autoSync.publishing || selectedTargets.length === 0}
                      onClick={() => autoSync.publishCurrentToDevices(selectedTargets)}
                      className="px-3 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs font-bold transition-all disabled:opacity-60"
                    >
                      {autoSync.publishing
                        ? t('profiles.autoSyncPublishing')
                        : selectedTargets.length > 0
                          ? `${t('profiles.autoSyncPublishOthers')} (${selectedTargets.length})`
                          : t('profiles.autoSyncPublishSelectTarget')}
                    </button>
                  </div>

                  {selectedTargets.length === 0 && (
                    <p className="text-[10px] text-[var(--text-muted)]">{t('profiles.autoSyncSelectTargetHint')}</p>
                  )}

                  {historyEntries.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">{t('profiles.autoSyncRevision')}</label>
                      <select
                        value={selectedServerRevision}
                        onChange={(event) => setSelectedServerRevision(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold focus:outline-none"
                        style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                      >
                        <option value="" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>{t('profiles.autoSyncRevisionLatest')}</option>
                        {historyEntries.map((entry) => (
                          <option key={entry.revision} value={String(entry.revision)} style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>
                            rev {entry.revision} • {new Date(entry.updated_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {knownDevices.length > 0 && (
                    <div className="pt-2 border-t border-[var(--glass-border)] space-y-2">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">{t('profiles.autoSyncKnownDevices')}</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {visibleKnownDevices.map((entry) => {
                          const isCurrentDevice = entry.device_id === autoSync.deviceId;
                          const isSelected = selectedTargets.includes(entry.device_id);
                          const isRemoving = autoSync.removingDeviceId === entry.device_id;
                          const isRenaming = autoSync.updatingDeviceId === entry.device_id;
                          const displayName = (typeof entry.device_label === 'string' && entry.device_label.trim())
                            ? entry.device_label.trim()
                            : entry.device_id;
                          return (
                            <label key={entry.device_id} className={`flex items-center justify-between gap-2 text-xs rounded-md px-2 py-1.5 ${isCurrentDevice ? 'opacity-70' : 'cursor-pointer hover:bg-[var(--glass-bg-hover)]'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {!isCurrentDevice && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(event) => {
                                      const checked = event.target.checked;
                                      setPublishTargets((prev) => {
                                        const next = new Set(prev);
                                        if (checked) next.add(entry.device_id);
                                        else next.delete(entry.device_id);
                                        return [...next];
                                      });
                                    }}
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-[var(--text-secondary)] truncate font-bold">{displayName}</div>
                                  <div className="text-[10px] text-[var(--text-muted)] truncate">ID: {entry.device_id}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-muted)]">rev {entry.revision}</span>
                                <button
                                  type="button"
                                  disabled={isRenaming}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const currentLabel = typeof entry.device_label === 'string' ? entry.device_label : '';
                                    const nextLabel = window.prompt(t('profiles.autoSyncRenameDevicePrompt'), currentLabel);
                                    if (nextLabel === null) return;
                                    autoSync.renameKnownDevice(entry.device_id, nextLabel);
                                  }}
                                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors disabled:opacity-50"
                                  title={t('profiles.autoSyncRenameDevice')}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!isCurrentDevice && (
                                  <button
                                    type="button"
                                    disabled={isRemoving || isRenaming}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (!window.confirm(t('profiles.autoSyncRemoveDeviceConfirm'))) return;
                                      autoSync.removeKnownDevice(entry.device_id);
                                      setPublishTargets((prev) => prev.filter((id) => id !== entry.device_id));
                                    }}
                                    className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                    title={t('profiles.autoSyncRemoveDevice')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {knownDevices.length > MAX_VISIBLE_DEVICES && (
                        <button
                          type="button"
                          onClick={() => setShowAllKnownDevices((prev) => !prev)}
                          className="text-[10px] font-bold text-[var(--accent-color)] hover:opacity-80 transition-opacity"
                        >
                          {showAllKnownDevices
                            ? t('common.hide')
                            : `${t('common.show')} +${hiddenDeviceCount}`}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Backend status warning */}
        {!backendAvailable && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-300">{t('profiles.backendUnavailable')}</p>
          </div>
        )}

        {/* Profiles Section (requires HA user) */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-gray-500 ml-1 tracking-wider">{t('profiles.sectionProfiles')}</h3>
          {!haUser ? (
            <div className="popup-surface p-4">
              <p className="text-sm text-[var(--text-secondary)]">{t('profiles.notConnected')}</p>
            </div>
          ) : !backendAvailable ? null : (
            <div className="popup-surface p-4 space-y-4">
              {/* Inline save form */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t('profiles.namePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                />
                <input
                  type="text"
                  value={profileDeviceLabel}
                  onChange={(e) => setProfileDeviceLabel(e.target.value)}
                  placeholder={t('profiles.deviceLabelPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={loading || !profileName.trim()}
                  className={`w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                    profileName.trim()
                      ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] '
                      : 'bg-[var(--accent-bg)] cursor-not-allowed shadow-none'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {t('profiles.save')}
                </button>
              </div>

              {profileError && (
                <p className="text-xs text-red-400 font-bold">{profileError}</p>
              )}

              {loadSummary && (
                <p className="text-xs text-amber-300 font-bold">{loadSummary}</p>
              )}

              {/* Profile list */}
              {profileList.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">{t('profiles.noProfiles')}</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {profileList.map(profile => (
                    <div key={profile.id} className="rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
                      {editingProfileId === profile.id ? (
                        /* ── Inline edit mode ── */
                        <div className="p-3 space-y-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder={t('profiles.namePlaceholder')}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder={t('profiles.deviceLabelPlaceholder')}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
                          />
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                const name = editName.trim();
                                if (!name) return;
                                try {
                                  await editProfile(profile.id, name, editLabel.trim());
                                  setEditingProfileId(null);
                                } catch {}
                              }}
                              disabled={loading || !editName.trim()}
                              className={`flex-1 py-2 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                editName.trim() ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)]' : 'bg-[var(--accent-bg)] cursor-not-allowed'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              {t('profiles.saveEdit')}
                            </button>
                            <button
                              onClick={() => setEditingProfileId(null)}
                              className="flex-1 py-2 rounded-lg bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs font-bold transition-all"
                            >
                              {t('profiles.cancelEdit')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal display mode ── */
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm text-[var(--text-primary)] block truncate">{profile.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {profile.device_label && (
                                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] bg-[var(--glass-bg)] px-1.5 py-0.5 rounded">{profile.device_label}</span>
                              )}
                              <span className="text-[10px] text-[var(--text-muted)]">{new Date(profile.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => loadProfile(profile)}
                              className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-all"
                            >
                              {t('profiles.load')}
                            </button>
                            <button
                              onClick={() => {
                                setEditingProfileId(profile.id);
                                setEditName(profile.name);
                                setEditLabel(profile.device_label || '');
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--accent-bg)] text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { if (window.confirm(t('profiles.confirmDelete'))) removeProfile(profile.id); }}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Start blank */}
        <div className="space-y-3 pt-4 border-t border-[var(--glass-border)]">
          <h3 className="text-xs uppercase font-bold text-gray-500 ml-1 tracking-wider">{t('profiles.sectionReset')}</h3>
          <div className="popup-surface p-4">
            <button
              onClick={() => { if (window.confirm(t('profiles.confirmBlank'))) startBlank(); }}
              className="w-full py-2.5 rounded-xl bg-[var(--glass-bg)] hover:bg-red-500/10 border border-[var(--glass-border)] hover:border-red-500/30 text-[var(--text-secondary)] hover:text-red-400 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('profiles.startBlank')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Appearance Tab (moved to ThemeSidebar) ───
  const _renderAppearanceTab = () => {
    const bgModes = [
      { key: 'theme', icon: Sparkles, label: t('settings.bgFollowTheme') },
      { key: 'solid', icon: Sun, label: t('settings.bgSolid') },
      { key: 'gradient', icon: Moon, label: t('settings.bgGradient') },
      { key: 'animated', icon: Sparkles, label: 'Aurora' },
    ];

    const resetBackground = () => {
      setBgMode('theme');
      setBgColor('#0f172a');
      setBgGradient('midnight');
      setBgImage('');
    };

    return (
      <div className="space-y-8 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Theme & Language */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <ModernDropdown
              label={t('settings.theme')}
              icon={Palette}
              options={Object.keys(themes)}
              current={currentTheme}
              onChange={setCurrentTheme}
              map={{ dark: t('theme.dark'), light: t('theme.light'), contextual: 'Smart (Auto)' }}
              placeholder={t('dropdown.noneSelected')}
            />
            <ModernDropdown
              label={t('settings.language')}
              icon={Globe}
              options={['en', 'nb', 'nn', 'sv', 'de']}
              current={language}
              onChange={setLanguage}
              map={{ en: t('language.en'), nb: t('language.nb'), nn: t('language.nn'), sv: t('language.sv'), de: t('language.de') }}
              placeholder={t('dropdown.noneSelected')}
            />
          </div>
        </div>

        {/* Background */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold text-gray-500 ml-1 tracking-widest">{t('settings.background')}</p>
            <button 
              type="button"
              onClick={resetBackground}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-color)] hover:bg-[var(--accent-bg)] rounded-lg transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Mode Selector - Compact */}
          <div className="grid grid-cols-4 gap-2">
            {bgModes.map(mode => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => setBgMode(mode.key)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all text-center ${
                    active
                      ? 'bg-[var(--accent-bg)] ring-1 ring-[var(--accent-color)] text-[var(--accent-color)]'
                      : 'bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)]'
                  }`}
                >
                  <ModeIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
             <div className="py-2 text-center">
               <p className="text-xs text-[var(--text-secondary)] font-medium">{t('settings.bgFollowThemeHint')}</p>
             </div>
          )}

          {bgMode === 'solid' && (
            <div className="py-2 flex items-center gap-4">
              <label className="relative cursor-pointer group">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-12 h-12 rounded-xl border-2 border-[var(--glass-border)] group-hover:border-[var(--accent-color)] transition-colors shadow-inner"
                  style={{ backgroundColor: bgColor }}
                />
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setBgColor(val);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-primary)] font-mono text-sm outline-none focus:border-[var(--accent-color)] transition-colors"
                  placeholder="#0f172a"
                  maxLength={7}
                />
              </div>
            </div>
          )}

          {bgMode === 'gradient' && (
            <div className="flex flex-wrap gap-3 py-2">
              {Object.entries(GRADIENT_PRESETS).map(([key, preset]) => {
                const active = bgGradient === key;
                return (
                  <button
                    key={key}
                    onClick={() => setBgGradient(key)}
                    className="group relative flex-shrink-0"
                    title={preset.label}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl transition-all ${
                        active ? 'ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--modal-bg)] scale-110' : 'hover:scale-105'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 text-center ${active ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`}>
                      {preset.label}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {bgMode === 'custom' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input
                    type="url"
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    className="w-full px-4 py-3.5 pl-10 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--accent-color)] transition-colors placeholder:text-[var(--text-muted)]"
                    placeholder={t('settings.bgUrl')}
                  />
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </div>
            </div>
          )}

          {/* Behavior */}
          <div className="pt-4 border-t border-[var(--glass-border)] space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Home className="w-4 h-4 text-[var(--accent-color)]" />
                  {t('settings.inactivity')}
                </label>
                <div className="flex items-center gap-3">
                   <button 
                    onClick={() => {
                      const newVal = inactivityTimeout > 0 ? 0 : 60;
                      setInactivityTimeout(newVal);
                      try { localStorage.setItem('tunet_inactivity_timeout', String(newVal)); } catch {}
                    }}
                    className={`w-10 h-6 rounded-full p-1 transition-colors relative ${inactivityTimeout > 0 ? 'bg-[var(--accent-color)]' : 'bg-gray-500/30'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${inactivityTimeout > 0 ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              {inactivityTimeout > 0 && (
                <div className="px-1 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                   <div className="flex justify-end mb-1">
                     <span className="text-xs font-bold text-[var(--text-secondary)]">{inactivityTimeout}s</span>
                   </div>
                  <M3Slider
                    min={10}
                    max={300}
                    step={10}
                    value={inactivityTimeout}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setInactivityTimeout(val);
                      try { localStorage.setItem('tunet_inactivity_timeout', String(val)); } catch {}
                    }}
                  colorClass="bg-[var(--accent-color)]"
                />
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Layout Tab ───
  const [layoutSections, setLayoutSections] = useState({ grid: true, spacing: false, cards: false });
  const toggleSection = (key) => setLayoutSections(prev => ({ ...prev, [key]: !prev[key] }));

  const _renderLayoutTab = () => {

    const ResetButton = ({ onClick }) => (
      <button 
        onClick={onClick}
        className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-all"
        title="Reset"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    );

    // Accordion section wrapper
    const Section = ({ id, icon: Icon, title, children }) => {
      const isOpen = layoutSections[id];
      return (
        <div className={`rounded-2xl px-3 py-0.5 transition-all ${isOpen ? 'bg-white/[0.03]' : ''}`}>
          <button
            type="button"
            onClick={() => toggleSection(id)}
            className="w-full flex items-center gap-3 py-2.5 text-left transition-colors group"
          >
            <div className={`p-1.5 rounded-xl transition-colors ${isOpen ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={`flex-1 text-[13px] font-semibold transition-colors ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          <div
            className="grid transition-all duration-200 ease-in-out"
            style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div className="pl-7 pr-0 pb-3 pt-0.5 space-y-5">
                {children}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const hts = sectionSpacing?.headerToStatus ?? 16;
    const stn = sectionSpacing?.statusToNav ?? 24;
    const ntg = sectionSpacing?.navToGrid ?? 24;

    return (
      <div className="space-y-1 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header row: title + live preview */}
        <div className="flex items-center justify-between px-1 pb-3">
          <p className="text-xs uppercase font-bold text-gray-500 tracking-widest">{t('settings.layout')}</p>
          <button
            type="button"
            onClick={() => setLayoutPreview(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              layoutPreview
                ? 'bg-[var(--accent-bg)] border-[var(--accent-color)] text-[var(--accent-color)]'
                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            aria-pressed={layoutPreview}
          >
            <Monitor className="w-3 h-3" />
            {t('settings.livePreview')}
          </button>
        </div>

        {/* ── Grid Section ── */}
        <Section
          id="grid"
          icon={Columns}
          title={t('settings.layoutGrid')}
        >
          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.gridDynamic')}</span>
              <div className="flex p-0.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(false)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${!dynamicGridColumns ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  style={!dynamicGridColumns ? { backgroundColor: 'var(--accent-color)' } : {}}
                >
                  {t('settings.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(true)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${dynamicGridColumns ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  style={dynamicGridColumns ? { backgroundColor: 'var(--accent-color)' } : {}}
                >
                  {t('common.auto')}
                </button>
              </div>
            </div>
            {dynamicGridColumns && (
              <p className="text-[11px] text-[var(--text-muted)] mb-2.5">{t('settings.gridDynamicHint')}</p>
            )}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.gridColumns')}</span>
              {gridColumns !== 4 && <ResetButton onClick={() => setGridColumns(Math.min(4, maxGridColumns))} />}
            </div>
            <div className="flex gap-1.5 p-0.5 rounded-xl">
              {Array.from({ length: MAX_GRID_COLUMNS - MIN_GRID_COLUMNS + 1 }, (_, index) => MIN_GRID_COLUMNS + index).map(cols => (
                <button
                  key={cols}
                  onClick={() => cols <= selectableMaxGridColumns && setGridColumns(cols)}
                  disabled={cols > selectableMaxGridColumns}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    effectiveGridColumns === cols
                      ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
                      : cols > selectableMaxGridColumns
                        ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  {cols}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Spacing */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.gridGap') || 'Grid Spacing'}</span>
              {(gridGapH !== 20 || gridGapV !== 20) && (
                 <ResetButton onClick={() => { setGridGapH(20); setGridGapV(20); }} />
              )}
            </div>
            
            <div className="space-y-5 pl-3 border-l-2 border-[var(--glass-border)] ml-1">
                {/* Horizontal */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('settings.gridGapH') || 'Vannrett'}</span>
                     <span className="text-[11px] tabular-nums text-[var(--text-muted)] font-mono">{gridGapH}px</span>
                   </div>
                   <M3Slider
                      min={0}
                      max={64}
                      step={4}
                      value={gridGapH}
                      onChange={(e) => setGridGapH(parseInt(e.target.value, 10))}
                      colorClass="bg-[var(--accent-color)]"
                    />
                </div>

                {/* Vertical */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('settings.gridGapV') || 'Loddrett'}</span>
                     <span className="text-[11px] tabular-nums text-[var(--text-muted)] font-mono">{gridGapV}px</span>
                   </div>
                   <M3Slider
                      min={0}
                      max={64}
                      step={4}
                      value={gridGapV}
                      onChange={(e) => setGridGapV(parseInt(e.target.value, 10))}
                      colorClass="bg-[var(--accent-color)]"
                    />
                </div>
            </div>
          </div>
        </Section>

        {/* ── Spacing Section ── */}
        <Section
          id="spacing"
          icon={LayoutGrid}
          title={t('settings.sectionSpacing')}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.sectionSpacingHeader')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{hts}px</span>
                {hts !== 16 && <ResetButton onClick={() => updateSectionSpacing({ headerToStatus: 16 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={hts} onChange={(e) => updateSectionSpacing({ headerToStatus: parseInt(e.target.value, 10) })} colorClass="bg-[var(--accent-color)]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.sectionSpacingNav')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{stn}px</span>
                {stn !== 24 && <ResetButton onClick={() => updateSectionSpacing({ statusToNav: 24 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={stn} onChange={(e) => updateSectionSpacing({ statusToNav: parseInt(e.target.value, 10) })} colorClass="bg-[var(--accent-color)]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.sectionSpacingGrid')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{ntg}px</span>
                {ntg !== 24 && <ResetButton onClick={() => updateSectionSpacing({ navToGrid: 24 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={ntg} onChange={(e) => updateSectionSpacing({ navToGrid: parseInt(e.target.value, 10) })} colorClass="bg-[var(--accent-color)]" />
          </div>
        </Section>

        {/* ── Card Style Section ── */}
        <Section
          id="cards"
          icon={Eye}
          title={t('settings.layoutCards')}
        >
          {/* Border Radius */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.cardRadius')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{cardBorderRadius}px</span>
                {cardBorderRadius !== 16 && <ResetButton onClick={() => setCardBorderRadius(16)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={2}
              value={cardBorderRadius}
              onChange={(e) => setCardBorderRadius(parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          {/* Transparency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.transparency')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{cardTransparency}%</span>
                {cardTransparency !== 40 && <ResetButton onClick={() => setCardTransparency(40)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={100}
              step={5}
              value={cardTransparency}
              onChange={(e) => setCardTransparency(parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          {/* Border Opacity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.borderOpacity')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{cardBorderOpacity}%</span>
                {cardBorderOpacity !== 5 && <ResetButton onClick={() => setCardBorderOpacity(5)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={50}
              step={5}
              value={cardBorderOpacity}
              onChange={(e) => setCardBorderOpacity(parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
        </Section>
      </div>
    );
  };

  // ─── Updates Tab ───
  const renderUpdatesTab = () => {
    const updates = entities ? Object.keys(entities).filter(id =>
      id.startsWith('update.') && entities[id].state === 'on'
    ).map(id => entities[id]) : [];

    if (updates.length === 0) {
      return (
        <div className="space-y-8 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-8 rounded-2xl bg-[var(--glass-bg)] text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('updates.none')}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{t('updates.allUpToDate')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        {updates.map(update => {
          const installedVersion = update.attributes?.installed_version;
          const latestVersion = update.attributes?.latest_version;
          const entityPicture = update.attributes?.entity_picture ? getEntityImageUrl(update.attributes.entity_picture) : null;
          const isInstalling = installingIds[update.entity_id];
          const hasNotes = !!(update.attributes?.release_summary || update.attributes?.release_url);
          const isExpanded = expandedNotes[update.entity_id];

          return (
            <div key={update.entity_id} className="rounded-2xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-all overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--glass-bg-hover)] flex items-center justify-center p-1.5 border border-[var(--glass-border)] flex-shrink-0 relative overflow-hidden">
                    {entityPicture ? (
                      <img src={entityPicture} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Download className="w-5 h-5 text-[var(--accent-color)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {update.attributes?.title || update.attributes?.friendly_name || update.entity_id}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {installedVersion && (
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <span className="opacity-50 text-[10px] uppercase tracking-wider font-bold">{t('updates.from')}</span>
                          <span className="text-[10px] font-mono bg-[var(--glass-bg)] px-1.5 py-0.5 rounded border border-[var(--glass-border)] opacity-80">{installedVersion}</span>
                        </div>
                      )}
                      {installedVersion && latestVersion && (
                        <ArrowRight className="w-3 h-3 text-[var(--text-muted)] opacity-30" />
                      )}
                      {latestVersion && (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <span className="opacity-50 text-[10px] uppercase tracking-wider font-bold">{t('updates.to')}</span>
                          <span className="text-[10px] font-mono bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 font-bold">{latestVersion}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons: stack vertically on very small screens */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleSkipUpdate(update.entity_id)}
                      className="px-3 py-2 rounded-xl bg-[var(--glass-bg-hover)] hover:bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest transition-all hidden sm:block"
                    >
                      {t('updates.skip')}
                    </button>
                    <button
                      onClick={() => handleInstallUpdate(update.entity_id)}
                      disabled={isInstalling}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                        isInstalling
                          ? 'bg-[var(--accent-bg)] text-white/70 cursor-wait'
                          : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white shadow-lg  active:scale-95'
                      }`}
                    >
                      {isInstalling && <RefreshCw className="w-3 h-3 animate-spin" />}
                      {isInstalling ? t('updates.installing') : t('updates.update')}
                    </button>
                  </div>
                </div>

                {/* Mobile skip button */}
                <div className="flex sm:hidden mt-2 justify-end">
                  <button
                    onClick={() => handleSkipUpdate(update.entity_id)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest"
                  >
                    {t('updates.skip')}
                  </button>
                </div>
              </div>

              {/* Expandable Release Notes */}
              {hasNotes && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setExpandedNotes(prev => ({ ...prev, [update.entity_id]: !prev[update.entity_id] }))}
                    className="text-[10px] text-[var(--accent-color)] hover:text-[var(--text-primary)] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? t('updates.showLess') : t('updates.showMore')}
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {(update.attributes?.release_summary || update.attributes?.body) && (
                        <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed opacity-90 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded-lg max-h-60 overflow-y-auto custom-scrollbar select-text">
                          {update.attributes.release_summary || update.attributes.body}
                        </div>
                      )}
                      {update.attributes?.release_url && (
                        <a
                          href={update.attributes.release_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[var(--accent-color)] hover:underline mt-2 inline-flex items-center gap-1 font-bold uppercase tracking-wider"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('updates.readMore')} <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Main Render ───
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isLayoutPreview ? 'items-stretch justify-end' : 'items-center justify-center p-4 md:p-8'
      }`}
      style={{
        backdropFilter: isLayoutPreview ? 'none' : 'blur(20px)',
        backgroundColor: isLayoutPreview ? 'transparent' : 'rgba(0,0,0,0.3)'
      }}
      onClick={handleClose}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
      <div
        className={`border w-full relative font-sans flex flex-col overflow-hidden popup-anim text-[var(--text-primary)] ${
          isLayoutPreview
            ? 'max-w-[18rem] sm:max-w-[21rem] md:max-w-[23rem] h-full rounded-none md:rounded-l-[2.5rem] shadow-2xl origin-right scale-[0.94] sm:scale-[0.97] md:scale-100 animate-in slide-in-from-right-8 fade-in zoom-in-95 duration-300'
            : 'max-w-5xl h-[75vh] max-h-[700px] rounded-3xl md:rounded-[3rem] shadow-2xl'
        }`}
        style={{
          background: 'linear-gradient(160deg, var(--card-bg) 0%, var(--modal-bg) 70%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isOnboardingActive ? (
          <div className="flex flex-col md:flex-row h-full">
            {/* Onboarding Sidebar */}
            <div className="w-full md:w-64 flex flex-row md:flex-col gap-1 p-3 border-b md:border-b-0 md:border-r border-[var(--glass-border)]">
              <div className="hidden md:flex items-center gap-3 px-3 py-4 mb-2">
                <div className="p-2 bg-[var(--accent-bg)] rounded-lg text-[var(--accent-color)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-wide">{t('onboarding.title')}</span>
              </div>

              {onboardingSteps.map((step, index) => {
                const isActive = onboardingStep === index;
                const isDone = onboardingStep > index;
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide cursor-default ${isActive ? 'bg-[var(--accent-color)] text-white shadow-lg ' : ''} ${isDone ? 'text-green-400 bg-green-500/10' : ''} ${!isActive && !isDone ? 'text-[var(--text-secondary)] opacity-50' : ''}`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    <span className="hidden md:inline">{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Onboarding Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] md:hidden">
                <h3 className="font-bold text-lg uppercase tracking-wide">{onboardingSteps[onboardingStep].label}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                <div className="hidden md:flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{onboardingSteps[onboardingStep].label}</h2>
                </div>

                {onboardingStep === 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Auth Method Toggle — hidden in Ingress mode (always token) */}
                    {!config.isIngress && renderAuthMethodToggle(true)}

                    {config.isIngress && (
                      <div className="p-3 rounded-xl bg-[var(--accent-bg)] border border-[var(--accent-color)] text-[var(--accent-color)] text-xs leading-relaxed">
                        <strong>Add-on Mode:</strong> URL is auto-detected. Just paste a Long-Lived Access Token from your HA Profile.
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* URL — hidden in Ingress (auto-detected), shown otherwise */}
                      {!config.isIngress && (
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.haUrlPrimary')}</label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] border-2 text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-sm ${onboardingUrlError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-[var(--accent-color)]'}`}
                          value={config.url}
                          onChange={(e) => {
                            setConfig({ ...config, url: e.target.value.trim() });
                            setOnboardingUrlError('');
                            setConnectionTestResult(null);
                          }}
                          placeholder={t('onboarding.haUrlPlaceholder')}
                        />
                        {onboardingUrlError && <p className="text-xs text-red-400 font-bold ml-1">{onboardingUrlError}</p>}
                      </div>
                      )}

                      {/* OAuth2 mode — show login button */}
                      {!config.isIngress && isOAuth && (
                        <div className="pt-2">
                          {renderOAuthSection()}
                        </div>
                      )}

                      {/* Token mode — show token + fallback */}
                      {!isOAuth && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.token')}</label>
                            <textarea
                              className={`w-full px-3 py-2 h-24 rounded-xl bg-[var(--glass-bg)] border-2 text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-mono text-xs leading-tight ${onboardingTokenError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-[var(--accent-color)]'}`}
                              value={config.token}
                              onChange={(e) => {
                                setConfig({ ...config, token: e.target.value.trim() });
                                setOnboardingTokenError('');
                                setConnectionTestResult(null);
                              }}
                              placeholder={t('onboarding.tokenPlaceholder')}
                            />
                            {onboardingTokenError && <p className="text-xs text-red-400 font-bold ml-1">{onboardingTokenError}</p>}
                          </div>

                          {!config.isIngress && (
                          <div className="space-y-1.5">
                            <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.haUrlFallback')}</label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-sm focus:border-[var(--accent-color)]"
                              value={config.fallbackUrl}
                              onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value.trim() })}
                              placeholder={t('common.optional')}
                            />
                            <p className="text-[10px] text-[var(--text-muted)] ml-1 leading-tight">{t('onboarding.fallbackHint')}</p>
                          </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Test Connection — token mode only */}
                    {!isOAuth && (
                      <>
                        <button
                          onClick={testConnection}
                          disabled={!config.url || !config.token || !validateUrl(config.url) || testingConnection}
                          className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg text-sm ${!config.url || !config.token || !validateUrl(config.url) || testingConnection ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed' : 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white '}`}
                        >
                          {testingConnection ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                          {testingConnection ? t('onboarding.testing') : t('onboarding.testConnection')}
                        </button>

                        {connectionTestResult && (
                          <div className={`p-3 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${connectionTestResult.success ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {connectionTestResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            <span className="font-bold text-sm">{connectionTestResult.message}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {onboardingStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                      <p className="text-xs uppercase font-bold text-gray-500 ml-1">{t('settings.language')}</p>
                      <ModernDropdown label={t('settings.language')} icon={Globe} options={['en', 'nb', 'nn', 'sv', 'de']} current={language} onChange={setLanguage} map={{ en: t('language.en'), nb: t('language.nb'), nn: t('language.nn'), sv: t('language.sv'), de: t('language.de') }} placeholder={t('dropdown.noneSelected')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex justify-between">
                        {t('settings.inactivity')}
                        <span className="text-[var(--text-primary)]">{inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}</span>
                      </label>
                      <div className="px-1 py-2">
                        <M3Slider
                          min={0}
                          max={300}
                          step={10}
                          value={inactivityTimeout}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setInactivityTimeout(val);
                            try { localStorage.setItem('tunet_inactivity_timeout', String(val)); } catch {}
                          }}
                          colorClass="bg-[var(--accent-color)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-6 flex flex-col items-center text-center justify-center p-4 animate-in fade-in zoom-in duration-500 h-full">
                    <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 mb-8">
                      <Check className="w-12 h-12" />
                    </div>
                    <h4 className="text-3xl font-bold text-[var(--text-primary)]">{t('onboarding.finishTitle')}</h4>
                    <p className="text-[var(--text-secondary)] max-w-sm text-lg mt-2">{t('onboarding.finishBody')}</p>
                  </div>
                )}
              </div>

              {/* Onboarding Footer */}
              <div className="p-4 border-t border-[var(--glass-border)] flex gap-3">
                <button
                  onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                  className="flex-1 py-3 rounded-xl text-[var(--text-secondary)] font-bold uppercase tracking-widest border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  disabled={onboardingStep === 0}
                  style={{ opacity: onboardingStep === 0 ? 0 : 1, pointerEvents: onboardingStep === 0 ? 'none' : 'auto' }}
                >
                  {t('onboarding.back')}
                </button>
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button
                    onClick={() => setOnboardingStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
                    disabled={!canAdvanceOnboarding}
                    className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg ${canAdvanceOnboarding ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-white ' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] cursor-not-allowed opacity-50'}`}
                  >
                    {t('onboarding.next')}
                  </button>
                ) : (
                  <button
                    onClick={onFinishOnboarding}
                    className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                  >
                    {t('onboarding.finish')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // ═══ SYSTEM SETTINGS LAYOUT ═══
          <div className={`flex h-full ${isLayoutPreview ? 'flex-col' : 'flex-col md:flex-row'}`}>
            {/* Sidebar — icons only on mobile, full labels on desktop */}
            {!isLayoutPreview && (
              <div className="w-full md:w-56 flex flex-row md:flex-col gap-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-[var(--glass-border)] flex-shrink-0 bg-[linear-gradient(160deg,var(--glass-bg),transparent_70%)] animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="hidden md:flex items-center gap-3 px-3 py-4 mb-2">
                  <div className="p-2 bg-[var(--accent-bg)] rounded-lg text-[var(--accent-color)]">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-lg tracking-wide">{t('system.title')}</span>
                </div>

                {availableTabs.map(tab => {
                  const active = configTab === tab.key;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setConfigTab(tab.key)}
                      className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide ${
                        active
                          ? 'bg-[var(--accent-color)] text-white shadow-lg '
                          : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <TabIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden md:inline text-xs">{tab.label}</span>
                    </button>
                  );
                })}

                <div className="mt-auto hidden md:flex flex-col gap-2 pt-4 border-t border-[var(--glass-border)]">
                  <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 text-sm">
                    <Check className="w-4 h-4" />
                    {t('system.save')}
                  </button>
                  <div className="text-center pt-2">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">
                      Tunet Dashboard v{__APP_VERSION__}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className={`flex items-center justify-between p-4 border-b border-[var(--glass-border)] ${isLayoutPreview ? 'relative overflow-hidden bg-[var(--glass-bg)]' : 'md:hidden'}`}>
                {isLayoutPreview && (
                  <div className="absolute inset-0 bg-gradient-to-l from-[var(--accent-bg)]/50 via-transparent to-transparent pointer-events-none" />
                )}
                <div className="flex items-center gap-3 relative">
                  <div className="p-2 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-color)] shadow-inner">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base uppercase tracking-wide">
                    {availableTabs.find(tb => tb.key === configTab)?.label}
                  </h3>
                </div>
                <button onClick={onClose} className="modal-close relative"><X className="w-4 h-4" /></button>
              </div>

              <div className={`flex-1 overflow-y-auto custom-scrollbar ${isLayoutPreview ? 'p-5 md:p-6' : 'p-5 md:p-8'}`}>
                {/* Desktop Header */}
                {!isLayoutPreview && (
                  <div className="hidden md:flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">
                      {availableTabs.find(tab => tab.key === configTab)?.label}
                    </h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {configTab === 'connection' && renderConnectionTab()}
                {/* {configTab === 'appearance' && renderAppearanceTab()} */}
                {/* {configTab === 'layout' && renderLayoutTab()} */}
                {configTab === 'profiles' && renderProfilesTab()}
                {configTab === 'updates' && renderUpdatesTab()}
              </div>

              {/* Mobile Footer */}
              {!isLayoutPreview && (
                <div className="p-3 border-t border-[var(--glass-border)] md:hidden">
                  <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 text-sm">
                    {t('system.save')}
                  </button>
                  <div className="text-center pt-2">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-50">
                      Tunet Dashboard v{__APP_VERSION__}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
