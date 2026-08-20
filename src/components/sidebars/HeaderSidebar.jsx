import React, { useState } from 'react';
import { Maximize2, Eye, AlignLeft, Battery } from '../../icons';
import M3Slider from '../ui/M3Slider';
import SidebarContainer from './SidebarContainer';
import {
  SidebarAccordion,
  SidebarNavigation,
  SidebarResetButton as ResetButton,
  SidebarSegmentedControl as SegmentedControl,
  SidebarToggle as Toggle,
} from './SidebarControls';

const FONTS = [
  { value: 'sans', label: 'Sans-serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'courier', label: 'Courier' },
];

const FONT_WEIGHTS = [
  { value: '100', key: '100' },
  { value: '300', key: '300' },
  { value: '400', key: '400' },
  { value: '500', key: '500' },
  { value: '700', key: '700' },
];

const LETTER_SPACINGS = [
  { value: 'tight', em: '0.05em' },
  { value: 'normal', em: '0.2em' },
  { value: 'wide', em: '0.5em' },
  { value: 'extraWide', em: '0.8em' },
];

export default function HeaderSidebar({
  open,
  onClose,
  headerTitle,
  headerScale,
  headerSettings,
  updateHeaderTitle,
  updateHeaderScale,
  updateHeaderSettings,
  cardsOnlyMode,
  updateCardsOnlyMode,
  onSwitchToTheme,
  onSwitchToLayout,
  t,
}) {
  const [sections, setSections] = useState({
    layout: false,
    typography: true,
    style: false,
    clock: false,
    visibility: false,
  });
  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const setting = (key, fallback) => headerSettings?.[key] ?? fallback;
  const update = (key, value) => updateHeaderSettings({ ...headerSettings, [key]: value });

  const fontWeight = setting('fontWeight', '300');
  const letterSpacing = setting('letterSpacing', 'normal');
  const clockFormat = setting('clockFormat', '24h');
  const fontStyle = setting('fontStyle', 'normal');
  const clockScale = setting('clockScale', 1.0);
  const dateScale = setting('dateScale', 1.0);

  return (
    <SidebarContainer
      open={open}
      onClose={onClose}
      title={t('system.tabHeader')}
      testId="header-sidebar"
      closeLabel={t('nav.done')}
      navigation={
        <SidebarNavigation
          active="header"
          onSwitchToTheme={onSwitchToTheme}
          onSwitchToLayout={onSwitchToLayout}
          onSwitchToHeader={() => {}}
          t={t}
        />
      }
    >
      <div className="sidebar-stack font-sans">
        {/* ── Layout Section ── */}
        <SidebarAccordion
          id="layout"
          icon={Battery}
          title={t('header.headerLayout') || 'Layout'}
          isOpen={sections.layout}
          toggle={toggleSection}
        >
          {/* Style toggle: Classic / Battery */}
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.headerStyle') || 'Style'}
            </span>
            <SegmentedControl
              options={[
                { value: 'classic', label: t('header.styleClassic') || 'Classic' },
                { value: 'battery', label: t('header.styleBattery') || 'Battery' },
              ]}
              value={setting('headerStyle', 'classic')}
              onChange={(v) => update('headerStyle', v)}
            />
          </div>

          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.mobileAlignment') || 'Mobile position'}
            </span>
            <SegmentedControl
              options={[
                { value: 'left', label: t('header.alignmentLeft') || 'Left' },
                { value: 'center', label: t('header.alignmentCenter') || 'Center' },
                { value: 'right', label: t('header.alignmentRight') || 'Right' },
              ]}
              value={setting('mobileAlignment', 'center')}
              onChange={(v) => update('mobileAlignment', v)}
            />
          </div>

          {/* Battery-only options */}
          {setting('headerStyle', 'classic') === 'battery' && (
            <>
              <div className="space-y-2">
                <span
                  className="text-[11px] font-bold tracking-wider uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('header.batteryVariant') || 'Variant'}
                </span>
                <SegmentedControl
                  options={[
                    { value: 'glass', label: t('header.variantGlass') || 'Glass' },
                    { value: 'solid', label: t('header.variantSolid') || 'Solid' },
                    { value: 'outline', label: t('header.variantOutline') || 'Outline' },
                  ]}
                  value={setting('batteryVariant', 'glass')}
                  onChange={(v) => update('batteryVariant', v)}
                />
              </div>

              <Toggle
                label={t('header.showBatteryNub') || 'Show terminal nub'}
                value={setting('showBatteryNub', true)}
                onChange={(v) => update('showBatteryNub', v)}
              />
            </>
          )}
        </SidebarAccordion>

        {/* ── Typography Section ── */}
        <SidebarAccordion
          id="typography"
          icon={AlignLeft}
          title={t('header.fontFamily')}
          isOpen={sections.typography}
          toggle={toggleSection}
        >
          {/* Title Input */}
          <div className="space-y-2">
            <label
              htmlFor="header-title-input"
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.titleLabel')}
            </label>
            <input
              id="header-title-input"
              name="header_title"
              type="text"
              value={headerTitle}
              onChange={(e) => updateHeaderTitle(e.target.value)}
              placeholder={t('header.titlePlaceholder')}
              className="w-full rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label
              htmlFor="header-font-family"
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.fontFamily')}
            </label>
            <select
              id="header-font-family"
              name="header_font_family"
              value={setting('fontFamily', 'sans')}
              onChange={(e) => update('fontFamily', e.target.value)}
              className="w-full appearance-none rounded-xl border px-3 py-2 text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            >
              {FONTS.map((f) => (
                <option
                  key={f.value}
                  value={f.value}
                  className="bg-slate-800"
                  style={{ color: 'white' }}
                >
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('header.fontWeight')}
              </span>
            </div>
            <SegmentedControl
              options={FONT_WEIGHTS}
              value={fontWeight}
              onChange={(v) => update('fontWeight', v)}
            />
          </div>

          {/* Style */}
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.fontStyle')}
            </span>
            <div className="flex gap-2">
              {['normal', 'italic', 'uppercase'].map((s) => (
                <button
                  key={s}
                  onClick={() => update('fontStyle', s)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                    fontStyle === s ? '' : 'hover:border-white/20'
                  }`}
                  style={
                    fontStyle === s
                      ? {
                          backgroundColor: 'var(--accent-bg)',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--accent-color)',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: 'var(--glass-border)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </SidebarAccordion>

        {/* ── Style/Size Section ── */}
        <SidebarAccordion
          id="style"
          icon={Maximize2}
          title={t('header.scale')}
          isOpen={sections.style}
          toggle={toggleSection}
        >
          {/* Header Scale */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('header.scale')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {(headerScale * 100).toFixed(0)}%
                </span>
                {headerScale !== 1 && <ResetButton onClick={() => updateHeaderScale(1)} t={t} />}
              </div>
            </div>
            <M3Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={headerScale}
              onChange={(e) => updateHeaderScale(parseFloat(e.target.value))}
            />
          </div>

          {/* Letter Spacing */}
          <div className="space-y-2">
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.letterSpacing')}
            </span>
            <SegmentedControl
              options={LETTER_SPACINGS.map((l) => ({
                value: l.value,
                label: t(`header.letterSpacing.${l.value}`) || l.value,
              }))}
              value={letterSpacing}
              onChange={(v) => update('letterSpacing', v)}
            />
          </div>

          {/* Clock Scale */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('header.clockScale')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {(clockScale * 100).toFixed(0)}%
                </span>
                {clockScale !== 1 && <ResetButton onClick={() => update('clockScale', 1)} t={t} />}
              </div>
            </div>
            <M3Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={clockScale}
              onChange={(e) => update('clockScale', parseFloat(e.target.value))}
            />
          </div>

          {/* Date Scale */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('header.dateScale')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {(dateScale * 100).toFixed(0)}%
                </span>
                {dateScale !== 1 && <ResetButton onClick={() => update('dateScale', 1)} t={t} />}
              </div>
            </div>
            <M3Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={dateScale}
              onChange={(e) => update('dateScale', parseFloat(e.target.value))}
            />
          </div>
        </SidebarAccordion>

        {/* ── Visibility/Clock Section ── */}
        <SidebarAccordion
          id="visibility"
          icon={Eye}
          title={t('header.visibility')}
          isOpen={sections.visibility}
          toggle={toggleSection}
        >
          <div className="space-y-1">
            <Toggle
              label={t('header.showTitle')}
              value={setting('showTitle', true)}
              onChange={(v) => update('showTitle', v)}
            />
            <Toggle
              label={t('header.showClock')}
              value={setting('showClock', true)}
              onChange={(v) => update('showClock', v)}
            />
            <Toggle
              label={t('header.showClockOnMobile')}
              value={setting('showClockOnMobile', true)}
              onChange={(v) => update('showClockOnMobile', v)}
            />
            <Toggle
              label={t('header.showDate')}
              value={setting('showDate', true)}
              onChange={(v) => update('showDate', v)}
            />
            <Toggle
              label={t('header.showPagePillLabelsOnMobile')}
              value={setting('showPagePillLabelsOnMobile', false)}
              onChange={(v) => update('showPagePillLabelsOnMobile', v)}
            />
            <Toggle
              label={t('header.cardsOnlyMode')}
              value={Boolean(cardsOnlyMode)}
              onChange={updateCardsOnlyMode}
            />
          </div>

          <div
            className="mt-4 space-y-2 border-t pt-4"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('header.clockFormat')}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => update('clockFormat', '24h')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  clockFormat === '24h' ? '' : 'hover:text-white'
                }`}
                style={
                  clockFormat === '24h'
                    ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                    : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }
                }
              >
                24h
              </button>
              <button
                onClick={() => update('clockFormat', '12h')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  clockFormat === '12h' ? '' : 'hover:text-white'
                }`}
                style={
                  clockFormat === '12h'
                    ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }
                    : { backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }
                }
              >
                12h
              </button>
            </div>
          </div>
        </SidebarAccordion>
      </div>
    </SidebarContainer>
  );
}
