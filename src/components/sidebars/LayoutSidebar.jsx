import React, { useEffect, useState } from 'react';
import M3Slider from '../ui/M3Slider';
import {
  getEffectiveGridColumnsForWidth,
  getMaxGridColumnsForWidth,
  MIN_GRID_COLUMNS,
} from '../../hooks/useResponsiveGrid';
import { MOBILE_BREAKPOINT } from '../../config/constants';
import { Columns, Eye, Maximize2, Navigation } from '../../icons';
import { usePages } from '../../contexts';
import SidebarContainer from './SidebarContainer';
import {
  SidebarAccordion,
  SidebarNavigation,
  SidebarResetButton as ResetButton,
  SidebarToggle as Toggle,
} from './SidebarControls';

const NAV_STYLE_OPTIONS = ['pill', 'segmented', 'underline', 'minimal', 'expand'];

/** @param {{ navStyle: string }} props */
function NavStylePreview({ navStyle }) {
  const items = [0, 1, 2];
  if (navStyle === 'segmented') {
    return (
      <div className="flex gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5">
        {items.map((item) => (
          <span
            key={item}
            className={`h-2.5 w-5 rounded-full ${item === 0 ? 'bg-[var(--text-secondary)]' : ''}`}
          />
        ))}
      </div>
    );
  }
  if (navStyle === 'underline') {
    return (
      <div className="flex gap-2 border-b border-[var(--glass-border)] pb-1">
        {items.map((item) => (
          <span key={item} className="relative h-1.5 w-5 rounded-full bg-[var(--text-muted)]">
            {item === 0 && (
              <span className="absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full bg-[var(--text-primary)]" />
            )}
          </span>
        ))}
      </div>
    );
  }
  if (navStyle === 'minimal') {
    return (
      <div className="flex gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`h-1.5 w-5 rounded-full ${item === 0 ? 'bg-[var(--text-primary)]' : 'bg-[var(--text-muted)] opacity-60'}`}
          />
        ))}
      </div>
    );
  }
  if (navStyle === 'expand') {
    return (
      <div className="flex items-center gap-1">
        <span className="h-3 w-8 rounded-full bg-[var(--text-secondary)]" />
        <span className="h-3 w-3 rounded-full bg-[var(--glass-bg-hover)]" />
        <span className="h-3 w-3 rounded-full bg-[var(--glass-bg-hover)]" />
      </div>
    );
  }
  return (
    <div className="flex gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={`h-3 w-6 rounded-full ${item === 0 ? 'bg-[var(--text-secondary)]' : 'bg-[var(--glass-bg-hover)]'}`}
        />
      ))}
    </div>
  );
}

export default function LayoutSidebar({
  open,
  onClose,
  onSwitchToTheme,
  onSwitchToHeader,
  t,
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
  cardTransparency,
  setCardTransparency,
  cardBorderOpacity,
  setCardBorderOpacity,
  cardBgColor,
  setCardBgColor,
  cardMaterial,
  setCardMaterial,
  density,
  setDensity,
  cardScale,
  setCardScale,
  sectionSpacing,
  updateSectionSpacing,
  activePage,
  pageSettings,
  savePageSetting,
}) {
  const [layoutSections, setLayoutSections] = useState({
    grid: true,
    spacing: false,
    cards: false,
    nav: false,
  });
  const { headerSettings, updateHeaderSettings } = usePages();
  const navStyle = NAV_STYLE_OPTIONS.includes(headerSettings?.navStyle)
    ? headerSettings.navStyle
    : 'pill';
  const navSize = ['sm', 'md', 'lg'].includes(headerSettings?.navSize)
    ? headerSettings.navSize
    : 'md';
  const updateNavSetting = (key, value) =>
    updateHeaderSettings({ ...headerSettings, [key]: value });
  const [gridViewportWidth, setGridViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return Number.POSITIVE_INFINITY;
    return window.innerWidth;
  });
  const maxGridColumns = getMaxGridColumnsForWidth(gridViewportWidth);
  const selectableMaxGridColumns = dynamicGridColumns
    ? Math.min(maxGridColumns, 4)
    : maxGridColumns;
  const toggleSection = (key) => setLayoutSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Check if current page has a gridColumns override
  const pageGridColumns = pageSettings[activePage]?.gridColumns;
  const hasPageOverride = Number.isFinite(pageGridColumns);
  const displayedGridColumns = hasPageOverride ? pageGridColumns : gridColumns;
  const computedEffectiveGridColumns = getEffectiveGridColumnsForWidth(
    gridViewportWidth,
    displayedGridColumns,
    dynamicGridColumns
  );

  const updateGridColumns = (columns) => {
    if (gridViewportWidth < MOBILE_BREAKPOINT && dynamicGridColumns) {
      setDynamicGridColumns(false);
    }
    setGridColumns(columns);
  };

  useEffect(() => {
    const update = () => setGridViewportWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const hts = sectionSpacing?.headerToStatus ?? 16;
  const stn = sectionSpacing?.statusToNav ?? 24;
  const ntg = sectionSpacing?.navToGrid ?? 24;

  const parseHexColor = (value) => {
    const fallback = { r: 31, g: 41, b: 55 };
    if (!value || typeof value !== 'string') return fallback;

    const raw = value.trim().replace(/^#/, '');
    const normalized =
      raw.length === 3
        ? raw
            .split('')
            .map((char) => char + char)
            .join('')
        : raw;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;

    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  };

  const toHexColor = ({ r, g, b }) => {
    const clamp = (channel) => Math.max(0, Math.min(255, channel));
    const toHex = (channel) => clamp(channel).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const effectiveCardColor = cardBgColor || '#1f2937';
  const rgb = parseHexColor(effectiveCardColor);

  const updateCardColorChannel = (channel, value) => {
    const next = { ...rgb, [channel]: value };
    setCardBgColor(toHexColor(next));
  };

  return (
    <SidebarContainer
      open={open}
      onClose={onClose}
      title={t('settings.layout')}
      testId="layout-sidebar"
      closeLabel={t('nav.done')}
      navigation={
        <SidebarNavigation
          active="layout"
          onSwitchToTheme={onSwitchToTheme}
          onSwitchToLayout={() => {}}
          onSwitchToHeader={onSwitchToHeader}
          t={t}
        />
      }
    >
      <div className="sidebar-stack font-sans">
        {/* ── Grid Section ── */}
        <SidebarAccordion
          id="grid"
          icon={Columns}
          title={t('settings.layoutGrid')}
          isOpen={layoutSections.grid}
          toggle={toggleSection}
        >
          {/* Grid Columns */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.gridDynamic')}
              </span>
              <div
                className="flex rounded-lg border p-0.5"
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'var(--glass-bg)' }}
              >
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(false)}
                  className="rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-all"
                  style={
                    !dynamicGridColumns
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {t('settings.manual')}
                </button>
                <button
                  type="button"
                  onClick={() => setDynamicGridColumns(true)}
                  className="rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-all"
                  style={
                    dynamicGridColumns
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {t('common.auto')}
                </button>
              </div>
            </div>
            {dynamicGridColumns && (
              <p className="mb-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {t('settings.gridDynamicHint')}
              </p>
            )}
            {hasPageOverride && (
              <div
                className="mb-3 rounded-xl border px-3 py-2"
                style={{
                  backgroundColor: 'var(--glass-bg)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {t('settings.pageOverride')}
                  </span>
                </div>
                <p
                  className="mt-1 text-[9px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t('settings.pageOverrideHint')}
                </p>
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {hasPageOverride ? t('settings.gridColumnsPage') : t('settings.gridColumns')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {computedEffectiveGridColumns}
                </span>
                {hasPageOverride && (
                  <button
                    onClick={() => savePageSetting(activePage, 'gridColumns', null)}
                    className="rounded-lg px-2 py-1 text-[9px] font-bold tracking-wider uppercase transition-all"
                    style={{
                      backgroundColor: 'var(--glass-bg-hover)',
                      color: 'var(--text-secondary)',
                    }}
                    title={t('settings.useGlobal')}
                  >
                    {t('settings.useGlobal')}
                  </button>
                )}
                {!hasPageOverride && gridColumns !== 4 && (
                  <ResetButton onClick={() => setGridColumns(Math.min(4, maxGridColumns))} />
                )}
              </div>
            </div>
            <M3Slider
              min={MIN_GRID_COLUMNS}
              max={selectableMaxGridColumns}
              step={1}
              value={computedEffectiveGridColumns}
              onChange={(e) => updateGridColumns(parseInt(e.target.value, 10))}
            />
          </div>
          {/* Gap H */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.gridGapH')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {gridGapH}px
                </span>
                {gridGapH !== 16 && <ResetButton onClick={() => setGridGapH(16)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={4}
              value={gridGapH}
              onChange={(e) => setGridGapH(parseInt(e.target.value, 10))}
            />
          </div>
          {/* Gap V */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.gridGapV')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {gridGapV}px
                </span>
                {gridGapV !== 16 && <ResetButton onClick={() => setGridGapV(16)} />}
              </div>
            </div>
            <M3Slider
              min={0}
              max={64}
              step={4}
              value={gridGapV}
              onChange={(e) => setGridGapV(parseInt(e.target.value, 10))}
            />
          </div>
        </SidebarAccordion>

        {/* ── Spacing Section ── */}
        <SidebarAccordion
          id="spacing"
          icon={Maximize2}
          title={t('settings.sectionSpacing')}
          isOpen={layoutSections.spacing}
          toggle={toggleSection}
        >
          {/* Header -> Status */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.sectionSpacingHeader')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {hts}px
                </span>
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
                updateSectionSpacing({ headerToStatus: parseInt(e.target.value, 10) })
              }
            />
          </div>
          {/* Status -> Nav */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.sectionSpacingNav')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {stn}px
                </span>
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
              onChange={(e) => updateSectionSpacing({ statusToNav: parseInt(e.target.value, 10) })}
            />
          </div>
          {/* Nav -> Grid */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.sectionSpacingGrid')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {ntg}px
                </span>
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
              onChange={(e) => updateSectionSpacing({ navToGrid: parseInt(e.target.value, 10) })}
            />
          </div>
        </SidebarAccordion>

        {/* ── Card Style Section ── */}
        <SidebarAccordion
          id="cards"
          icon={Eye}
          title={t('settings.layoutCards')}
          isOpen={layoutSections.cards}
          toggle={toggleSection}
        >
          {/* Card Material */}
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('settings.cardMaterial')}
            </span>
            <div
              className="flex gap-1 rounded-xl border p-0.5"
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              {[
                { value: 'glass', label: t('settings.materialGlass') },
                { value: 'flat', label: t('settings.materialFlat') },
                { value: 'neumorphic', label: t('settings.materialNeumorphic') },
                { value: 'elevated', label: t('settings.materialElevated') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCardMaterial(opt.value)}
                  className="flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase transition-all"
                  style={
                    cardMaterial === opt.value
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                      : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Density */}
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('settings.density')}
            </span>
            <div
              className="flex gap-1 rounded-xl border p-0.5"
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              {[
                { value: 'compact', label: t('settings.densityCompact') },
                { value: 'comfortable', label: t('settings.densityComfortable') },
                { value: 'spacious', label: t('settings.densitySpacious') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDensity(opt.value)}
                  className="flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase transition-all"
                  style={
                    density === opt.value
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                      : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Scale */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.cardScale')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {cardScale}%
                </span>
                {cardScale !== 100 && <ResetButton onClick={() => setCardScale(100)} />}
              </div>
            </div>
            <M3Slider
              min={60}
              max={120}
              step={5}
              value={cardScale}
              onChange={(e) => setCardScale(Number(e.target.value))}
            />
          </div>

          {/* Border Radius */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.cardRadius')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
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
              onChange={(e) => setCardBorderRadius(parseInt(e.target.value, 10))}
            />
          </div>
          {/* Transparency */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.transparency')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
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
              onChange={(e) => setCardTransparency(parseInt(e.target.value, 10))}
            />
          </div>
          {/* Border Opacity */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.borderOpacity')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
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
              onChange={(e) => setCardBorderOpacity(parseInt(e.target.value, 10))}
            />
          </div>
          {/* Card Background Color */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('settings.cardBackgroundColor')}
              </span>
              {cardBgColor && <ResetButton onClick={() => setCardBgColor('')} />}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-xl border shadow-lg"
                  style={{
                    borderColor: 'var(--glass-border)',
                    backgroundColor: effectiveCardColor,
                  }}
                />
                <div className="flex-1 space-y-0.5">
                  <input
                    id="card-bg-color-input"
                    name="card_bg_color"
                    type="text"
                    value={cardBgColor}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val === '' || /^#[0-9a-fA-F]{1,6}$/.test(val)) setCardBgColor(val);
                    }}
                    className="w-full rounded-xl border px-3 py-2 font-mono text-sm uppercase transition-colors outline-none focus:border-[var(--glass-border)]"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      borderColor: 'var(--glass-border)',
                      color: 'var(--text-primary)',
                    }}
                    placeholder="#1f2937"
                    maxLength={7}
                  />
                  {!cardBgColor && (
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {t('settings.useThemeDefault')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      R
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {rgb.r}
                    </span>
                  </div>
                  <M3Slider
                    min={0}
                    max={255}
                    step={1}
                    value={rgb.r}
                    onChange={(e) => updateCardColorChannel('r', parseInt(e.target.value, 10))}
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      G
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {rgb.g}
                    </span>
                  </div>
                  <M3Slider
                    min={0}
                    max={255}
                    step={1}
                    value={rgb.g}
                    onChange={(e) => updateCardColorChannel('g', parseInt(e.target.value, 10))}
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      B
                    </span>
                    <span
                      className="font-mono text-[10px] tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {rgb.b}
                    </span>
                  </div>
                  <M3Slider
                    min={0}
                    max={255}
                    step={1}
                    value={rgb.b}
                    onChange={(e) => updateCardColorChannel('b', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            </div>
          </div>
        </SidebarAccordion>

        {/* ── Page Navigation Section ── */}
        <SidebarAccordion
          id="nav"
          icon={Navigation}
          title={t('settings.navStyle')}
          isOpen={layoutSections.nav}
          toggle={toggleSection}
        >
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('settings.navStyleLook')}
            </span>
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label={t('settings.navStyleLook')}
            >
              {NAV_STYLE_OPTIONS.map((option) => {
                const active = navStyle === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateNavSetting('navStyle', option)}
                    className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-1 py-2 text-[10px] font-bold tracking-wider uppercase transition-all"
                    style={
                      active
                        ? {
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--accent-color)',
                            color: 'var(--accent-color)',
                          }
                        : {
                            backgroundColor: 'var(--glass-bg)',
                            borderColor: 'var(--glass-border)',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <NavStylePreview navStyle={option} />
                    <span>{t(`settings.navStyle.${option}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('settings.navSize')}
            </span>
            <div
              className="flex gap-1 rounded-xl border p-0.5"
              role="group"
              aria-label={t('settings.navSize')}
              style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
            >
              {['sm', 'md', 'lg'].map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={navSize === size}
                  onClick={() => updateNavSetting('navSize', size)}
                  className="flex-1 rounded-lg px-1 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase transition-all"
                  style={
                    navSize === size
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                      : { color: 'var(--text-secondary)', backgroundColor: 'transparent' }
                  }
                >
                  {t(`settings.navSize.${size}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Toggle
              label={t('settings.navActiveAccent')}
              value={headerSettings?.navActiveAccent === true}
              onChange={(value) => updateNavSetting('navActiveAccent', value)}
            />
            <Toggle
              label={t('settings.navShowIcons')}
              value={headerSettings?.navShowIcons !== false}
              onChange={(value) => updateNavSetting('navShowIcons', value)}
            />
            <Toggle
              label={t('settings.navUppercase')}
              value={headerSettings?.navUppercase === true}
              onChange={(value) => updateNavSetting('navUppercase', value)}
            />
          </div>
        </SidebarAccordion>
      </div>
    </SidebarContainer>
  );
}
