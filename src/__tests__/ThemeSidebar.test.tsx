import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThemeSidebar from '../components/sidebars/ThemeSidebar';

vi.mock('../contexts', () => ({
  useConfig: () => ({ appFont: 'default', setAppFont: vi.fn() }),
}));

vi.mock('../components/sidebars/SidebarContainer', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/sidebars/CardStyleSection', () => ({ default: () => null }));
vi.mock('../components/sidebars/FontGallery', () => ({ default: () => null }));
vi.mock('../components/sidebars/ThemeGallery', () => ({ default: () => null }));

const themes = {
  light: { colors: { '--bg-primary': '#ffffff' } },
  dark: { colors: { '--bg-primary': '#0f172a' } },
};

const renderSidebar = (props: Record<string, unknown> = {}) =>
  render(
    <ThemeSidebar
      open
      onClose={vi.fn()}
      t={(key: string) => key}
      themes={themes}
      currentTheme="light"
      bgMode="theme"
      setBgMode={vi.fn()}
      bgColor="#0f172a"
      setBgColor={vi.fn()}
      bgGradient="midnight"
      setBgGradient={vi.fn()}
      bgImage=""
      setBgImage={vi.fn()}
      {...props}
    />
  );

const preview = (label: string) =>
  screen.getByText(label).parentElement?.querySelector<HTMLElement>('[class*="__preview"]');

describe('ThemeSidebar background tiles', () => {
  it.each([
    ['light', '#ffffff'],
    ['dark', '#0f172a'],
  ])('paints the effect tiles on the base colour of the %s theme', (currentTheme, base) => {
    const { container } = renderSidebar({ currentTheme });

    const grid = container.querySelector<HTMLElement>('.sidebar-background-grid');

    expect(grid?.style.getPropertyValue('--background-preview-base')).toBe(base);
  });

  it('marks a dark solid colour so its icon stays visible on a light theme', () => {
    renderSidebar({ bgColor: '#0f172a' });

    expect(preview('settings.bgSolid')?.dataset.tone).toBe('dark');
  });

  it('marks a light solid colour so its icon stays visible on a dark theme', () => {
    renderSidebar({ currentTheme: 'dark', bgColor: '#f8fafc' });

    expect(preview('settings.bgSolid')?.dataset.tone).toBe('light');
  });

  it('marks the gradient tile by the colour of its preset', () => {
    renderSidebar({ bgGradient: 'midnight' });

    expect(preview('settings.bgGradient')?.dataset.tone).toBe('dark');
  });

  it('leaves the effect tiles to the theme text colour', () => {
    renderSidebar();

    expect(preview('settings.bgSilk')?.dataset.tone).toBeUndefined();
  });
});
