import { useState } from 'react';
import M3Slider from '../ui/M3Slider';
import { Eye } from '../../icons';
import { SidebarAccordion, SidebarResetButton as ResetButton } from './SidebarControls';

export interface CardStyleSectionProps {
  t: (key: string) => string;
  cardMaterial: string;
  setCardMaterial: (value: string) => void;
  density: string;
  setDensity: (value: string) => void;
  cardScale: number;
  setCardScale: (value: number) => void;
  cardBorderRadius: number;
  setCardBorderRadius: (value: number) => void;
  cardTransparency: number;
  setCardTransparency: (value: number) => void;
  cardBorderOpacity: number;
  setCardBorderOpacity: (value: number) => void;
  cardBgColor: string;
  setCardBgColor: (value: string) => void;
}

type ColorChannels = { r: number; g: number; b: number };

const parseHexColor = (value: string): ColorChannels => {
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

const toHexColor = ({ r, g, b }: ColorChannels) => {
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel));
  const toHex = (channel: number) => clamp(channel).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export default function CardStyleSection({
  t,
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
}: CardStyleSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const effectiveCardColor = cardBgColor || '#1f2937';
  const rgb = parseHexColor(effectiveCardColor);

  const updateCardColorChannel = (channel: keyof ColorChannels, value: number) => {
    setCardBgColor(toHexColor({ ...rgb, [channel]: value }));
  };

  return (
    <SidebarAccordion
      id="cards"
      icon={Eye}
      title={t('settings.layoutCards')}
      isOpen={isOpen}
      toggle={() => setIsOpen((previous) => !previous)}
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
  );
}
