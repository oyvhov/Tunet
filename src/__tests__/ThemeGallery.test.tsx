import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ThemeGallery from '../components/sidebars/ThemeGallery';
import { themes } from '../config/themes';

const renderGallery = (currentTheme = 'dark') => {
  const onSelect = vi.fn();
  render(
    <ThemeGallery
      themes={themes}
      currentTheme={currentTheme}
      onSelect={onSelect}
      t={(key) => key}
    />
  );
  return onSelect;
};

describe('ThemeGallery', () => {
  it('shows the six themes in order, all with translated names', () => {
    renderGallery();

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'theme.contextual',
      'theme.dark',
      'theme.light',
      'theme.graphite',
      'theme.amethyst',
      'theme.aluminium',
    ]);
  });

  it('marks only the current theme as selected', () => {
    renderGallery('amethyst');

    const pressed = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true');

    expect(pressed.map((button) => button.textContent)).toEqual(['theme.amethyst']);
  });

  it('selects a theme when its tile is pressed', () => {
    const onSelect = renderGallery();

    fireEvent.click(screen.getByRole('button', { name: 'theme.light' }));

    expect(onSelect).toHaveBeenCalledWith('light');
  });

  it('draws each tile from that theme and not the active one', () => {
    renderGallery('dark');

    const preview = screen
      .getByRole('button', { name: 'theme.amethyst' })
      .querySelector('.sidebar-theme-preview');

    // jsdom normalises the amethyst --bg-gradient-from (#2d2a42) to rgb().
    expect(preview?.getAttribute('style')).toContain('rgb(45, 42, 66)');
  });

  it('marks only the Smart tile as automatic', () => {
    renderGallery();

    expect(
      screen
        .getByRole('button', { name: 'theme.contextual' })
        .querySelector('.sidebar-theme-preview__auto')
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'theme.dark' })
        .querySelector('.sidebar-theme-preview__auto')
    ).toBeNull();
  });
});
