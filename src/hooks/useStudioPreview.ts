import { useEffect } from 'react';
import { getStudioPreviewGeometry } from '../utils/studioPreview';

const PREVIEW_ATTRIBUTE = 'data-studio-preview';
const PREVIEW_VARIABLES = ['--studio-scale', '--studio-shift', '--studio-backdrop-opacity'];

const clearPreview = (root: HTMLElement) => {
  root.removeAttribute(PREVIEW_ATTRIBUTE);
  PREVIEW_VARIABLES.forEach((name) => root.style.removeProperty(name));
};

export function useStudioPreview(open: boolean): void {
  useEffect(() => {
    if (!open) return undefined;

    const root = document.documentElement;
    const applyPreview = () => {
      const { shrink, scale, shift } = getStudioPreviewGeometry(window.innerWidth);
      if (!shrink) {
        clearPreview(root);
        return;
      }
      root.setAttribute(PREVIEW_ATTRIBUTE, 'shrink');
      root.style.setProperty('--studio-scale', String(scale));
      root.style.setProperty('--studio-shift', `${shift}px`);
      root.style.setProperty('--studio-backdrop-opacity', '0');
    };

    applyPreview();
    window.addEventListener('resize', applyPreview);
    return () => {
      window.removeEventListener('resize', applyPreview);
      clearPreview(root);
    };
  }, [open]);
}
