import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  themeCardColor: 'rgba(31, 41, 55, 0.5)',
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

  it('shows the real theme colour on the sliders when no colour is chosen', () => {
    render(<CardStyleSection {...makeProps({ themeCardColor: 'rgba(15, 23, 42, 0.55)' })} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('#0f172a')).toBeInTheDocument();
  });

  it('reads a theme colour written as hex', () => {
    render(<CardStyleSection {...makeProps({ themeCardColor: '#ffffff' })} />);

    expect(screen.getAllByText('255')).toHaveLength(3);
  });

  it('fine-tunes from the theme colour', async () => {
    const props = makeProps({ themeCardColor: 'rgba(15, 23, 42, 0.55)' });
    render(<CardStyleSection {...props} />);
    const redSlider = screen.getAllByRole('slider')[4];

    fireEvent.change(redSlider, { target: { value: '42' } });

    await waitFor(() => expect(props.setCardBgColor).toHaveBeenCalledWith('#2a172a'));
  });

  it('prefers a chosen colour over the theme colour', () => {
    render(
      <CardStyleSection
        {...makeProps({ themeCardColor: 'rgba(15, 23, 42, 0.55)', cardBgColor: '#102030' })}
      />
    );

    expect(screen.getByText('16')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('can be collapsed', () => {
    render(<CardStyleSection {...makeProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /settings\.layoutCards/ }));

    expect(screen.queryByText('settings.density')).not.toBeInTheDocument();
  });
});
