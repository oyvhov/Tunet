import { useEffect, useState } from 'react';
import ModernDropdown from '../components/ui/ModernDropdown';
import M3Slider from '../components/ui/M3Slider';
import { GRADIENT_PRESETS } from '../contexts/ConfigContext';
import { hasOAuthTokens } from '../services/oauthStorage';
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
  onFinishOnboarding
}) {
  const [installingIds, setInstallingIds] = useState({});
  const [expandedNotes, setExpandedNotes] = useState({});
  const [layoutPreview, setLayoutPreview] = useState(false);

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

  if (!open) return null;

  const handleClose = () => {
    if (!isOnboardingActive) onClose?.();
  };

  const TABS = [
    { key: 'connection', icon: Wifi, label: t('system.tabConnection') },
    // Appearance and Layout have been moved to Sidebars
    // { key: 'appearance', icon: Palette, label: t('system.tabAppearance') },
    // { key: 'layout', icon: LayoutGrid, label: t('system.tabLayout') },
    { key: 'updates', icon: Download, label: t('updates.title') },
  ];

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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative ${isOAuth ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${!isOAuth ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)]'}`}
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
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
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
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${!config.url || !validateUrl(config.url) ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'}`}
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
  const renderConnectionTab = () => (
    <div className="space-y-6 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Auth Method Toggle */}
      {renderAuthMethodToggle()}

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
            className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all placeholder:text-[var(--text-muted)]"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
            placeholder="https://homeassistant.local:8123"
          />
          <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
                className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all placeholder:text-[var(--text-muted)]"
                value={config.fallbackUrl}
                onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value.trim() })}
                placeholder={t('common.optional')}
              />
              <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
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
              <textarea
                className="w-full px-4 py-3 h-32 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all font-mono text-xs leading-relaxed resize-none"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value.trim() })}
                placeholder="ey..."
              />
              <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </>
      )}
    </div>
  );

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
              options={['nn', 'en']}
              current={language}
              onChange={setLanguage}
              map={{ nn: t('language.nn'), en: t('language.en') }}
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
                  colorClass="bg-blue-500"
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
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.gridColumns')}</span>
              {gridColumns !== 4 && <ResetButton onClick={() => setGridColumns(4)} />}
            </div>
            <div className="flex gap-1.5 p-0.5 rounded-xl">
              {[2, 3, 4, 5].map(cols => (
                <button
                  key={cols}
                  onClick={() => setGridColumns(cols)}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    gridColumns === cols
                      ? 'bg-[var(--accent-color)] text-white shadow-lg shadow-[var(--accent-color)]/20'
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
                      colorClass="bg-blue-500"
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
                      colorClass="bg-blue-500"
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
            <M3Slider min={0} max={64} step={4} value={hts} onChange={(e) => updateSectionSpacing({ headerToStatus: parseInt(e.target.value, 10) })} colorClass="bg-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.sectionSpacingNav')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{stn}px</span>
                {stn !== 24 && <ResetButton onClick={() => updateSectionSpacing({ statusToNav: 24 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={stn} onChange={(e) => updateSectionSpacing({ statusToNav: parseInt(e.target.value, 10) })} colorClass="bg-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t('settings.sectionSpacingGrid')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{ntg}px</span>
                {ntg !== 24 && <ResetButton onClick={() => updateSectionSpacing({ navToGrid: 24 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={ntg} onChange={(e) => updateSectionSpacing({ navToGrid: parseInt(e.target.value, 10) })} colorClass="bg-blue-500" />
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
              colorClass="bg-blue-500"
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
              colorClass="bg-blue-500"
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
              colorClass="bg-blue-500"
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
                      <Download className="w-5 h-5 text-blue-400" />
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
                          ? 'bg-blue-500/50 text-white/70 cursor-wait'
                          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95'
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
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
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
                    className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide cursor-default ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : ''} ${isDone ? 'text-green-400 bg-green-500/10' : ''} ${!isActive && !isDone ? 'text-[var(--text-secondary)] opacity-50' : ''}`}
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
                    {/* Auth Method Toggle */}
                    {renderAuthMethodToggle(true)}

                    <div className="space-y-3">
                      {/* URL — always shown */}
                      <div className="space-y-1.5">
                        <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.haUrlPrimary')}</label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] border-2 text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-sm ${onboardingUrlError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-blue-500/50'}`}
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

                      {/* OAuth2 mode — show login button */}
                      {isOAuth && (
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
                              className={`w-full px-3 py-2 h-24 rounded-xl bg-[var(--glass-bg)] border-2 text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-mono text-xs leading-tight ${onboardingTokenError ? 'border-red-500/50' : 'border-[var(--glass-border)] focus:border-blue-500/50'}`}
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

                          <div className="space-y-1.5">
                            <label className="text-xs uppercase font-bold text-gray-500 ml-1">{t('system.haUrlFallback')}</label>
                            <input
                              type="text"
                              className="w-full px-3 py-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-sm focus:border-blue-500/50"
                              value={config.fallbackUrl}
                              onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value.trim() })}
                              placeholder={t('common.optional')}
                            />
                            <p className="text-[10px] text-[var(--text-muted)] ml-1 leading-tight">{t('onboarding.fallbackHint')}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Test Connection — token mode only */}
                    {!isOAuth && (
                      <>
                        <button
                          onClick={testConnection}
                          disabled={!config.url || !config.token || !validateUrl(config.url) || testingConnection}
                          className={`w-full py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg text-sm ${!config.url || !config.token || !validateUrl(config.url) || testingConnection ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'}`}
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
                      <ModernDropdown label={t('settings.language')} icon={Globe} options={['nn', 'en']} current={language} onChange={setLanguage} map={{ nn: t('language.nn'), en: t('language.en') }} placeholder={t('dropdown.noneSelected')} />
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs uppercase font-bold text-gray-500 ml-1">{t('settings.theme')}</p>
                      <ModernDropdown label={t('settings.theme')} icon={Palette} options={Object.keys(themes)} current={currentTheme} onChange={setCurrentTheme} map={{ dark: t('theme.dark'), light: t('theme.light') }} placeholder={t('dropdown.noneSelected')} />
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
                          colorClass="bg-blue-500"
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
                    className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg ${canAdvanceOnboarding ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--glass-border)] cursor-not-allowed opacity-50'}`}
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
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
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
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
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
