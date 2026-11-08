// Similar imports to ConfigModal
import React from 'react';
import { GRADIENT_PRESETS } from '../../contexts/ConfigContext';
import { useConfig } from '../../contexts';
import { backgroundImageUrl } from '../../utils/studioPreview';
import { Sparkles, Sun, Moon, Flame, Feather, Link, ChevronRight } from '../../icons';
import SidebarContainer from './SidebarContainer';
import CardStyleSection from './CardStyleSection';
import FontGallery from './FontGallery';
import ThemeGallery from './ThemeGallery';
import { SidebarGroupHeader, SidebarNavigation } from './SidebarControls';

export default function ThemeSidebar({
  open,
  onClose,
  onSwitchToLayout,
  onSwitchToHeader,
  t,
  themes,
  currentTheme,
  setCurrentTheme,
  bgMode,
  setBgMode,
  bgColor,
  setBgColor,
  bgGradient,
  setBgGradient,
  bgImage,
  setBgImage,
  onOpenGeneralSettings,
  cardMaterial,
  setCardMaterial,
  density,
  setDensity,
  cardScale,
  setCardScale,
  cardBorderRadius,
  setCardBorderRadius,
  cardTransparency,
  setCardTransparency,
  cardBorderOpacity,
  setCardBorderOpacity,
  cardBgColor,
  setCardBgColor,
}) {
  const { appFont, setAppFont } = useConfig();
  const bgModes = [
    { key: 'theme', icon: Sparkles, label: t('settings.bgFollowTheme') },
    { key: 'solid', icon: Sun, label: t('settings.bgSolid') },
    { key: 'gradient', icon: Moon, label: t('settings.bgGradient') },
    { key: 'custom', icon: Link, label: t('settings.bgCustom') },
    { key: 'animated', icon: Sparkles, label: t('settings.bgAurora') },
    { key: 'lavaLamp', icon: Flame, label: t('settings.bgLavaLamp') },
    { key: 'silk', icon: Feather, label: t('settings.bgSilk') },
  ];

  const resetBackground = () => {
    setBgMode('theme');
    setBgColor('#0f172a');
    setBgGradient('midnight');
    setBgImage('');
  };

  return (
    <SidebarContainer
      open={open}
      onClose={onClose}
      title={t('system.tabAppearance')}
      testId="theme-sidebar"
      closeLabel={t('nav.done')}
      peekLabel={t('settings.peekDashboard')}
      navigation={
        <SidebarNavigation
          active="appearance"
          onSwitchToTheme={() => {}}
          onSwitchToLayout={onSwitchToLayout}
          onSwitchToHeader={onSwitchToHeader}
          t={t}
        />
      }
    >
      <div className="sidebar-stack font-sans">
        <div>
          <SidebarGroupHeader title={t('settings.theme')} />
          <ThemeGallery
            themes={themes}
            currentTheme={currentTheme}
            onSelect={setCurrentTheme}
            t={t}
          />
        </div>

        {/* Background */}
        <div>
          <SidebarGroupHeader
            title={t('settings.background')}
            action={t('settings.reset')}
            onAction={resetBackground}
          />

          <div className="sidebar-background-grid">
            {bgModes.map((mode) => {
              const active = bgMode === mode.key;
              const ModeIcon = mode.icon;
              const previewStyle =
                mode.key === 'solid'
                  ? { background: bgColor }
                  : mode.key === 'gradient'
                    ? {
                        background: `linear-gradient(135deg, ${GRADIENT_PRESETS[bgGradient]?.from || '#0f172a'}, ${GRADIENT_PRESETS[bgGradient]?.to || '#020617'})`,
                      }
                    : mode.key === 'custom' && bgImage
                      ? {
                          backgroundImage: backgroundImageUrl(bgImage),
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setBgMode(mode.key)}
                  aria-pressed={active}
                  className={`sidebar-background-option ${active ? 'is-active' : ''}`}
                >
                  <span
                    className={`sidebar-background-option__preview sidebar-background-option__preview--${mode.key}`}
                    style={previewStyle}
                  >
                    <ModeIcon aria-hidden="true" />
                  </span>
                  <span className="sidebar-background-option__label">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific controls */}
          {bgMode === 'theme' && (
            <div className="sidebar-inline-panel text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {t('settings.bgFollowThemeHint')}
              </p>
            </div>
          )}

          {bgMode === 'solid' && (
            <div className="sidebar-inline-panel flex items-center gap-4">
              <div
                className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-xl border shadow-lg"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div
                  className="h-full w-full transition-colors"
                  style={{ backgroundColor: bgColor }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setBgColor(val);
                  }}
                  className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm uppercase transition-colors outline-none focus:border-[var(--glass-border)]"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    borderColor: 'var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="#0f172a"
                  maxLength={7}
                />
              </div>
            </div>
          )}

          {bgMode === 'gradient' && (
            <div className="sidebar-inline-panel flex flex-wrap gap-3">
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
                      className={`h-12 w-12 rounded-xl transition-all ${
                        active
                          ? 'scale-105 ring-2 ring-[var(--accent-color)]'
                          : 'opacity-80 hover:scale-105 hover:opacity-100'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {bgMode === 'custom' && (
            <div className="sidebar-inline-panel space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input
                    type="url"
                    value={bgImage}
                    onChange={(e) => setBgImage(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 pl-10 text-xs transition-colors outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--glass-border)]"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder={t('settings.bgUrl')}
                  />
                  <Link
                    className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <CardStyleSection
          t={t}
          cardMaterial={cardMaterial}
          setCardMaterial={setCardMaterial}
          density={density}
          setDensity={setDensity}
          cardScale={cardScale}
          setCardScale={setCardScale}
          cardBorderRadius={cardBorderRadius}
          setCardBorderRadius={setCardBorderRadius}
          cardTransparency={cardTransparency}
          setCardTransparency={setCardTransparency}
          cardBorderOpacity={cardBorderOpacity}
          setCardBorderOpacity={setCardBorderOpacity}
          cardBgColor={cardBgColor}
          setCardBgColor={setCardBgColor}
          themeCardColor={themes[currentTheme]?.colors['--card-bg'] ?? ''}
        />

        <div>
          <SidebarGroupHeader title={t('settings.appFont')} />
          <FontGallery current={appFont} onSelect={setAppFont} />
        </div>

        <button
          type="button"
          data-testid="appearance-general-link"
          onClick={onOpenGeneralSettings}
          className="sidebar-link-row"
        >
          <span>{t('settings.moreGeneralSettings')}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </SidebarContainer>
  );
}
