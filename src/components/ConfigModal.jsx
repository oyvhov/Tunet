import ModernDropdown from './ModernDropdown';
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
  Palette
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
  themes,
  currentTheme,
  setCurrentTheme,
  language,
  setLanguage,
  inactivityTimeout,
  setInactivityTimeout,
  onClose,
  onFinishOnboarding
}) {
  if (!open) return null;

  const handleClose = () => {
    if (!isOnboardingActive) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-12 md:pt-16" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={handleClose}>
      <div className="border w-full max-w-xl max-h-[95vh] rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative font-sans flex flex-col backdrop-blur-xl popup-anim" style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className={`absolute top-4 right-4 md:top-6 md:right-6 modal-close ${isOnboardingActive ? 'opacity-30 cursor-not-allowed' : ''}`}><X className="w-4 h-4" /></button>
        <h3 className="text-xl font-light mb-4 text-[var(--text-primary)] text-center uppercase tracking-widest italic">{isOnboardingActive ? t('onboarding.title') : t('system.title')}</h3>

        {isOnboardingActive ? (
          <div className="mb-8">
            <div className="grid grid-cols-4 gap-3">
              {onboardingSteps.map((step, index) => {
                const isActive = onboardingStep === index;
                const isDone = onboardingStep > index;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className={`relative flex flex-col items-center justify-center gap-2 px-2 py-3 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10' : isDone ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>
                    {isActive && <div className="absolute inset-0 rounded-2xl bg-blue-500/5 animate-pulse" />}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isDone ? 'bg-green-500 text-white scale-110' : isActive ? 'bg-blue-500 text-white scale-110' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
                      {isDone ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-center leading-tight">{step.label}</span>
                    {index < onboardingSteps.length - 1 && (
                      <div className={`absolute top-1/2 -right-[12px] w-6 h-[2px] transition-all duration-300 ${isDone ? 'bg-green-500/50' : 'bg-[var(--glass-border)]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setConfigTab('connection')} className={`flex-1 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${configTab === 'connection' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}>{t('system.tabConnection')}</button>
            <button onClick={() => setConfigTab('settings')} className={`flex-1 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${configTab === 'settings' ? 'popup-surface text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}>{t('system.tabSettings')}</button>
          </div>
        )}

        <div className="flex-1 overflow-visible pr-2">
          {isOnboardingActive ? (
            <div className="space-y-6 font-sans">
              {onboardingStep === 0 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="inline-flex p-6 rounded-full bg-blue-500/10 mb-4">
                      <Home className="w-16 h-16 text-blue-400" />
                    </div>
                    <h4 className="text-2xl font-light mb-3 text-[var(--text-primary)]">{t('onboarding.welcomeTitle')}</h4>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-md mx-auto">{t('onboarding.welcomeBody')}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-5 rounded-2xl popup-surface hover:bg-[var(--glass-bg-hover)] transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                          <Wifi className="w-5 h-5" />
                        </div>
                        <p className="text-xs uppercase font-bold tracking-widest text-gray-500">{t('onboarding.card.connectionTitle')}</p>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t('onboarding.card.connectionBody')}</p>
                    </div>
                    <div className="p-5 rounded-2xl popup-surface hover:bg-[var(--glass-bg-hover)] transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                          <Settings className="w-5 h-5" />
                        </div>
                        <p className="text-xs uppercase font-bold tracking-widest text-gray-500">{t('onboarding.card.preferencesTitle')}</p>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t('onboarding.card.preferencesBody')}</p>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3 flex items-center gap-2">
                      <Wifi className="w-4 h-4" />
                      {t('system.haUrlPrimary')}
                      {connected && activeUrl === config.url && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
                    </label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-2xl popup-surface text-[var(--text-primary)] border-2 transition-all ${onboardingUrlError ? 'border-red-500/50' : 'border-transparent focus:border-blue-500/50'}`}
                      value={config.url}
                      onChange={(e) => {
                        setConfig({ ...config, url: e.target.value });
                        setOnboardingUrlError('');
                        setConnectionTestResult(null);
                        if (e.target.value && !validateUrl(e.target.value)) {
                          setOnboardingUrlError(t('onboarding.invalidUrl'));
                        }
                      }}
                      placeholder={t('onboarding.haUrlPlaceholder')}
                    />
                    {onboardingUrlError && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold">
                        <AlertCircle className="w-4 h-4" />
                        {onboardingUrlError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {t('system.token')}
                    </label>
                    <textarea
                      className={`w-full px-4 py-3 h-32 rounded-2xl popup-surface text-[var(--text-primary)] border-2 transition-all font-mono text-sm ${onboardingTokenError ? 'border-red-500/50' : 'border-transparent focus:border-blue-500/50'}`}
                      value={config.token}
                      onChange={(e) => {
                        setConfig({ ...config, token: e.target.value });
                        setOnboardingTokenError('');
                        setConnectionTestResult(null);
                        if (e.target.value && e.target.value.length < 50) {
                          setOnboardingTokenError(t('onboarding.tokenTooShort'));
                        }
                      }}
                      placeholder={t('onboarding.tokenPlaceholder')}
                    />
                    {onboardingTokenError && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-bold">
                        <AlertCircle className="w-4 h-4" />
                        {onboardingTokenError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3 flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      {t('system.haUrlFallback')}
                      {connected && activeUrl === config.fallbackUrl && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-2xl popup-surface text-[var(--text-primary)] border-2 border-transparent focus:border-blue-500/50 transition-all"
                      value={config.fallbackUrl}
                      onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value })}
                      placeholder={t('common.optional')}
                    />
                    <p className="text-xs text-[var(--text-muted)] ml-3">{t('onboarding.fallbackHint')}</p>
                  </div>

                  <button
                    onClick={testConnection}
                    disabled={!config.url || !config.token || !validateUrl(config.url) || testingConnection}
                    className={`w-full py-3 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!config.url || !config.token || !validateUrl(config.url) || testingConnection ? 'bg-[var(--glass-bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'}`}
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {t('onboarding.testing')}
                      </>
                    ) : (
                      <>
                        <Wifi className="w-5 h-5" />
                        {t('onboarding.testConnection')}
                      </>
                    )}
                  </button>

                  {connectionTestResult && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 ${connectionTestResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {connectionTestResult.success ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest">{connectionTestResult.message}</p>
                        {connectionTestResult.success && <p className="text-xs text-[var(--text-secondary)] mt-1">{t('onboarding.readyToContinue')}</p>}
                      </div>
                    </div>
                  )}

                  {!connectionTestResult && config.url && config.token && validateUrl(config.url) && (
                    <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {t('onboarding.testRequired')}
                    </div>
                  )}
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-4">
                  <ModernDropdown label={t('settings.theme')} icon={Palette} options={Object.keys(themes)} current={currentTheme} onChange={setCurrentTheme} map={{ dark: t('theme.dark'), light: t('theme.light') }} placeholder={t('dropdown.noneSelected')} />
                  <ModernDropdown label={t('settings.language')} icon={Globe} options={['nn', 'en']} current={language} onChange={setLanguage} map={{ nn: t('language.nn'), en: t('language.en') }} placeholder={t('dropdown.noneSelected')} />
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3">{t('settings.inactivity')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={300}
                        step={10}
                        value={inactivityTimeout}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setInactivityTimeout(val);
                          localStorage.setItem('midttunet_inactivity_timeout', String(val));
                        }}
                        className="flex-1"
                      />
                      <div className="min-w-[64px] text-right text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                        {inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center py-6">
                    <div className="inline-flex p-6 rounded-full bg-green-500/10 mb-4">
                      <Check className="w-16 h-16 text-green-400" />
                    </div>
                    <h4 className="text-2xl font-light mb-3 text-[var(--text-primary)]">{t('onboarding.finishTitle')}</h4>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] max-w-md mx-auto">{t('onboarding.finishBody')}</p>
                  </div>
                  <div className="p-5 rounded-2xl popup-surface space-y-4">
                    <p className="text-xs uppercase font-bold tracking-widest text-gray-500">{t('onboarding.summary')}</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-400 flex-shrink-0">
                          <Wifi className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{t('system.haUrlPrimary')}</p>
                          <p className="text-sm text-[var(--text-primary)] truncate">{config.url}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-400 flex-shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{t('settings.language')}</p>
                          <p className="text-sm text-[var(--text-primary)]">{language === 'nn' ? t('language.nn') : t('language.en')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-400 flex-shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">{t('settings.theme')}</p>
                          <p className="text-sm text-[var(--text-primary)]">{currentTheme === 'dark' ? t('theme.dark') : t('theme.light')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {configTab === 'connection' && (
                <div className="space-y-5 font-sans">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3 flex items-center gap-2">{t('system.haUrlPrimary')}{connected && activeUrl === config.url && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}</label>
                    <input type="text" className="w-full px-4 py-3 rounded-2xl popup-surface text-[var(--text-primary)]" value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3 flex items-center gap-2">{t('system.haUrlFallback')}{connected && activeUrl === config.fallbackUrl && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}</label>
                    <input type="text" className="w-full px-4 py-3 rounded-2xl popup-surface text-[var(--text-primary)]" value={config.fallbackUrl} onChange={(e) => setConfig({ ...config, fallbackUrl: e.target.value })} placeholder={t('common.optional')} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3">{t('system.token')}</label>
                    <textarea className="w-full px-4 py-3 h-32 rounded-2xl popup-surface text-[var(--text-primary)]" value={config.token} onChange={(e) => setConfig({ ...config, token: e.target.value })} />
                  </div>
                </div>
              )}

              {configTab === 'settings' && (
                <div className="space-y-4 font-sans">
                  <ModernDropdown label={t('settings.theme')} icon={Palette} options={Object.keys(themes)} current={currentTheme} onChange={setCurrentTheme} map={{ dark: t('theme.dark'), light: t('theme.light') }} placeholder={t('dropdown.noneSelected')} />
                  <ModernDropdown label={t('settings.language')} icon={Globe} options={['nn', 'en']} current={language} onChange={setLanguage} map={{ nn: t('language.nn'), en: t('language.en') }} placeholder={t('dropdown.noneSelected')} />
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500 ml-3">{t('settings.inactivity')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={300}
                        step={10}
                        value={inactivityTimeout}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setInactivityTimeout(val);
                          localStorage.setItem('midttunet_inactivity_timeout', String(val));
                        }}
                        className="flex-1"
                      />
                      <div className="min-w-[64px] text-right text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                        {inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-[var(--glass-border)]">
          {isOnboardingActive ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOnboardingStep((s) => Math.max(0, s - 1))}
                className="flex-1 py-3 rounded-2xl text-[var(--text-secondary)] font-black uppercase tracking-widest border border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] transition-colors"
                disabled={onboardingStep === 0}
              >
                {t('onboarding.back')}
              </button>
              {onboardingStep < onboardingSteps.length - 1 ? (
                <button
                  onClick={() => setOnboardingStep((s) => Math.min(onboardingSteps.length - 1, s + 1))}
                  disabled={!canAdvanceOnboarding}
                  className={`flex-1 py-3 rounded-2xl font-black uppercase tracking-widest border transition-colors ${canAdvanceOnboarding ? 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10' : 'text-gray-500 border-[var(--glass-border)] opacity-60 cursor-not-allowed'}`}
                >
                  {t('onboarding.next')}
                </button>
              ) : (
                <button
                  onClick={onFinishOnboarding}
                  className="flex-1 py-3 rounded-2xl text-blue-400 font-black uppercase tracking-widest" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid' }}
                >
                  {t('onboarding.finish')}
                </button>
              )}
            </div>
          ) : (
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-blue-400 font-black uppercase tracking-widest" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid' }}>{t('system.save')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
