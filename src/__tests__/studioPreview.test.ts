import { describe, expect, it } from 'vitest';
import { getStudioPreviewGeometry } from '../utils/studioPreview';

describe('getStudioPreviewGeometry', () => {
  it('only moves the dashboard when there is room for it at full size', () => {
    expect(getStudioPreviewGeometry(2560)).toEqual({ shrink: true, scale: 1, shift: -210 });
  });

  it('fits the 1600 px content column beside the panel on a wide screen', () => {
    expect(getStudioPreviewGeometry(1920)).toEqual({ shrink: true, scale: 0.9375, shift: -210 });
  });

  it('fits the full width beside the panel on a laptop screen', () => {
    expect(getStudioPreviewGeometry(1280)).toEqual({ shrink: true, scale: 0.671875, shift: -210 });
  });

  it('still shrinks at exactly 900 px', () => {
    const geometry = getStudioPreviewGeometry(900);
    expect(geometry.shrink).toBe(true);
    expect(geometry.scale).toBeCloseTo(480 / 900);
  });

  it('leaves the dashboard alone below 900 px', () => {
    expect(getStudioPreviewGeometry(899)).toEqual({ shrink: false, scale: 1, shift: 0 });
  });
});
