import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStudioPreview } from '../hooks/useStudioPreview';

const root = document.documentElement;

const setViewportWidth = (width: number) => {
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    window.dispatchEvent(new Event('resize'));
  });
};

const expectCleared = () => {
  expect(root.hasAttribute('data-studio-preview')).toBe(false);
  expect(root.style.getPropertyValue('--studio-scale')).toBe('');
  expect(root.style.getPropertyValue('--studio-shift')).toBe('');
  expect(root.style.getPropertyValue('--studio-backdrop-opacity')).toBe('');
};

describe('useStudioPreview', () => {
  const originalWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('marks the page and writes the geometry while open', () => {
    renderHook(() => useStudioPreview(true));

    expect(root.getAttribute('data-studio-preview')).toBe('shrink');
    expect(root.style.getPropertyValue('--studio-scale')).toBe('0.671875');
    expect(root.style.getPropertyValue('--studio-shift')).toBe('-210px');
    expect(root.style.getPropertyValue('--studio-backdrop-opacity')).toBe('0');
  });

  it('does nothing while closed', () => {
    renderHook(() => useStudioPreview(false));

    expectCleared();
  });

  it('follows the window across the 900 px limit', () => {
    renderHook(() => useStudioPreview(true));

    setViewportWidth(800);
    expectCleared();

    setViewportWidth(1920);
    expect(root.getAttribute('data-studio-preview')).toBe('shrink');
    expect(root.style.getPropertyValue('--studio-scale')).toBe('0.9375');
  });

  it('stays in place when rerendered open, as when switching panel tabs', () => {
    const { rerender } = renderHook(({ open }) => useStudioPreview(open), {
      initialProps: { open: true },
    });

    rerender({ open: true });

    expect(root.getAttribute('data-studio-preview')).toBe('shrink');
  });

  it('clears everything when closed', () => {
    const { rerender } = renderHook(({ open }) => useStudioPreview(open), {
      initialProps: { open: true },
    });

    rerender({ open: false });

    expectCleared();
  });

  it('clears everything on unmount and stops following the window', () => {
    const { unmount } = renderHook(() => useStudioPreview(true));

    unmount();
    expectCleared();

    setViewportWidth(1920);
    expectCleared();
  });
});
