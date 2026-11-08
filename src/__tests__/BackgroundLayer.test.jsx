import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BackgroundLayer from '../layouts/BackgroundLayer';
import { backgroundImageUrl } from '../utils/studioPreview';

const configState = vi.hoisted(() => ({ bgMode: 'theme', bgImage: '' }));

vi.mock('../contexts', () => ({
  useConfig: () => ({ bgMode: configState.bgMode, bgImage: configState.bgImage }),
}));

vi.mock('../components/effects/AuroraBackground', () => ({
  default: () => <div data-testid="aurora-background" />,
}));

vi.mock('../components/effects/LavaLampBackground', () => ({
  default: () => <div data-testid="lava-lamp-background" />,
}));

vi.mock('../components/effects/SilkBackground', () => ({
  default: () => <div data-testid="silk-background" />,
}));

describe('BackgroundLayer', () => {
  beforeEach(() => {
    configState.bgMode = 'theme';
    configState.bgImage = '';
  });

  it('keeps theme mode static by default', () => {
    const { container } = render(<BackgroundLayer />);

    expect(screen.queryByTestId('aurora-background')).not.toBeInTheDocument();
    expect(container.querySelector('.aurora-blob-1')).toBeNull();
    expect(container.querySelector('.aurora-blob-2')).toBeNull();
    expect(container.querySelector('.aurora-blob-3')).toBeNull();
  });

  it.each([
    ['animated', 'aurora-background'],
    ['lavaLamp', 'lava-lamp-background'],
    ['silk', 'silk-background'],
  ])('renders the explicit %s background mode', (bgMode, testId) => {
    configState.bgMode = bgMode;

    render(<BackgroundLayer />);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('shows a custom image under a dark tone and without glows', () => {
    configState.bgMode = 'custom';
    configState.bgImage = 'https://x/a.jpg';

    const { container } = render(<BackgroundLayer />);

    expect(screen.getByTestId('custom-background-image').style.backgroundImage).toContain(
      'https://x/a.jpg'
    );
    expect(screen.getByTestId('custom-background-tone')).toBeInTheDocument();
    expect(container.querySelector('.rounded-full')).toBeNull();
  });

  it('falls back to the theme background when no image is set', () => {
    configState.bgMode = 'custom';
    configState.bgImage = '';

    const { container } = render(<BackgroundLayer />);

    expect(screen.queryByTestId('custom-background-image')).not.toBeInTheDocument();
    expect(container.querySelector('.rounded-full')).not.toBeNull();
  });

  it('keeps a URL with quotes and backslashes inside one CSS string', () => {
    expect(backgroundImageUrl('a"b\\c')).toBe('url("a\\"b\\\\c")');
  });
});
