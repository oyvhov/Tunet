import type { CSSProperties } from 'react';

export const DEFAULT_MODAL_OVERLAY_STYLE: Readonly<CSSProperties> = Object.freeze({
  backdropFilter: 'blur(8px)',
  backgroundColor: 'rgba(0,0,0,0.3)',
});

const LEGACY_MODAL_BLUR = 'blur(20px)';

export function normalizeModalOverlayStyle(overlayStyle?: CSSProperties | null): CSSProperties {
  if (!overlayStyle) {
    return DEFAULT_MODAL_OVERLAY_STYLE;
  }

  return {
    ...DEFAULT_MODAL_OVERLAY_STYLE,
    ...overlayStyle,
    backdropFilter:
      overlayStyle.backdropFilter === LEGACY_MODAL_BLUR
        ? DEFAULT_MODAL_OVERLAY_STYLE.backdropFilter
        : (overlayStyle.backdropFilter ?? DEFAULT_MODAL_OVERLAY_STYLE.backdropFilter),
    backgroundColor: overlayStyle.backgroundColor ?? DEFAULT_MODAL_OVERLAY_STYLE.backgroundColor,
  };
}
