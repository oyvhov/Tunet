import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ModernDropdown from '../components/ui/ModernDropdown';
import M3Slider from '../components/ui/M3Slider';
import { GRADIENT_PRESETS } from '../contexts/ConfigContext';
import { hasOAuthTokens } from '../services/oauthStorage';
import {
  getMaxGridColumnsForWidth,
  MAX_GRID_COLUMNS,
  MIN_GRID_COLUMNS,
} from '../hooks/useResponsiveGrid';
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

const SETTINGS_STATIC_VERSION = '1.10.0';

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
  const [runningVersion, setRunningVersion] = useState(SETTINGS_STATIC_VERSION);
  const [installingIds, setInstallingIds] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [layoutPreview, setLayoutPreview] = useState(false);
  const [maxGridColumns, setMaxGridColumns] = useState(() => {
    if (globalThis.window === undefined) return MAX_GRID_COLUMNS;
    return getMaxGridColumnsForWidth(globalThis.window.innerWidth);
  });
  const selectableMaxGridColumns = dynamicGridColumns
    ? Math.min(maxGridColumns, 4)
    : maxGridColumns;

  const effectiveGridColumns = Math.max(
    MIN_GRID_COLUMNS,
    Math.min(gridColumns, selectableMaxGridColumns)
  );

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
    const update = () => setMaxGridColumns(getMaxGridColumnsForWidth(globalThis.window.innerWidth));
    update();
    globalThis.window.addEventListener('resize', update);
    return () => globalThis.window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadVersion = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load health status');
        const data = await response.json();
        if (!cancelled) {
          setRunningVersion(
            typeof data?.version === 'string' && data.version
              ? data.version
              : SETTINGS_STATIC_VERSION
          );
        }
      } catch {
        if (!cancelled) setRunningVersion(SETTINGS_STATIC_VERSION);
      }
    };

    loadVersion();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    if (!isOnboardingActive) onClose?.();
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
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
    setInstallingIds((prev) => ({ ...prev, [entityId]: true }));
    if (callService) {
      callService('update', 'install', { entity_id: entityId });
    }
    setTimeout(() => {
      setInstallingIds((prev) => ({ ...prev, [entityId]: false }));
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
      <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
        {t('system.authMethod')}
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setConfig({ ...config, authMethod: 'oauth' });
            setConnectionTestResult(null);
          }}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all ${isOAuth ? 'bg-[var(--accent-color)] text-white shadow-lg ' : 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
        >
          <LogIn className="h-3.5 w-3.5" />
          OAuth2
          {showRecommended && (
            <span className="absolute -top-2 -right-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-white uppercase shadow-sm">
              {t('onboarding.recommended')}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfig({ ...config, authMethod: 'token' });
            setConnectionTestResult(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all ${isOAuth ? 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]' : 'bg-[var(--accent-color)] text-white shadow-lg '}`}
        >
          <Key className="h-3.5 w-3.5" />
          Token
        </button>
      </div>
    </div>
  );

  const renderOAuthSection = () => {
    const oauthActive = hasOAuthTokens() && connected;
    const oauthConnecting = hasOAuthTokens() && !connected;
    let oauthContent;

    if (oauthConnecting) {
      oauthContent = (
        <div className="flex animate-pulse items-center gap-3 rounded-xl border border-[var(--accent-color)] bg-[var(--accent-bg)] px-4 py-3 text-[var(--accent-color)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm font-bold">{t('system.oauth.connecting')}</span>
        </div>
      );
    } else if (oauthActive) {
      oauthContent = (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm font-bold">{t('system.oauth.authenticated')}</span>
          </div>
          <button
            type="button"
            onClick={handleOAuthLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm font-bold tracking-widest text-red-400 uppercase transition-all hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            {t('system.oauth.logoutButton')}
          </button>
        </div>
      );
    } else {
      oauthContent = (
        <button
          type="button"
          onClick={startOAuthLogin}
          disabled={!config.url || !validateUrl(config.url)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold tracking-widest uppercase shadow-lg transition-all ${!config.url || !validateUrl(config.url) ? 'cursor-not-allowed bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50' : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)] '}`}
        >
          <LogIn className="h-5 w-5" />
          {t('system.oauth.loginButton')}
        </button>
      );
    }

    return (
      <div className="space-y-4">
        {oauthContent}
        {!config.url && (
          <p className="ml-1 text-xs text-[var(--text-muted)]">{t('system.oauth.urlRequired')}</p>
        )}
        {connectionTestResult && !connectionTestResult.success && isOAuth && (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/20 p-3 text-red-400">
            <X className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-bold">{connectionTestResult.message}</span>
          </div>
        )}
      </div>
    );
  };

  // ─── Connection Tab ───
  const haUser = profiles?.haUser;
  const renderConnectionTab = () => (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6 font-sans duration-300">
      <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
        {t('system.runningVersion')}:{' '}
        <span className="text-[var(--text-primary)]">{runningVersion}</span>
      </div>

      {/* Auth Method Toggle */}
      {renderAuthMethodToggle()}

      {/* Logged-in user info */}
      {connected && haUser && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3">
          <UserCircle2 className="h-5 w-5 text-[var(--accent-color)]" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">
              {t('system.loggedInAs')}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{haUser.name}</span>
            {haUser.is_owner && (
              <span className="rounded border border-purple-500/20 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                {t('system.userRole.owner')}
              </span>
            )}
            {haUser.is_admin && !haUser.is_owner && (
              <span className="rounded border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-color)] uppercase">
                {t('system.userRole.admin')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* URL — always shown */}
      <div className="space-y-3">
        <label className="ml-1 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
          <Wifi className="h-4 w-4" />
          {t('system.haUrlPrimary')}
          {connected && activeUrl === config.url && (
            <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] tracking-widest text-green-400">
              {t('system.connected')}
            </span>
          )}
        </label>
        <div className="group relative">
          <input
            type="text"
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:bg-[var(--glass-bg-hover)]"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
            placeholder="https://homeassistant.local:8123"
          />
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {config.url?.endsWith('/') && (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400">
            <AlertCircle className="h-3 w-3" />
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
            <label className="ml-1 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
              <Server className="h-4 w-4" />
              {t('system.haUrlFallback')}
              {connected && activeUrl === config.fallbackUrl && (
                <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] tracking-widest text-green-400">
                  {t('system.connected')}
                </span>
              )}
            </label>
            <div className="group relative">
              <input
                type="text"
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:bg-[var(--glass-bg-hover)]"
                value={config.fallbackUrl}
                onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value.trim() })}
                placeholder={t('common.optional')}
              />
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            {config.fallbackUrl?.endsWith('/') && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400">
                <AlertCircle className="h-3 w-3" />
                {t('onboarding.urlTrailingSlash')}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="ml-1 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
              <Lock className="h-4 w-4" />
              {t('system.token')}
            </label>
            <div className="group relative">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--text-primary)] transition-all outline-none focus:border-[var(--accent-color)] focus:bg-[var(--glass-bg-hover)]"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value.trim() })}
                placeholder="ey..."
              />
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--accent-bg)] opacity-0 transition-opacity group-hover:opacity-100" />
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
  const importFileRef = useRef(null);

  const renderProfilesTab = () => {
    if (!profiles) return null;

    const {
      profiles: profileList,
      loading,
      error: profileError,
      loadSummary,
      backendAvailable,
      saveProfile,
      editProfile,
      loadProfile,
      removeProfile,
      importDashboard,
      exportDashboard,
      startBlank,
      haUser,
      autoSync,
    } = profiles;

    const syncStatusLabel =
      {
        idle: t('profiles.autoSyncStatusIdle'),
        syncing: t('profiles.autoSyncStatusSyncing'),
        synced: t('profiles.autoSyncStatusSynced'),
        conflict: t('profiles.autoSyncStatusConflict'),
        error: t('profiles.autoSyncStatusError'),
      }[autoSync?.status] ||
      autoSync?.status ||
      t('common.unknown');

    const knownDevices = Array.isArray(autoSync?.knownDevices) ? autoSync.knownDevices : [];
    const otherDevices = knownDevices.filter(
      (entry) => entry?.device_id && entry.device_id !== autoSync.deviceId
    );
    const selectedTargets = publishTargets.filter((id) =>
      otherDevices.some((entry) => entry.device_id === id)
    );
    const historyEntries = Array.isArray(autoSync?.history) ? autoSync.history : [];
    const MAX_VISIBLE_DEVICES = 8;
    const visibleKnownDevices = showAllKnownDevices
      ? knownDevices
      : knownDevices.slice(0, MAX_VISIBLE_DEVICES);
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
    let syncStatusTone = 'text-emerald-300';
    if (autoSync.status === 'error') {
      syncStatusTone = 'text-red-400';
    } else if (autoSync.status === 'syncing') {
      syncStatusTone = 'text-amber-300';
    }

    let publishButtonLabel = `${t('profiles.autoSyncPublishOthers')} (${selectedTargets.length})`;
    if (autoSync.publishing) {
      publishButtonLabel = t('profiles.autoSyncPublishing');
    } else if (selectedTargets.length === 0) {
      publishButtonLabel = t('profiles.autoSyncPublishSelectTarget');
    }

    let profilesSectionContent = null;

    if (!haUser) {
      profilesSectionContent = (
        <div className="popup-surface p-4">
          <p className="text-sm text-[var(--text-secondary)]">{t('profiles.notConnected')}</p>
        </div>
      );
    } else if (backendAvailable) {
      profilesSectionContent = (
        <div className="popup-surface space-y-4 p-4">
          {/* Inline save form */}
          <div className="space-y-3">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={t('profiles.namePlaceholder')}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:outline-none"
            />
            <input
              type="text"
              value={profileDeviceLabel}
              onChange={(e) => setProfileDeviceLabel(e.target.value)}
              placeholder={t('profiles.deviceLabelPlaceholder')}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:outline-none"
            />
            <button
              onClick={handleSaveProfile}
              disabled={loading || !profileName.trim()}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition-all ${
                profileName.trim()
                  ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)] '
                  : 'cursor-not-allowed bg-[var(--accent-bg)] shadow-none'
              }`}
            >
              <Save className="h-4 w-4" />
              {t('profiles.save')}
            </button>
          </div>

          {profileError && <p className="text-xs font-bold text-red-400">{profileError}</p>}

          {loadSummary && <p className="text-xs font-bold text-amber-300">{loadSummary}</p>}

          {/* Profile list */}
          {profileList.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{t('profiles.noProfiles')}</p>
          ) : (
            <div className="mt-2 space-y-2">
              {profileList.map((profile) => (
                <div
                  key={profile.id}
                  className="overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]"
                >
                  {editingProfileId === profile.id ? (
                    /* ── Inline edit mode ── */
                    <div className="space-y-2 p-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder={t('profiles.namePlaceholder')}
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder={t('profiles.deviceLabelPlaceholder')}
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)] focus:outline-none"
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
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-all ${
                            editName.trim()
                              ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-color)]'
                              : 'cursor-not-allowed bg-[var(--accent-bg)]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t('profiles.saveEdit')}
                        </button>
                        <button
                          onClick={() => setEditingProfileId(null)}
                          className="flex-1 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)]"
                        >
                          {t('profiles.cancelEdit')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal display mode ── */
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                          {profile.name}
                        </span>
                        <div className="mt-0.5 flex items-center gap-2">
                          {profile.device_label && (
                            <span className="rounded bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                              {profile.device_label}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(profile.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-2">
                        <button
                          onClick={() => loadProfile(profile)}
                          className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-green-600"
                        >
                          {t('profiles.load')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingProfileId(profile.id);
                            setEditName(profile.name);
                            setEditLabel(profile.device_label || '');
                          }}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-all hover:bg-[var(--accent-bg)] hover:text-[var(--accent-color)]"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (globalThis.confirm(t('profiles.confirmDelete')))
                              removeProfile(profile.id);
                          }}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-all hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const handleExportDashboard = () => {
      try {
        const payload = exportDashboard();
        const content = JSON.stringify(payload, null, 2);
        const blob = new globalThis.Blob([content], { type: 'application/json' });
        const url = globalThis.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const dateTag = new Date().toISOString().slice(0, 10);
        anchor.href = url;
        anchor.download = `tunet-dashboard-${dateTag}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        globalThis.URL.revokeObjectURL(url);
      } catch {
        // errors are handled via profiles hook state
      }
    };

    const handleImportDashboard = async (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        importDashboard(parsed);
      } catch {
        globalThis.alert(t('profiles.invalidFile'));
      } finally {
        event.target.value = '';
      }
    };

    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-8 duration-300">
        {haUser && backendAvailable && autoSync && (
          <div className="space-y-3">
            <h3 className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
              {t('profiles.autoSyncSection')}
            </h3>
            <div className="popup-surface space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setAutoSyncExpanded((prev) => !prev)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {t('profiles.autoSyncTitle')}
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-secondary)]">
                    {t('profiles.autoSyncDeviceId')}: {autoSync.deviceId}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {autoSync.enabled
                      ? t('profiles.autoSyncEnabled')
                      : t('profiles.autoSyncDisabled')}
                    {autoSync.lastSyncedAt
                      ? ` • ${t('profiles.autoSyncLastSynced')} ${new Date(autoSync.lastSyncedAt).toLocaleString()}`
                      : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => autoSync.setEnabled(!autoSync.enabled)}
                  className={`relative h-6 w-10 rounded-full p-1 transition-colors ${autoSync.enabled ? 'bg-[var(--accent-color)]' : 'bg-gray-500/30'}`}
                  title={
                    autoSync.enabled
                      ? t('profiles.autoSyncEnabled')
                      : t('profiles.autoSyncDisabled')
                  }
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${autoSync.enabled ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setAutoSyncExpanded((prev) => !prev)}
                  className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]"
                  title={autoSyncExpanded ? t('common.hide') : t('common.show')}
                >
                  {autoSyncExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {autoSyncExpanded && (
                <>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-[var(--text-secondary)]">
                      {t('profiles.autoSyncStatusLabel')}:
                    </span>
                    <span className={`font-bold ${syncStatusTone}`}>{syncStatusLabel}</span>
                  </div>

                  {autoSync.error && (
                    <p className="text-xs font-bold text-red-400">{autoSync.error}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        autoSync.loadCurrentFromServer(
                          selectedServerRevision ? Number(selectedServerRevision) : undefined
                        )
                      }
                      className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)]"
                    >
                      {t('profiles.autoSyncLoadServer')}
                    </button>
                    <button
                      type="button"
                      disabled={autoSync.publishing || selectedTargets.length === 0}
                      onClick={() => autoSync.publishCurrentToDevices(selectedTargets)}
                      className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--glass-bg-hover)] disabled:opacity-60"
                    >
                      {publishButtonLabel}
                    </button>
                  </div>

                  {selectedTargets.length === 0 && (
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {t('profiles.autoSyncSelectTargetHint')}
                    </p>
                  )}

                  {historyEntries.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                        {t('profiles.autoSyncRevision')}
                      </label>
                      <select
                        value={selectedServerRevision}
                        onChange={(event) => setSelectedServerRevision(event.target.value)}
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:outline-none"
                        style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                      >
                        <option
                          value=""
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {t('profiles.autoSyncRevisionLatest')}
                        </option>
                        {historyEntries.map((entry) => (
                          <option
                            key={entry.revision}
                            value={String(entry.revision)}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            rev {entry.revision} • {new Date(entry.updated_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {knownDevices.length > 0 && (
                    <div className="space-y-2 border-t border-[var(--glass-border)] pt-2">
                      <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
                        {t('profiles.autoSyncKnownDevices')}
                      </p>
                      <div className="custom-scrollbar max-h-36 space-y-1.5 overflow-y-auto pr-1">
                        {visibleKnownDevices.map((entry) => {
                          const isCurrentDevice = entry.device_id === autoSync.deviceId;
                          const isSelected = selectedTargets.includes(entry.device_id);
                          const isRemoving = autoSync.removingDeviceId === entry.device_id;
                          const isRenaming = autoSync.updatingDeviceId === entry.device_id;
                          const displayName =
                            typeof entry.device_label === 'string' && entry.device_label.trim()
                              ? entry.device_label.trim()
                              : entry.device_id;
                          return (
                            <label
                              key={entry.device_id}
                              className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs ${isCurrentDevice ? 'opacity-70' : 'cursor-pointer hover:bg-[var(--glass-bg-hover)]'}`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
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
                                  <div className="truncate font-bold text-[var(--text-secondary)]">
                                    {displayName}
                                  </div>
                                  <div className="truncate text-[10px] text-[var(--text-muted)]">
                                    ID: {entry.device_id}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-muted)]">
                                  rev {entry.revision}
                                </span>
                                <button
                                  type="button"
                                  disabled={isRenaming}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const currentLabel =
                                      typeof entry.device_label === 'string'
                                        ? entry.device_label
                                        : '';
                                    const nextLabel = globalThis.prompt(
                                      t('profiles.autoSyncRenameDevicePrompt'),
                                      currentLabel
                                    );
                                    if (nextLabel === null) return;
                                    autoSync.renameKnownDevice(entry.device_id, nextLabel);
                                  }}
                                  className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-50"
                                  title={t('profiles.autoSyncRenameDevice')}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                {!isCurrentDevice && (
                                  <button
                                    type="button"
                                    disabled={isRemoving || isRenaming}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      if (
                                        !globalThis.confirm(
                                          t('profiles.autoSyncRemoveDeviceConfirm')
                                        )
                                      )
                                        return;
                                      autoSync.removeKnownDevice(entry.device_id);
                                      setPublishTargets((prev) =>
                                        prev.filter((id) => id !== entry.device_id)
                                      );
                                    }}
                                    className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                    title={t('profiles.autoSyncRemoveDevice')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
                          className="text-[10px] font-bold text-[var(--accent-color)] transition-opacity hover:opacity-80"
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
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
            <p className="text-sm text-yellow-300">{t('profiles.backendUnavailable')}</p>
          </div>
        )}

        {/* Profiles Section (requires HA user) */}
        <div className="space-y-3">
          <div className="ml-1 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              {t('profiles.sectionProfiles')}
            </h3>
            {haUser && backendAvailable && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportDashboard}
                  className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)]"
                >
                  {t('profiles.export')}
                </button>
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg-hover)]"
                >
                  {t('profiles.import')}
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportDashboard}
                />
              </div>
            )}
          </div>
          {profilesSectionContent}
        </div>

        {/* Start blank */}
        <div className="space-y-3 border-t border-[var(--glass-border)] pt-4">
          <h3 className="ml-1 text-xs font-bold tracking-wider text-gray-500 uppercase">
            {t('profiles.sectionReset')}
          </h3>
          <div className="popup-surface p-4">
            <button
              onClick={() => {
                if (globalThis.confirm(t('profiles.confirmBlank'))) startBlank();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] py-2.5 text-sm font-bold text-[var(--text-secondary)] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
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
      <div className="animate-in fade-in slide-in-from-right-4 space-y-8 font-sans duration-300">
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
              map={{
                en: t('language.en'),
                nb: t('language.nb'),
                nn: t('language.nn'),
                sv: t('language.sv'),
                de: t('language.de'),
              }}
              placeholder={t('dropdown.noneSelected')}
            />
          </div>
        </div>

        {/* Background */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="ml-1 text-xs font-bold tracking-widest text-gray-500 uppercase">
              {t('settings.background')}
            </p>
            <button
              type="button"
              onClick={resetBackground}
              className="rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--accent-color)] uppercase transition-colors hover:bg-[var(--accent-bg)]"
            >
              Reset
            </button>
          </div>

          {/* Mode Selector - Compact */}
          <div className="grid grid-cols-4 gap-2">
            {bgModes.map((mode) => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => setBgMode(mode.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-all ${
                    active
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]'
                      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
                >
                  <ModeIcon className="h-4 w-4" />
                  <span className="text-[10px] leading-tight font-bold tracking-wider uppercase">
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
            <div className="py-2 text-center">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {t('settings.bgFollowThemeHint')}
              </p>
            </div>
          )}

          {bgMode === 'solid' && (
            <div className="flex items-center gap-4 py-2">
              <label className="group relative cursor-pointer">
                <span className="sr-only">{t('settings.bgSolid')}</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div
                  className="h-12 w-12 rounded-xl border-2 border-[var(--glass-border)] shadow-inner transition-colors group-hover:border-[var(--accent-color)]"
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
                  className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
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
                      className={`h-14 w-14 rounded-xl transition-all ${
                        active
                          ? 'scale-110 ring-2 ring-[var(--accent-color)] ring-offset-2 ring-offset-[var(--modal-bg)]'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                    />
                    <p
                      className={`mt-1.5 text-center text-[9px] font-bold tracking-wider uppercase ${active ? 'text-[var(--accent-color)]' : 'text-[var(--text-muted)]'}`}
                    >
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
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3.5 pl-10 text-xs text-[var(--text-primary)] transition-colors outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)]"
                    placeholder={t('settings.bgUrl')}
                  />
                  <Link className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>
            </div>
          )}

          {/* Behavior */}
          <div className="space-y-6 border-t border-[var(--glass-border)] pt-4">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <Home className="h-4 w-4 text-[var(--accent-color)]" />
                  {t('settings.inactivity')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newVal = inactivityTimeout > 0 ? 0 : 60;
                      setInactivityTimeout(newVal);
                      try {
                        localStorage.setItem('tunet_inactivity_timeout', String(newVal));
                      } catch {}
                    }}
                    className={`relative h-6 w-10 rounded-full p-1 transition-colors ${inactivityTimeout > 0 ? 'bg-[var(--accent-color)]' : 'bg-gray-500/30'}`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${inactivityTimeout > 0 ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              {inactivityTimeout > 0 && (
                <div className="animate-in fade-in slide-in-from-top-1 px-1 pt-2 duration-200">
                  <div className="mb-1 flex justify-end">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                      {inactivityTimeout}s
                    </span>
                  </div>
                  <M3Slider
                    min={10}
                    max={300}
                    step={10}
                    value={inactivityTimeout}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      setInactivityTimeout(val);
                      try {
                        localStorage.setItem('tunet_inactivity_timeout', String(val));
                      } catch {}
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
  const [layoutSections, setLayoutSections] = useState({
    grid: true,
    spacing: false,
    cards: false,
  });
  const toggleSection = (key) => setLayoutSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const _renderLayoutTab = () => {
    const ResetButton = ({ onClick }) => (
      <button
        onClick={onClick}
        className="rounded-full p-1 text-[var(--text-muted)] transition-all hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
        title="Reset"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    );
    ResetButton.propTypes = {
      onClick: PropTypes.func,
    };

    // Accordion section wrapper
    const Section = ({ id, icon: Icon, title, children }) => {
      const isOpen = layoutSections[id];
      return (
        <div
          className={`rounded-2xl px-3 py-0.5 transition-all ${isOpen ? 'bg-white/[0.03]' : ''}`}
        >
          <button
            type="button"
            onClick={() => toggleSection(id)}
            className="group flex w-full items-center gap-3 py-2.5 text-left transition-colors"
          >
            <div
              className={`rounded-xl p-1.5 transition-colors ${isOpen ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span
              className={`flex-1 text-[13px] font-semibold transition-colors ${isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
            >
              {title}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div
            className="grid transition-all duration-200 ease-in-out"
            style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div className="space-y-5 pt-0.5 pr-0 pb-3 pl-7">{children}</div>
            </div>
          </div>
        </div>
      );
    };
    Section.propTypes = {
      id: PropTypes.string,
      icon: PropTypes.elementType,
      title: PropTypes.string,
      children: PropTypes.node,
    };

    const hts = sectionSpacing?.headerToStatus ?? 16;
    const stn = sectionSpacing?.statusToNav ?? 24;
    const ntg = sectionSpacing?.navToGrid ?? 24;

    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-1 font-sans duration-300">
        {/* Header row: title + live preview */}
        <div className="flex items-center justify-between px-1 pb-3">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            {t('settings.layout')}
          </p>
          <button
            type="button"
            onClick={() => setLayoutPreview((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${
              layoutPreview
                ? 'border-[var(--accent-color)] bg-[var(--accent-bg)] text-[var(--accent-color)]'
                : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            aria-pressed={layoutPreview}
          >
            <Monitor className="h-3 w-3" />
            {t('settings.livePreview')}
          </button>
        </div>

        {/* ── Grid Section ── */}
        <Section id="grid" icon={Columns} title={t('settings.layoutGrid')}>
          {/* Columns */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.gridDynamic')}
              </span>
              <div className="flex rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5">
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(false)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${dynamicGridColumns ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]' : 'text-white'}`}
                  style={dynamicGridColumns ? {} : { backgroundColor: 'var(--accent-color)' }}
                >
                  {t('settings.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(true)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${dynamicGridColumns ? 'text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  style={dynamicGridColumns ? { backgroundColor: 'var(--accent-color)' } : {}}
                >
                  {t('common.auto')}
                </button>
              </div>
            </div>
            {dynamicGridColumns && (
              <p className="mb-2.5 text-[11px] text-[var(--text-muted)]">
                {t('settings.gridDynamicHint')}
              </p>
            )}
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.gridColumns')}
              </span>
              {gridColumns !== 4 && (
                <ResetButton onClick={() => setGridColumns(Math.min(4, maxGridColumns))} />
              )}
            </div>
            <div className="flex gap-1.5 rounded-xl p-0.5">
              {Array.from(
                { length: MAX_GRID_COLUMNS - MIN_GRID_COLUMNS + 1 },
                (_, index) => MIN_GRID_COLUMNS + index
              ).map((cols) =>
                (() => {
                  const isSelected = effectiveGridColumns === cols;
                  const isDisabled = cols > selectableMaxGridColumns;
                  const className = isSelected
                    ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
                    : isDisabled
                      ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5';

                  return (
                    <button
                      key={cols}
                      onClick={() => cols <= selectableMaxGridColumns && setGridColumns(cols)}
                      disabled={isDisabled}
                      className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${className}`}
                    >
                      {cols}
                    </button>
                  );
                })()
              )}
            </div>
          </div>

          {/* Grid Spacing */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.gridGap') || 'Grid Spacing'}
              </span>
              {(gridGapH !== 20 || gridGapV !== 20) && (
                <ResetButton
                  onClick={() => {
                    setGridGapH(20);
                    setGridGapV(20);
                  }}
                />
              )}
            </div>

            <div className="ml-1 space-y-5 border-l-2 border-[var(--glass-border)] pl-3">
              {/* Horizontal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                    {t('settings.gridGapH') || 'Vannrett'}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                    {gridGapH}px
                  </span>
                </div>
                <M3Slider
                  min={0}
                  max={64}
                  step={4}
                  value={gridGapH}
                  onChange={(e) => setGridGapH(Number.parseInt(e.target.value, 10))}
                  colorClass="bg-[var(--accent-color)]"
                />
              </div>

              {/* Vertical */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
                    {t('settings.gridGapV') || 'Loddrett'}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                    {gridGapV}px
                  </span>
                </div>
                <M3Slider
                  min={0}
                  max={64}
                  step={4}
                  value={gridGapV}
                  onChange={(e) => setGridGapV(Number.parseInt(e.target.value, 10))}
                  colorClass="bg-[var(--accent-color)]"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Spacing Section ── */}
        <Section id="spacing" icon={LayoutGrid} title={t('settings.sectionSpacing')}>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.sectionSpacingHeader')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{hts}px</span>
                {hts !== 16 && (
                  <ResetButton onClick={() => updateSectionSpacing({ headerToStatus: 16 })} />
                )}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={4}
              value={hts}
              onChange={(e) =>
                updateSectionSpacing({ headerToStatus: Number.parseInt(e.target.value, 10) })
              }
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.sectionSpacingNav')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{stn}px</span>
                {stn !== 24 && (
                  <ResetButton onClick={() => updateSectionSpacing({ statusToNav: 24 })} />
                )}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={4}
              value={stn}
              onChange={(e) =>
                updateSectionSpacing({ statusToNav: Number.parseInt(e.target.value, 10) })
              }
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.sectionSpacingGrid')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{ntg}px</span>
                {ntg !== 24 && (
                  <ResetButton onClick={() => updateSectionSpacing({ navToGrid: 24 })} />
                )}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={4}
              value={ntg}
              onChange={(e) =>
                updateSectionSpacing({ navToGrid: Number.parseInt(e.target.value, 10) })
              }
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
        </Section>

        {/* ── Card Style Section ── */}
        <Section id="cards" icon={Eye} title={t('settings.layoutCards')}>
          {/* Border Radius */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.cardRadius')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {cardBorderRadius}px
                </span>
                {cardBorderRadius !== 16 && <ResetButton onClick={() => setCardBorderRadius(16)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={2}
              value={cardBorderRadius}
              onChange={(e) => setCardBorderRadius(Number.parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          {/* Transparency */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.transparency')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {cardTransparency}%
                </span>
                {cardTransparency !== 40 && <ResetButton onClick={() => setCardTransparency(40)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={100}
              step={5}
              value={cardTransparency}
              onChange={(e) => setCardTransparency(Number.parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
          {/* Border Opacity */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                {t('settings.borderOpacity')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                  {cardBorderOpacity}%
                </span>
                {cardBorderOpacity !== 5 && <ResetButton onClick={() => setCardBorderOpacity(5)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={50}
              step={5}
              value={cardBorderOpacity}
              onChange={(e) => setCardBorderOpacity(Number.parseInt(e.target.value, 10))}
              colorClass="bg-[var(--accent-color)]"
            />
          </div>
        </Section>
      </div>
    );
  };

  // ─── Updates Tab ───
  const renderUpdatesTab = () => {
    const updates = entities
      ? Object.keys(entities)
          .filter((id) => id.startsWith('update.') && entities[id].state === 'on')
          .map((id) => entities[id])
      : [];

    if (updates.length === 0) {
      return (
        <div className="animate-in fade-in slide-in-from-right-4 space-y-8 font-sans duration-300">
          <div className="rounded-2xl bg-[var(--glass-bg)] p-8 text-center">
            <Check className="mx-auto mb-4 h-12 w-12 text-green-400" />
            <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
              {t('updates.none')}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">{t('updates.allUpToDate')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-right-4 space-y-3 font-sans duration-300">
        {updates.map((update) => {
          const installedVersion = update.attributes?.installed_version;
          const latestVersion = update.attributes?.latest_version;
          const entityPicture = update.attributes?.entity_picture
            ? getEntityImageUrl(update.attributes.entity_picture)
            : null;
          const isInstalling = installingIds[update.entity_id];
          const hasNotes = !!(update.attributes?.release_summary || update.attributes?.release_url);
          const isExpanded = expandedNotes[update.entity_id];

          return (
            <div
              key={update.entity_id}
              className="overflow-hidden rounded-2xl bg-[var(--glass-bg)] transition-all hover:bg-[var(--glass-bg-hover)]"
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] p-1.5">
                    {entityPicture ? (
                      <img src={entityPicture} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Download className="h-5 w-5 text-[var(--accent-color)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {update.attributes?.title ||
                        update.attributes?.friendly_name ||
                        update.entity_id}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {installedVersion && (
                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <span className="text-[10px] font-bold tracking-wider uppercase opacity-50">
                            {t('updates.from')}
                          </span>
                          <span className="rounded border border-[var(--glass-border)] bg-[var(--glass-bg)] px-1.5 py-0.5 font-mono text-[10px] opacity-80">
                            {installedVersion}
                          </span>
                        </div>
                      )}
                      {installedVersion && latestVersion && (
                        <ArrowRight className="h-3 w-3 text-[var(--text-muted)] opacity-30" />
                      )}
                      {latestVersion && (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <span className="text-[10px] font-bold tracking-wider uppercase opacity-50">
                            {t('updates.to')}
                          </span>
                          <span className="rounded border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                            {latestVersion}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buttons: stack vertically on very small screens */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleSkipUpdate(update.entity_id)}
                      className="hidden rounded-xl bg-[var(--glass-bg-hover)] px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-all hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] sm:block"
                    >
                      {t('updates.skip')}
                    </button>
                    <button
                      onClick={() => handleInstallUpdate(update.entity_id)}
                      disabled={isInstalling}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${
                        isInstalling
                          ? 'cursor-wait bg-[var(--accent-bg)] text-white/70'
                          : 'bg-[var(--accent-color)] text-white shadow-lg hover:bg-[var(--accent-color)] active:scale-95'
                      }`}
                    >
                      {isInstalling && <RefreshCw className="h-3 w-3 animate-spin" />}
                      {isInstalling ? t('updates.installing') : t('updates.update')}
                    </button>
                  </div>
                </div>

                {/* Mobile skip button */}
                <div className="mt-2 flex justify-end sm:hidden">
                  <button
                    onClick={() => handleSkipUpdate(update.entity_id)}
                    className="rounded-lg bg-[var(--glass-bg-hover)] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
                  >
                    {t('updates.skip')}
                  </button>
                </div>
              </div>

              {/* Expandable Release Notes */}
              {hasNotes && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() =>
                      setExpandedNotes((prev) => ({
                        ...prev,
                        [update.entity_id]: !prev[update.entity_id],
                      }))
                    }
                    className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[var(--accent-color)] uppercase transition-colors hover:text-[var(--text-primary)]"
                  >
                    {isExpanded ? t('updates.showLess') : t('updates.showMore')}
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 mt-3 duration-200">
                      {(update.attributes?.release_summary || update.attributes?.body) && (
                        <div className="custom-scrollbar max-h-60 overflow-y-auto rounded-lg bg-black/20 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)] opacity-90 select-text">
                          {update.attributes.release_summary || update.attributes.body}
                        </div>
                      )}
                      {update.attributes?.release_url && (
                        <a
                          href={update.attributes.release_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-[var(--accent-color)] uppercase hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('updates.readMore')} <ArrowRight className="h-3 w-3" />
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
        backgroundColor: isLayoutPreview ? 'transparent' : 'rgba(0,0,0,0.3)',
      }}
      onMouseDown={handleBackdropClick}
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
        className={`popup-anim relative flex w-full flex-col overflow-hidden border font-sans text-[var(--text-primary)] ${
          isLayoutPreview
            ? 'animate-in slide-in-from-right-8 fade-in zoom-in-95 h-full max-w-[18rem] origin-right scale-[0.94] rounded-none shadow-2xl duration-300 sm:max-w-[21rem] sm:scale-[0.97] md:max-w-[23rem] md:scale-100 md:rounded-l-[2.5rem]'
            : 'h-[75vh] max-h-[700px] max-w-5xl rounded-3xl shadow-2xl md:rounded-[3rem]'
        }`}
        style={{
          background: 'linear-gradient(160deg, var(--card-bg) 0%, var(--modal-bg) 70%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
      >
        {isOnboardingActive ? (
          <div className="flex h-full flex-col md:flex-row">
            {/* Onboarding Sidebar */}
            <div className="flex w-full flex-row gap-1 border-b border-[var(--glass-border)] p-3 md:w-64 md:flex-col md:border-r md:border-b-0">
              <div className="mb-2 hidden items-center gap-3 px-3 py-4 md:flex">
                <div className="rounded-lg bg-[var(--accent-bg)] p-2 text-[var(--accent-color)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold tracking-wide">{t('onboarding.title')}</span>
              </div>

              {onboardingSteps.map((step, index) => {
                const isActive = onboardingStep === index;
                const isDone = onboardingStep > index;
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`flex flex-1 cursor-default items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-wide uppercase transition-all md:flex-none ${isActive ? 'bg-[var(--accent-color)] text-white shadow-lg ' : ''} ${isDone ? 'bg-green-500/10 text-green-400' : ''} ${!isActive && !isDone ? 'text-[var(--text-secondary)] opacity-50' : ''}`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    <span className="hidden md:inline">{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Onboarding Content Area */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[var(--glass-border)] p-6 md:hidden">
                <h3 className="text-lg font-bold tracking-wide uppercase">
                  {onboardingSteps[onboardingStep].label}
                </h3>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5">
                <div className="mb-4 hidden items-center justify-between md:flex">
                  <h2 className="text-xl font-bold">{onboardingSteps[onboardingStep].label}</h2>
                </div>

                {onboardingStep === 0 && (
                  <div className="animate-in fade-in slide-in-from-right-4 space-y-4 duration-300">
                    {/* Auth Method Toggle — hidden in Ingress mode (always token) */}
                    {!config.isIngress && renderAuthMethodToggle(true)}

                    {config.isIngress && (
                      <div className="rounded-xl border border-[var(--accent-color)] bg-[var(--accent-bg)] p-3 text-xs leading-relaxed text-[var(--accent-color)]">
                        <strong>Add-on Mode:</strong> URL is auto-detected. Just paste a Long-Lived
                        Access Token from your HA Profile.
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* URL — hidden in Ingress (auto-detected), shown otherwise */}
                      {!config.isIngress && (
                        <div className="space-y-1.5">
                          <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                            {t('system.haUrlPrimary')}
                          </label>
                          <input
                            type="text"
                            className={`w-full rounded-xl border-2 bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] ${onboardingUrlError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-[var(--accent-color)]'}`}
                            value={config.url}
                            onChange={(e) => {
                              setConfig({ ...config, url: e.target.value.trim() });
                              setOnboardingUrlError('');
                              setConnectionTestResult(null);
                            }}
                            placeholder={t('onboarding.haUrlPlaceholder')}
                          />
                          {onboardingUrlError && (
                            <p className="ml-1 text-xs font-bold text-red-400">
                              {onboardingUrlError}
                            </p>
                          )}
                        </div>
                      )}

                      {/* OAuth2 mode — show login button */}
                      {!config.isIngress && isOAuth && (
                        <div className="pt-2">{renderOAuthSection()}</div>
                      )}

                      {/* Token mode — show token + fallback */}
                      {!isOAuth && (
                        <>
                          <div className="space-y-1.5">
                            <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                              {t('system.token')}
                            </label>
                            <textarea
                              className={`h-24 w-full rounded-xl border-2 bg-[var(--glass-bg)] px-3 py-2 font-mono text-xs leading-tight text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] ${onboardingTokenError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-[var(--accent-color)]'}`}
                              value={config.token}
                              onChange={(e) => {
                                setConfig({ ...config, token: e.target.value.trim() });
                                setOnboardingTokenError('');
                                setConnectionTestResult(null);
                              }}
                              placeholder={t('onboarding.tokenPlaceholder')}
                            />
                            {onboardingTokenError && (
                              <p className="ml-1 text-xs font-bold text-red-400">
                                {onboardingTokenError}
                              </p>
                            )}
                          </div>

                          {!config.isIngress && (
                            <div className="space-y-1.5">
                              <label className="ml-1 text-xs font-bold text-gray-500 uppercase">
                                {t('system.haUrlFallback')}
                              </label>
                              <input
                                type="text"
                                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] transition-all outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-color)]"
                                value={config.fallbackUrl}
                                onChange={(e) =>
                                  setConfig({ ...config, fallbackUrl: e.target.value.trim() })
                                }
                                placeholder={t('common.optional')}
                              />
                              <p className="ml-1 text-[10px] leading-tight text-[var(--text-muted)]">
                                {t('onboarding.fallbackHint')}
                              </p>
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
                          disabled={
                            !config.url ||
                            !config.token ||
                            !validateUrl(config.url) ||
                            testingConnection
                          }
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold tracking-widest uppercase shadow-lg transition-all ${!config.url || !config.token || !validateUrl(config.url) || testingConnection ? 'cursor-not-allowed bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50' : 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)] '}`}
                        >
                          {testingConnection ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Wifi className="h-5 w-5" />
                          )}
                          {testingConnection
                            ? t('onboarding.testing')
                            : t('onboarding.testConnection')}
                        </button>

                        {connectionTestResult && (
                          <div
                            className={`animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 rounded-xl p-3 ${connectionTestResult.success ? 'border border-green-500/30 bg-green-500/20 text-green-400' : 'border border-red-500/30 bg-red-500/20 text-red-400'}`}
                          >
                            {connectionTestResult.success ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                            <span className="text-sm font-bold">
                              {connectionTestResult.message}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {onboardingStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 space-y-6 duration-300">
                    <div className="space-y-4">
                      <p className="ml-1 text-xs font-bold text-gray-500 uppercase">
                        {t('settings.language')}
                      </p>
                      <ModernDropdown
                        label={t('settings.language')}
                        icon={Globe}
                        options={['en', 'nb', 'nn', 'sv', 'de']}
                        current={language}
                        onChange={setLanguage}
                        map={{
                          en: t('language.en'),
                          nb: t('language.nb'),
                          nn: t('language.nn'),
                          sv: t('language.sv'),
                          de: t('language.de'),
                        }}
                        placeholder={t('dropdown.noneSelected')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="ml-1 flex justify-between text-xs font-bold text-gray-500 uppercase">
                        {t('settings.inactivity')}
                        <span className="text-[var(--text-primary)]">
                          {inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}
                        </span>
                      </label>
                      <div className="px-1 py-2">
                        <M3Slider
                          min={0}
                          max={300}
                          step={10}
                          value={inactivityTimeout}
                          onChange={(e) => {
                            const val = Number.parseInt(e.target.value, 10);
                            setInactivityTimeout(val);
                            try {
                              localStorage.setItem('tunet_inactivity_timeout', String(val));
                            } catch {}
                          }}
                          colorClass="bg-[var(--accent-color)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="animate-in fade-in zoom-in flex h-full flex-col items-center justify-center space-y-6 p-4 text-center duration-500">
                    <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-500 text-white shadow-xl shadow-green-500/30">
                      <Check className="h-12 w-12" />
                    </div>
                    <h4 className="text-3xl font-bold text-[var(--text-primary)]">
                      {t('onboarding.finishTitle')}
                    </h4>
                    <p className="mt-2 max-w-sm text-lg text-[var(--text-secondary)]">
                      {t('onboarding.finishBody')}
                    </p>
                  </div>
                )}
              </div>

              {/* Onboarding Footer */}
              <div className="flex gap-3 border-t border-[var(--glass-border)] p-4">
                <button
                  onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                  className="flex-1 rounded-xl border border-[var(--glass-border)] py-3 font-bold tracking-widest text-[var(--text-secondary)] uppercase transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                  disabled={onboardingStep === 0}
                  style={{
                    opacity: onboardingStep === 0 ? 0 : 1,
                    pointerEvents: onboardingStep === 0 ? 'none' : 'auto',
                  }}
                >
                  {t('onboarding.back')}
                </button>
                {onboardingStep < onboardingSteps.length - 1 ? (
                  <button
                    onClick={() =>
                      setOnboardingStep((s) => Math.min(onboardingSteps.length - 1, s + 1))
                    }
                    disabled={!canAdvanceOnboarding}
                    className={`flex-1 rounded-xl py-3 font-bold tracking-widest uppercase shadow-lg transition-all ${canAdvanceOnboarding ? 'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color)] ' : 'cursor-not-allowed border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50'}`}
                  >
                    {t('onboarding.next')}
                  </button>
                ) : (
                  <button
                    onClick={onFinishOnboarding}
                    className="flex-1 rounded-xl bg-green-500 py-3 font-bold tracking-widest text-white uppercase shadow-lg shadow-green-500/20 transition-all hover:bg-green-600"
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
              <div className="animate-in fade-in slide-in-from-left-4 flex w-full flex-shrink-0 flex-row gap-1 border-b border-[var(--glass-border)] bg-[linear-gradient(160deg,var(--glass-bg),transparent_70%)] p-2 duration-300 md:w-56 md:flex-col md:border-r md:border-b-0 md:p-3">
                <div className="mb-2 hidden items-center gap-3 px-3 py-4 md:flex">
                  <div className="rounded-lg bg-[var(--accent-bg)] p-2 text-[var(--accent-color)]">
                    <Settings className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-bold tracking-wide">{t('system.title')}</span>
                </div>

                {availableTabs.map((tab) => {
                  const active = configTab === tab.key;
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setConfigTab(tab.key)}
                      className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold tracking-wide uppercase transition-all md:flex-none md:justify-start md:px-4 md:py-3 ${
                        active
                          ? 'bg-[var(--accent-color)] text-white shadow-lg '
                          : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <TabIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden text-xs md:inline">{tab.label}</span>
                    </button>
                  );
                })}

                <div className="mt-auto hidden flex-col gap-2 border-t border-[var(--glass-border)] pt-4 md:flex">
                  <button
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold tracking-widest text-white uppercase shadow-lg shadow-green-500/20 transition-all hover:bg-green-600"
                  >
                    <Check className="h-4 w-4" />
                    {t('system.save')}
                  </button>
                  <div className="pt-2 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-50">
                      Tunet Dashboard v{__APP_VERSION__}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className={`flex items-center justify-between border-b border-[var(--glass-border)] p-4 ${isLayoutPreview ? 'relative overflow-hidden bg-[var(--glass-bg)]' : 'md:hidden'}`}
              >
                {isLayoutPreview && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-[var(--accent-bg)]/50 via-transparent to-transparent" />
                )}
                <div className="relative flex items-center gap-3">
                  <div className="rounded-lg bg-[var(--accent-bg)] p-2 text-[var(--accent-color)] shadow-inner">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold tracking-wide uppercase">
                    {availableTabs.find((tb) => tb.key === configTab)?.label}
                  </h3>
                </div>
                <button onClick={onClose} className="modal-close relative">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div
                className={`custom-scrollbar flex-1 overflow-y-auto ${isLayoutPreview ? 'p-5 md:p-6' : 'p-5 md:p-8'}`}
              >
                {/* Desktop Header */}
                {!isLayoutPreview && (
                  <div className="mb-8 hidden items-center justify-between md:flex">
                    <h2 className="text-2xl font-bold">
                      {availableTabs.find((tab) => tab.key === configTab)?.label}
                    </h2>
                    <button
                      onClick={handleClose}
                      className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {configTab === 'connection' && renderConnectionTab()}
                {configTab === 'profiles' && renderProfilesTab()}
                {configTab === 'updates' && renderUpdatesTab()}
              </div>

              {/* Mobile Footer */}
              {!isLayoutPreview && (
                <div className="border-t border-[var(--glass-border)] p-3 md:hidden">
                  <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-green-500 py-2.5 text-sm font-bold tracking-widest text-white uppercase shadow-lg shadow-green-500/20 transition-all hover:bg-green-600"
                  >
                    {t('system.save')}
                  </button>
                  <div className="pt-2 text-center">
                    <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase opacity-50">
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

const onboardingStepShape = PropTypes.shape({
  key: PropTypes.string,
  label: PropTypes.string,
  icon: PropTypes.elementType,
});

const configShape = PropTypes.shape({
  url: PropTypes.string,
  fallbackUrl: PropTypes.string,
  token: PropTypes.string,
  authMethod: PropTypes.string,
  isIngress: PropTypes.bool,
});

const haUserShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  name: PropTypes.string,
  is_owner: PropTypes.bool,
  is_admin: PropTypes.bool,
});

const autoSyncShape = PropTypes.shape({
  status: PropTypes.string,
  enabled: PropTypes.bool,
  deviceId: PropTypes.string,
  lastSyncedAt: PropTypes.string,
  knownDevices: PropTypes.array,
  history: PropTypes.array,
  publishing: PropTypes.bool,
  removingDeviceId: PropTypes.string,
  updatingDeviceId: PropTypes.string,
  error: PropTypes.string,
  setEnabled: PropTypes.func,
  loadCurrentFromServer: PropTypes.func,
  publishCurrentToDevices: PropTypes.func,
  renameKnownDevice: PropTypes.func,
  removeKnownDevice: PropTypes.func,
});

const profilesShape = PropTypes.shape({
  haUser: haUserShape,
  profiles: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.string,
  loadSummary: PropTypes.string,
  backendAvailable: PropTypes.bool,
  saveProfile: PropTypes.func,
  editProfile: PropTypes.func,
  loadProfile: PropTypes.func,
  removeProfile: PropTypes.func,
  importDashboard: PropTypes.func,
  exportDashboard: PropTypes.func,
  startBlank: PropTypes.func,
  autoSync: autoSyncShape,
});

ConfigModal.propTypes = {
  open: PropTypes.bool,
  isOnboardingActive: PropTypes.bool,
  t: PropTypes.func,
  configTab: PropTypes.string,
  setConfigTab: PropTypes.func,
  onboardingSteps: PropTypes.arrayOf(onboardingStepShape),
  onboardingStep: PropTypes.number,
  setOnboardingStep: PropTypes.func,
  canAdvanceOnboarding: PropTypes.bool,
  connected: PropTypes.bool,
  activeUrl: PropTypes.string,
  config: configShape,
  setConfig: PropTypes.func,
  onboardingUrlError: PropTypes.string,
  setOnboardingUrlError: PropTypes.func,
  onboardingTokenError: PropTypes.string,
  setOnboardingTokenError: PropTypes.func,
  setConnectionTestResult: PropTypes.func,
  connectionTestResult: PropTypes.shape({
    success: PropTypes.bool,
    message: PropTypes.string,
  }),
  validateUrl: PropTypes.func,
  testConnection: PropTypes.func,
  testingConnection: PropTypes.bool,
  startOAuthLogin: PropTypes.func,
  handleOAuthLogout: PropTypes.func,
  themes: PropTypes.object,
  currentTheme: PropTypes.string,
  setCurrentTheme: PropTypes.func,
  language: PropTypes.string,
  setLanguage: PropTypes.func,
  inactivityTimeout: PropTypes.number,
  setInactivityTimeout: PropTypes.func,
  gridGapH: PropTypes.number,
  setGridGapH: PropTypes.func,
  gridGapV: PropTypes.number,
  setGridGapV: PropTypes.func,
  gridColumns: PropTypes.number,
  setGridColumns: PropTypes.func,
  dynamicGridColumns: PropTypes.bool,
  setDynamicGridColumns: PropTypes.func,
  cardBorderRadius: PropTypes.number,
  setCardBorderRadius: PropTypes.func,
  bgMode: PropTypes.string,
  setBgMode: PropTypes.func,
  bgColor: PropTypes.string,
  setBgColor: PropTypes.func,
  bgGradient: PropTypes.string,
  setBgGradient: PropTypes.func,
  bgImage: PropTypes.string,
  setBgImage: PropTypes.func,
  cardTransparency: PropTypes.number,
  setCardTransparency: PropTypes.func,
  cardBorderOpacity: PropTypes.number,
  setCardBorderOpacity: PropTypes.func,
  sectionSpacing: PropTypes.shape({
    headerToStatus: PropTypes.number,
    statusToNav: PropTypes.number,
    navToGrid: PropTypes.number,
  }),
  updateSectionSpacing: PropTypes.func,
  entities: PropTypes.objectOf(
    PropTypes.shape({
      entity_id: PropTypes.string,
      state: PropTypes.string,
      attributes: PropTypes.object,
    })
  ),
  getEntityImageUrl: PropTypes.func,
  callService: PropTypes.func,
  onClose: PropTypes.func,
  onFinishOnboarding: PropTypes.func,
  profiles: profilesShape,
};
