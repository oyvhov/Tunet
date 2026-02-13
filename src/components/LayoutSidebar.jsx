import React, { useState } from 'react';
import M3Slider from './M3Slider';
import {
  LayoutGrid,
  RefreshCw,
  Columns,
  Eye,
  Maximize2,
  Palette,
  Type
} from '../icons';
import SidebarContainer from './SidebarContainer';

// Additional icons
const ChevronDownIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 12 15 18 9"/></svg>
);

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
  cardBorderRadius,
  setCardBorderRadius,
  cardTransparency,
  setCardTransparency,
  cardBorderOpacity,
  setCardBorderOpacity,
  sectionSpacing,
  updateSectionSpacing,
}) {
  const [layoutSections, setLayoutSections] = useState({ grid: true, spacing: false, cards: false });
  const toggleSection = (key) => setLayoutSections(prev => ({ ...prev, [key]: !prev[key] }));

  const ResetButton = ({ onClick }) => (
    <button 
      onClick={onClick}
      className="p-1.5 rounded-full hover:bg-white/10 transition-all"
      style={{ color: 'var(--text-secondary)' }}
      title={t('settings.reset')}
    >
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  );

  // Accordion section wrapper
  const Section = ({ id, icon: Icon, title, children }) => {
    const isOpen = layoutSections[id];
    return (
      <div 
        className={`rounded-2xl transition-all border ${isOpen ? '' : 'border-transparent'}`}
        style={isOpen ? { backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' } : {}}
      >
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors group"
        >
          <div 
              className={`p-2 rounded-xl transition-colors ${isOpen ? '' : 'group-hover:bg-white/5'}`}
              style={isOpen ? { backgroundColor: 'color-mix(in srgb, var(--accent-color), transparent 90%)', color: 'var(--accent-color)' } : { color: 'var(--text-secondary)' }}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <span 
              className="flex-1 text-[13px] font-semibold transition-colors"
              style={{ color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
              {title}
          </span>
          <ChevronDownIcon 
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
          />
        </button>
        <div
          className="grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 space-y-6">
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
    <SidebarContainer
      open={open}
      onClose={onClose}
      title={t('settings.layout')}
      icon={LayoutGrid}
    >
      <div className="space-y-2 font-sans">
        
        {/* Switcher Tab */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex p-1 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                onClick={onSwitchToTheme}
                title={t('system.tabAppearance')}
             >
                <Palette className="w-5 h-5" />
             </button>

             <div className="w-px my-1 mx-1" style={{ backgroundColor: 'var(--glass-border)' }} />

             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all shadow-md relative z-10 text-white"
                style={{ backgroundColor: 'var(--accent-color)' }}
                disabled
                title={t('system.tabLayout')}
             >
                <LayoutGrid className="w-5 h-5" />
             </button>

             <div className="w-px my-1 mx-1" style={{ backgroundColor: 'var(--glass-border)' }} />

             <button
                className="w-12 h-9 rounded-xl flex items-center justify-center transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                onClick={onSwitchToHeader}
                title={t('system.tabHeader')}
             >
                <Type className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* ── Grid Section ── */}
        <Section
          id="grid"
          icon={Columns}
          title={t('settings.layoutGrid')}
        >
          {/* Grid Columns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.gridColumns')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{gridColumns}</span>
                {gridColumns !== 4 && <ResetButton onClick={() => setGridColumns(4)} />}
              </div>
            </div>
            <M3Slider 
              min={2} 
              max={8} 
              step={1} 
              value={gridColumns} 
              onChange={(e) => setGridColumns(parseInt(e.target.value, 10))} 
              colorClass="bg-blue-500" 
            />
          </div>
          {/* Gap H */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.gridGapH')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{gridGapH}px</span>
                {gridGapH !== 16 && <ResetButton onClick={() => setGridGapH(16)} />}
              </div>
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
          {/* Gap V */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.gridGapV')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{gridGapV}px</span>
                {gridGapV !== 16 && <ResetButton onClick={() => setGridGapV(16)} />}
              </div>
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
        </Section>

        {/* ── Spacing Section ── */}
        <Section
          id="spacing"
          icon={Maximize2}
          title={t('settings.sectionSpacing')}
        >
          {/* Header -> Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.sectionSpacingHeader')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{hts}px</span>
                {hts !== 16 && <ResetButton onClick={() => updateSectionSpacing({ headerToStatus: 16 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={hts} onChange={(e) => updateSectionSpacing({ headerToStatus: parseInt(e.target.value, 10) })} colorClass="bg-blue-500" />
          </div>
          {/* Status -> Nav */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.sectionSpacingNav')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{stn}px</span>
                {stn !== 24 && <ResetButton onClick={() => updateSectionSpacing({ statusToNav: 24 })} />}
              </div>
            </div>
            <M3Slider min={0} max={64} step={4} value={stn} onChange={(e) => updateSectionSpacing({ statusToNav: parseInt(e.target.value, 10) })} colorClass="bg-blue-500" />
          </div>
          {/* Nav -> Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.sectionSpacingGrid')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{ntg}px</span>
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
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.cardRadius')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{cardBorderRadius}px</span>
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
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.transparency')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{cardTransparency}%</span>
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
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('settings.borderOpacity')}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums font-mono" style={{ color: 'var(--accent-color)' }}>{cardBorderOpacity}%</span>
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
    </SidebarContainer>
  );
}
