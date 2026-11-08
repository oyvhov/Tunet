import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CardStyleSection from '../components/sidebars/CardStyleSection';

const makeProps = (overrides = {}) => ({
  t: (key: string) => key,
  cardMaterial: 'glass',
  setCardMaterial: vi.fn(),
  density: 'comfortable',
  setDensity: vi.fn(),
  cardScale: 100,
  setCardScale: vi.fn(),
  cardBorderRadius: 16,
  setCardBorderRadius: vi.fn(),
  cardTransparency: 40,
  setCardTransparency: vi.fn(),
  cardBorderOpacity: 5,
  setCardBorderOpacity: vi.fn(),
  cardBgColor: '',
  setCardBgColor: vi.fn(),
  ...overrides,
});

describe('CardStyleSection', () => {
  it.each([
    'settings.cardMaterial',
    'settings.density',
    'settings.cardScale',
    'settings.cardRadius',
    'settings.transparency',
    'settings.borderOpacity',
    'settings.cardBackgroundColor',
  ])('shows %s without opening anything', (label) => {
    render(<CardStyleSection {...makeProps()} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('changes the card material', () => {
    const props = makeProps();
    render(<CardStyleSection {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'settings.materialFlat' }));

    expect(props.setCardMaterial).toHaveBeenCalledWith('flat');
  });

  it('ignores text that cannot become a hex colour', () => {
    const props = makeProps();
    render(<CardStyleSection {...props} />);

    fireEvent.change(screen.getByPlaceholderText('#1f2937'), { target: { value: '#zzz' } });

    expect(props.setCardBgColor).not.toHaveBeenCalled();
  });

  it('accepts a hex colour', () => {
    const props = makeProps();
    render(<CardStyleSection {...props} />);

    fireEvent.change(screen.getByPlaceholderText('#1f2937'), { target: { value: '#123456' } });

    expect(props.setCardBgColor).toHaveBeenCalledWith('#123456');
  });

  it('can be collapsed', () => {
    render(<CardStyleSection {...makeProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /settings\.layoutCards/ }));

    expect(screen.queryByText('settings.density')).not.toBeInTheDocument();
  });
});
