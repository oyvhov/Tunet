import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import FanCard from '../components/cards/FanCard';
import GenericFanModal from '../modals/GenericFanModal';

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children }: { open: boolean; children: () => unknown }) =>
    open ? <div>{children() as never}</div> : null,
}));

const ALL_FEATURES = 63;

const fan = (state: string, attributes: Record<string, unknown> = {}) => ({
  entity_id: 'fan.stue',
  state,
  attributes: {
    friendly_name: 'Stue',
    supported_features: ALL_FEATURES,
    percentage: 40,
    direction: 'forward',
    preset_modes: ['auto'],
    ...attributes,
  },
});

const cardProps = (entity: ReturnType<typeof fan>, overrides: Record<string, unknown> = {}) => {
  const entities = { 'fan.stue': entity };
  return {
    fanId: 'fan.stue',
    entities,
    dragProps: {},
    controls: null,
    cardStyle: {},
    editMode: false,
    cardSettings: {},
    settingsKey: 'home::fan.stue',
    customNames: {},
    customIcons: {},
    getA: (id: string, attr: string, fallback: unknown = null) =>
      entities[id as 'fan.stue']?.attributes?.[attr as 'percentage'] ?? fallback,
    callService: vi.fn(async () => ({})),
    onOpen: vi.fn(),
    isMobile: false,
    t: (key: string) => key,
    ...overrides,
  } as unknown as ComponentProps<typeof FanCard>;
};

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('FanCard', () => {
  it('disables every control when unavailable', () => {
    const { container } = render(<FanCard {...cardProps(fan('unavailable'))} />);
    const controls = container.querySelectorAll('button, input');
    expect(controls.length).toBeGreaterThan(0);
    controls.forEach((control) => expect(control).toBeDisabled());
  });

  it('says it is unavailable and shows no value', () => {
    const { container } = render(<FanCard {...cardProps(fan('unavailable'))} />);
    expect(container).toHaveTextContent('status.unavailable');
    expect(container).toHaveTextContent('--');
    expect(container).not.toHaveTextContent('40%');
  });

  it('labels the mobile badge', () => {
    render(<FanCard {...cardProps(fan('unknown'), { isMobile: true })} />);
    expect(screen.getByText('common.unknown')).toBeInTheDocument();
  });

  it('translates on and off for a fan without speed control', () => {
    const entity = fan('on', { supported_features: 48 });
    const { container } = render(<FanCard {...cardProps(entity)} />);
    expect(container).toHaveTextContent('common.on');
    expect(container).not.toHaveTextContent('ON');
  });

  it('follows the finger and sends one call after a pause', async () => {
    const props = cardProps(fan('on'));
    const { container } = render(<FanCard {...props} />);
    const slider = screen.getByRole('slider');
    for (const value of ['50', '60', '70']) {
      fireEvent.change(slider, { target: { value } });
      await tick(20);
    }
    expect(container).toHaveTextContent('70%');
    expect(props.callService).not.toHaveBeenCalled();
    await tick(350);
    expect(props.callService).toHaveBeenCalledTimes(1);
    expect(props.callService).toHaveBeenCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.stue',
      percentage: 70,
    });
  });

  it('returns to the reported speed when the call fails', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('nope'));
    const props = cardProps(fan('on'), { callService });
    const { container } = render(<FanCard {...props} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    await tick(400);
    expect(container).toHaveTextContent('40%');
  });
});

describe('FanCard draft speed', () => {
  it('gives up after 10 seconds when HA never reports the speed', async () => {
    const { container } = render(<FanCard {...cardProps(fan('on'))} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    await tick(20);
    await tick(9000);
    expect(container).toHaveTextContent('70%');
    await tick(1500);
    expect(container).toHaveTextContent('40%');
  });

  it('keeps the draft when HA reports an earlier value of the same drag', async () => {
    const entity = fan('on');
    const props = cardProps(entity);
    const { container, rerender } = render(<FanCard {...props} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    await tick(350);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } });
    await tick(20);
    const echo = fan('on', { percentage: 50 });
    rerender(<FanCard {...cardProps(echo, { callService: props.callService })} />);
    expect(container).toHaveTextContent('80%');
    await tick(350);
    expect(props.callService).toHaveBeenLastCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.stue',
      percentage: 80,
    });
  });

  it('lets go of the draft when HA reports the requested speed', async () => {
    const props = cardProps(fan('on'));
    const { container, rerender } = render(<FanCard {...props} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    await tick(350);
    rerender(<FanCard {...cardProps(fan('on', { percentage: 70 }))} />);
    rerender(<FanCard {...cardProps(fan('on', { percentage: 30 }))} />);
    expect(container).toHaveTextContent('30%');
  });

  it('lets go of the draft when a stepped fan rounds the speed', async () => {
    const stepped = { percentage_step: 33.33, percentage: 33 };
    const props = cardProps(fan('on', stepped));
    const { container, rerender } = render(<FanCard {...props} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    await tick(350);
    rerender(<FanCard {...cardProps(fan('on', { ...stepped, percentage: 67 }))} />);
    expect(container).toHaveTextContent('67%');
  });
});

describe('GenericFanModal', () => {
  const renderModal = (entity: ReturnType<typeof fan>) => {
    const callService = vi.fn(async () => ({}));
    const view = render(
      <GenericFanModal
        show
        onClose={vi.fn()}
        entityId="fan.stue"
        entity={entity}
        callService={callService}
        t={(key: string) => key}
      />
    );
    return { ...view, callService };
  };

  it('is inert when unavailable', () => {
    renderModal(fan('unavailable'));
    expect(screen.getByRole('button', { name: /fan\.turnOn/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /fan\.oscillate/ })).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /fan\.(direction|preset)/ })).toBeNull();
  });

  it('keeps the controls when available', () => {
    renderModal(fan('on'));
    expect(screen.getByRole('button', { name: /fan\.turnOff/ })).toBeEnabled();
    expect(screen.getByRole('slider')).toBeEnabled();
    expect(screen.getByRole('button', { name: /fan\.direction/ })).toBeInTheDocument();
  });

  const modal = (entity: ReturnType<typeof fan>, callService: () => unknown) => (
    <GenericFanModal
      show
      onClose={vi.fn()}
      entityId="fan.stue"
      entity={entity}
      callService={callService}
      t={(key: string) => key}
    />
  );

  it('still sends the last value when an earlier value is echoed mid-drag', async () => {
    const callService = vi.fn(async () => ({}));
    const { rerender } = render(modal(fan('on'), callService));
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    await tick(200);
    expect(callService).toHaveBeenCalledTimes(1);
    fireEvent.change(slider, { target: { value: '80' } });
    await tick(20);
    rerender(modal(fan('on', { percentage: 50 }), callService));
    expect(slider).toHaveValue('80');
    await tick(200);
    expect(callService).toHaveBeenCalledTimes(2);
    expect(callService).toHaveBeenLastCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.stue',
      percentage: 80,
    });
  });

  it('sends a waiting value when the popup closes straight away', async () => {
    const callService = vi.fn(async () => ({}));
    const { unmount } = render(modal(fan('on'), callService));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    await tick(50);
    expect(callService).not.toHaveBeenCalled();
    unmount();
    expect(callService).toHaveBeenCalledWith('fan', 'set_percentage', {
      entity_id: 'fan.stue',
      percentage: 70,
    });
  });

  it('follows HA again once the value has landed', async () => {
    const callService = vi.fn(async () => ({}));
    const view = render(modal(fan('on'), callService));
    const { rerender } = view;
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '70' } });
    await tick(200);
    rerender(modal(fan('on', { percentage: 70 }), callService));
    rerender(modal(fan('on', { percentage: 30 }), callService));
    expect(view.container.querySelector('.tabular-nums')).toHaveTextContent('30%');
    expect(callService).toHaveBeenCalledTimes(1);
  });

  it('gives up on a value HA never reports', async () => {
    const callService = vi.fn(async () => ({}));
    const { container } = render(modal(fan('on'), callService));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
    await tick(20);
    await tick(9000);
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('70%');
    await tick(1500);
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('40%');
    expect(callService).toHaveBeenCalledTimes(1);
  });
});
