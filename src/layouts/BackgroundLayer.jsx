import AuroraBackground from '../components/effects/AuroraBackground';
import LavaLampBackground from '../components/effects/LavaLampBackground';
import SilkBackground from '../components/effects/SilkBackground';
import { useConfig } from '../contexts';
import { themes } from '../config/themes';
import { isLightColor } from '../utils/colorUtils';
import { backgroundImageUrl } from '../utils/studioPreview';

const BASE_GRADIENT =
  'radial-gradient(circle at 50% 0%, var(--bg-gradient-from), var(--bg-primary) 70%, var(--bg-gradient-to))';

const BACKGROUND_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

const GLOW_FALLOFF = [
  [1, 0],
  [0.85, 18],
  [0.55, 40],
  [0.25, 62],
  [0.07, 84],
];

// The soft edge comes from these stops and not from a blur filter: a GPU blur on
// colours this faint breaks up into blocky rings.
const softGlow = (token, strength) => {
  const stops = GLOW_FALLOFF.map(
    ([share, position]) =>
      `color-mix(in srgb, var(${token}) ${(strength * share).toFixed(2)}%, transparent) ${position}%`
  );
  return `radial-gradient(circle closest-side, ${stops.join(', ')}, transparent 100%)`;
};

/**
 * BackgroundLayer — renders the animated aurora or static gradient background.
 */
export default function BackgroundLayer() {
  const { bgMode, bgImage, currentTheme } = useConfig();
  const baseColor = themes[currentTheme]?.colors?.['--bg-primary'] || '#0f172a';
  const isLight = isLightColor(baseColor);
  const glowOpacity = isLight ? 0.3 : 0.42;

  if (bgMode === 'animated') {
    return <AuroraBackground baseColor={baseColor} />;
  }

  if (bgMode === 'lavaLamp') {
    return <LavaLampBackground baseColor={baseColor} />;
  }

  if (bgMode === 'silk') {
    return <SilkBackground baseColor={baseColor} />;
  }

  if (bgMode === 'custom' && bgImage) {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: BASE_GRADIENT }} />
        <div
          data-testid="custom-background-image"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: backgroundImageUrl(bgImage) }}
        />
        <div data-testid="custom-background-tone" className="background-custom-tone" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep static gradient base */}
      <div className="absolute inset-0" style={{ background: BASE_GRADIENT }} />

      {/* Static ambient glows. Motion is opt-in through explicit animated modes.
          Colours follow the active theme so they never fight the palette. */}
      <div
        className="pointer-events-none absolute top-[-10%] right-[-5%] h-[60vw] w-[60vw] rounded-full"
        style={{ background: softGlow('--accent-color', 22), opacity: glowOpacity }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[60vw] w-[60vw] rounded-full"
        style={{ background: softGlow('--status-info-fg', 18), opacity: glowOpacity * 0.9 }}
      />
      <div
        className="pointer-events-none absolute top-[40%] left-[30%] h-[50vw] w-[50vw] rounded-full"
        style={{ background: softGlow('--accent-color', 15), opacity: glowOpacity * 0.35 }}
      />

      {/* Fine grain keeps the very dim glows from showing as rings of flat colour. */}
      <div
        data-testid="background-dither"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: BACKGROUND_NOISE }}
      />
    </div>
  );
}
