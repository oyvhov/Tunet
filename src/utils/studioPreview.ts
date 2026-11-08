export const STUDIO_PANEL_WIDTH = 420;
export const STUDIO_MIN_SHRINK_WIDTH = 900;
export const STUDIO_CONTENT_MAX_WIDTH = 1600;

export interface StudioPreviewGeometry {
  shrink: boolean;
  scale: number;
  shift: number;
}

export function getStudioPreviewGeometry(viewportWidth: number): StudioPreviewGeometry {
  if (viewportWidth < STUDIO_MIN_SHRINK_WIDTH) return { shrink: false, scale: 1, shift: 0 };

  const contentWidth = Math.min(viewportWidth, STUDIO_CONTENT_MAX_WIDTH);
  return {
    shrink: true,
    scale: Math.min(1, (viewportWidth - STUDIO_PANEL_WIDTH) / contentWidth),
    shift: -STUDIO_PANEL_WIDTH / 2,
  };
}
