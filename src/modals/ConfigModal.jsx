import ModernDropdown from '../components/ModernDropdown';
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
  Download
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
  entities,
  onClose,
  onFinishOnboarding
}) {
  if (!open) return null;

  const handleClose = () => {
    if (!isOnboardingActive) onClose?.();
  };

  const renderConnectionTab = () => (
    <div className="space-y-6 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-3">
        <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          {t('system.haUrlPrimary')}
          {connected && activeUrl === config.url && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
        </label>
        <div className="relative group">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all placeholder:text-[var(--text-muted)] p-3"
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

      <div className="space-y-3">
        <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex items-center gap-2">
          <Server className="w-4 h-4" />
          {t('system.haUrlFallback')}
          {connected && activeUrl === config.fallbackUrl && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded text-[10px] tracking-widest">{t('system.connected')}</span>}
        </label>
        <div className="relative group">
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all placeholder:text-[var(--text-muted)] p-3"
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
            className="w-full px-4 py-3 h-32 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] focus:bg-[var(--glass-bg-hover)] focus:border-blue-500/50 outline-none transition-all font-mono text-xs leading-relaxed resize-none p-3"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value.trim() })}
            placeholder="ey..."
          />
           <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-8 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        <p className="text-xs uppercase font-bold text-gray-500 ml-1">Utseenede</p>
        <div className="grid grid-cols-1 gap-4">
          <ModernDropdown 
            label={t('settings.theme')} 
            icon={Palette} 
            options={Object.keys(themes)} 
            current={currentTheme} 
            onChange={setCurrentTheme} 
            map={{ dark: t('theme.dark'), light: t('theme.light') }} 
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

      <div className="space-y-4">
        <p className="text-xs uppercase font-bold text-gray-500 ml-1">Oppførsel</p>
        <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-400" />
              {t('settings.inactivity')}
            </label>
            <span className="px-2 py-1 rounded bg-[var(--glass-bg-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--glass-border)]">
              {inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}
            </span>
          </div>
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
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-2">
            <span>{t('common.off')}</span>
            <span>50%</span>
            <span>300s</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUpdatesTab = () => {
    const updates = entities ? Object.keys(entities).filter(id => 
      id.startsWith('update.') && entities[id].state === 'on'
    ).map(id => entities[id]) : [];

    if (updates.length === 0) {
      return (
        <div className="space-y-8 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-8 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('updates.none')}</h3>
            <p className="text-[var(--text-secondary)]">Alt systemet er oppdatert!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 font-sans animate-in fade-in slide-in-from-right-4 duration-300">
        {updates.map(update => (
          <div key={update.entity_id} className="p-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-blue-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  {update.attributes?.friendly_name || update.entity_id}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-2">
                  {update.attributes?.latest_version ? `Versjon: ${update.attributes.latest_version}` : ''}
                </p>
                {update.attributes?.release_summary && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2">{update.attributes.release_summary}</p>
                )}
              </div>
              <button
                onClick={() => {
                  // Call service to install update
                  if (window.HAWS && window.HAWS.conn) {
                    const conn = window.HAWS.conn;
                    const [domain, service] = update.entity_id.split('.');
                    conn.sendMessage({
                      type: 'call_service',
                      domain: domain === 'update' ? 'update' : domain,
                      service: 'install',
                      service_data: { entity_id: update.entity_id }
                    });
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wide transition-colors"
              >
                {t('updates.update')}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleClose}>
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
        className={`border w-full rounded-2xl md:rounded-3xl shadow-2xl relative font-sans flex flex-col overflow-hidden backdrop-blur-xl popup-anim bg-[var(--modal-bg)] border-[var(--glass-border)] text-[var(--text-primary)] ${isOnboardingActive ? 'max-w-4xl h-[600px] max-h-[90vh]' : 'max-w-4xl h-[600px] max-h-[90vh]'}`} 
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)' }}
      >
        {isOnboardingActive ? (
          // ONBOARDING LAYOUT - Redesigned to match System Settings Sidebar
          <div className="flex flex-col md:flex-row h-full">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-[var(--glass-bg)] flex flex-row md:flex-col gap-1 p-3 border-b md:border-b-0 md:border-r border-[var(--glass-border)]">
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

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--modal-bg)]">
              <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] md:hidden">
                 <h3 className="font-bold text-lg uppercase tracking-wide">{onboardingSteps[onboardingStep].label}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                {/* Desktop Header for Content */}
                <div className="hidden md:flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold">{onboardingSteps[onboardingStep].label}</h2>
                </div>

                {onboardingStep === 0 && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="space-y-3">
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
                     </div>

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
                  </div>
                )}

                {onboardingStep === 1 && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="space-y-4">
                        <p className="text-xs uppercase font-bold text-gray-500 ml-1">Lokalisering</p>
                        <ModernDropdown label={t('settings.language')} icon={Globe} options={['nn', 'en']} current={language} onChange={setLanguage} map={{ nn: t('language.nn'), en: t('language.en') }} placeholder={t('dropdown.noneSelected')} />
                     </div>
                     <div className="space-y-4">
                        <p className="text-xs uppercase font-bold text-gray-500 ml-1">Tema</p>
                        <ModernDropdown label={t('settings.theme')} icon={Palette} options={Object.keys(themes)} current={currentTheme} onChange={setCurrentTheme} map={{ dark: t('theme.dark'), light: t('theme.light') }} placeholder={t('dropdown.noneSelected')} />
                     </div>
                     <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-gray-500 ml-1 flex justify-between">
                        {t('settings.inactivity')}
                        <span className="text-[var(--text-primary)]">{inactivityTimeout === 0 ? t('common.off') : `${inactivityTimeout}s`}</span>
                      </label>
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
                        className="w-full accent-blue-500"
                      />
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

               {/* Footer Area */}
              <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--modal-bg)] flex gap-3">
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
          // SYSTEM SETTINGS LAYOUT (New Sidebar Design)
          <div className="flex flex-col md:flex-row h-full">
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-[var(--glass-bg)] flex flex-row md:flex-col gap-1 p-3 border-b md:border-b-0 md:border-r border-[var(--glass-border)]">
              <div className="hidden md:flex items-center gap-3 px-3 py-4 mb-2">
                 <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                   <Settings className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-lg tracking-wide">{t('system.title')}</span>
              </div>
              
              <button 
                onClick={() => setConfigTab('connection')}
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide ${configTab === 'connection' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Wifi className="w-4 h-4" />
                {t('system.tabConnection')}
              </button>
              
              <button 
                onClick={() => setConfigTab('settings')}
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide ${configTab === 'settings' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Monitor className="w-4 h-4" />
                {t('system.tabSettings')}
              </button>
              
              <button 
                onClick={() => setConfigTab('updates')}
                className={`flex-1 md:flex-none flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold uppercase tracking-wide ${configTab === 'updates' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Download className="w-4 h-4" />
                {t('updates.title')}
              </button>

              <div className="mt-auto hidden md:flex flex-col gap-2 pt-4 border-t border-[var(--glass-border)]">
                 <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    {t('system.save')}
                 </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--modal-bg)]">
              <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)] md:hidden">
                 <h3 className="font-bold text-lg uppercase tracking-wide">{configTab === 'connection' ? t('system.tabConnection') : configTab === 'settings' ? t('system.tabSettings') : t('updates.title')}</h3>
                 <button onClick={onClose} className="modal-close"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {/* Desktop Header for Content */}
                <div className="hidden md:flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-bold">{configTab === 'connection' ? t('system.tabConnection') : configTab === 'settings' ? t('system.tabSettings') : t('updates.title')}</h2>
                   <button onClick={handleClose} className="p-2 rounded-full hover:bg-[var(--glass-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                </div>

                {configTab === 'connection' && renderConnectionTab()}
                {configTab === 'settings' && renderSettingsTab()}
                {configTab === 'updates' && renderUpdatesTab()}
              </div>

              {/* Mobile Footer Area */}
              <div className="p-4 border-t border-[var(--glass-border)] md:hidden bg-[var(--modal-bg)]">
                <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20">
                  {t('system.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
