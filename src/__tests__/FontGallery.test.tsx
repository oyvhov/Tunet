import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FontGallery from '../components/sidebars/FontGallery';
import { APP_FONT_FAMILIES, APP_FONT_OPTIONS } from '../config/appFonts';

describe('FontGallery', () => {
  it('offers the seven app fonts', () => {
    render(<FontGallery current="sans" onSelect={vi.fn()} />);

    expect(APP_FONT_OPTIONS).toHaveLength(7);
    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Sans-serif' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('writes each sample in its own font', () => {
    render(<FontGallery current="sans" onSelect={vi.fn()} />);

    const sample = screen
      .getByRole('button', { name: 'Roboto' })
      .querySelector<HTMLElement>('.sidebar-font-preview');

    expect(sample?.style.fontFamily).toBe(APP_FONT_FAMILIES.Roboto);
  });

  it('selects a font when its tile is pressed', () => {
    const onSelect = vi.fn();
    render(<FontGallery current="sans" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Sans' }));

    expect(onSelect).toHaveBeenCalledWith('Open Sans');
  });
});
