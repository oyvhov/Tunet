import AuroraBackground from '../components/effects/AuroraBackground';
import LavaLampBackground from '../components/effects/LavaLampBackground';
import SilkBackground from '../components/effects/SilkBackground';
import { useConfig } from '../contexts';
import { themes } from '../config/themes';
import { isLightColor } from '../utils/colorUtils';

/**
 * BackgroundLayer — renders the animated aurora or static gradient background.
 */
export default function BackgroundLayer() {
  const { bgMode, currentTheme } = useConfig();
  const baseColor = themes[currentTheme]?.colors?.['--bg-primary'] || '#0f172a';
  const isLight = isLightColor(baseColor);
  const glowBlend = isLight ? 'normal' : 'screen';
  const glowOpacity = isLight ? 0.35 : 0.5;

  if (bgMode === 'animated') {
    return <AuroraBackground baseColor={baseColor} />;
  }

  if (bgMode === 'lavaLamp') {
    return <LavaLampBackground baseColor={baseColor} />;
  }

  if (bgMode === 'silk') {
    return <SilkBackground baseColor={baseColor} />;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep static gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, var(--bg-gradient-from), var(--bg-primary) 70%, var(--bg-gradient-to))',
        }}
      />

      {/* Static ambient glows. Motion is opt-in through explicit animated modes.
          Colours follow the active theme so they never fight the palette. */}
      <div
        className="pointer-events-none absolute top-[-10%] right-[-5%] h-[60vw] w-[60vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-color) 22%, transparent) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: glowOpacity,
          mixBlendMode: glowBlend,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[60vw] w-[60vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--status-info-fg) 18%, transparent) 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: glowOpacity * 0.9,
          mixBlendMode: glowBlend,
        }}
      />
      <div
        className="pointer-events-none absolute top-[40%] left-[30%] h-[50vw] w-[50vw] rounded-full"
        style={{
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--accent-color) 15%, transparent) 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: glowOpacity * 0.7,
          mixBlendMode: glowBlend,
        }}
      />
    </div>
  );
}
