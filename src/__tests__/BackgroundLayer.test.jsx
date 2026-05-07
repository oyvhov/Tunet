import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BackgroundLayer from '../layouts/BackgroundLayer';

const configState = vi.hoisted(() => ({ bgMode: 'theme' }));

vi.mock('../contexts', () => ({
  useConfig: () => ({ bgMode: configState.bgMode }),
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
});
