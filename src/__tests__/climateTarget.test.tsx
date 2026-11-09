import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { useClimateTarget } from '../hooks/useClimateTarget';
import GenericClimateCard from '../components/cards/GenericClimateCard';
import GenericClimateModal from '../modals/GenericClimateModal';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({ haConfig: { unit_system: { temperature: '°C' } } }),
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children }: { open: boolean; children: () => unknown }) =>
    open ? <div>{children() as never}</div> : null,
}));

const heat = (attributes: Record<string, unknown> = {}, state = 'heat') => ({
  entity_id: 'climate.stue',
  state,
  attributes: {
    friendly_name: 'Stue',
    temperature: 20,
    current_temperature: 19,
    min_temp: 5,
    max_temp: 30,
    hvac_modes: ['off', 'heat'],
    fan_modes: ['auto'],
    swing_modes: ['on'],
    ...attributes,
  },
});

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const buttonWith = (root: ParentNode, icon: string) =>
  root.querySelector(`.lucide-${icon}`)?.closest('button') as HTMLButtonElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useClimateTarget', () => {
  const setup = (entity: ReturnType<typeof heat>, send = vi.fn()) => {
    const view = renderHook(({ current }) => useClimateTarget(current, send), {
      initialProps: { current: entity },
    });
    return { ...view, send };
  };

  it('adds up quick taps and sends once', async () => {
    const { result, send } = setup(heat());
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    expect(result.current.target).toBe(21.5);
    expect(send).not.toHaveBeenCalled();
    await tick(350);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(21.5);
  });

  it('drops a queued value when the thermostat goes unavailable during the pause', async () => {
    const { result, rerender, send } = setup(heat());
    act(() => result.current.nudge(1));
    rerender({ current: heat({}, 'unavailable') });
    await tick(350);
    expect(send).not.toHaveBeenCalled();
    rerender({ current: heat() });
    expect(result.current.target).toBe(20);
  });

  it('stays inside min_temp and max_temp', async () => {
    const { result, send } = setup(heat({ temperature: 29.5 }));
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    expect(result.current.target).toBe(30);
    await tick(350);
    expect(send).toHaveBeenCalledWith(30);
    act(() => result.current.setTarget(2));
    expect(result.current.target).toBe(5);
  });

  it('uses target_temp_step', () => {
    const { result } = setup(heat({ target_temp_step: 0.1 }));
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    expect(result.current.step).toBe(0.1);
    expect(result.current.target).toBe(20.3);
  });

  it('lets go of the pending value when HA reports it', async () => {
    const { result, rerender } = setup(heat());
    act(() => result.current.nudge(1));
    await tick(350);
    rerender({ current: heat({ temperature: 20.5 }) });
    expect(result.current.target).toBe(20.5);
    rerender({ current: heat({ temperature: 24 }) });
    expect(result.current.target).toBe(24);
  });

  it('keeps the pending value while an older report arrives', () => {
    const { result, rerender } = setup(heat());
    act(() => result.current.nudge(1));
    act(() => result.current.nudge(1));
    rerender({ current: heat({ temperature: 20.5 }) });
    expect(result.current.target).toBe(21);
  });

  it('falls back to the reported target when the call fails', async () => {
    const send = vi.fn().mockRejectedValue(new Error('nope'));
    const { result } = setup(heat(), send);
    act(() => result.current.nudge(1));
    expect(result.current.target).toBe(20.5);
    await tick(350);
    expect(result.current.target).toBe(20);
  });

  it('drops the pending value about 2 seconds after the call if HA did not change it', async () => {
    const { result } = setup(heat({ temperature: 21 }));
    act(() => result.current.nudge(1));
    await tick(350);
    expect(result.current.target).toBe(21.5);
    await tick(1500);
    expect(result.current.target).toBe(21.5);
    await tick(1000);
    expect(result.current.target).toBe(21);
  });

  it('keeps a value the user changed after the last call', async () => {
    const { result } = setup(heat({ temperature: 21 }));
    act(() => result.current.nudge(1));
    await tick(350);
    await tick(1500);
    act(() => result.current.nudge(1));
    await tick(350);
    await tick(1000);
    expect(result.current.target).toBe(22);
  });

  it('gives up on the pending value after 10 seconds', async () => {
    const { result } = setup(
      heat(),
      vi.fn(() => new Promise(() => {}))
    );
    act(() => result.current.nudge(1));
    await tick(9000);
    expect(result.current.target).toBe(20.5);
    await tick(1500);
    expect(result.current.target).toBe(20);
  });

  it.each([
    ['no numeric target', heat({ temperature: null })],
    ['unavailable', heat({ temperature: 20 }, 'unavailable')],
  ])('cannot adjust with %s', async (_name, entity) => {
    const { result, send } = setup(entity);
    expect(result.current.canAdjust).toBe(false);
    expect(result.current.target).toBeNull();
    act(() => result.current.nudge(1));
    await tick(350);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('heat_cool range', () => {
  const range = (state = 'heat_cool') =>
    heat({ temperature: null, target_temp_low: 20, target_temp_high: 24 }, state);

  it('reports the range and stays read-only', async () => {
    const send = vi.fn();
    const { result } = renderHook(() => useClimateTarget(range(), send));
    expect(result.current.targetRange).toEqual({ low: 20, high: 24 });
    expect(result.current.target).toBeNull();
    expect(result.current.canAdjust).toBe(false);
    act(() => result.current.nudge(1));
    await tick(350);
    expect(send).not.toHaveBeenCalled();
  });

  it('has no range while unavailable or with a single target', () => {
    const none = renderHook(() => useClimateTarget(range('unavailable'), vi.fn()));
    expect(none.result.current.targetRange).toBeNull();
    const single = renderHook(() =>
      useClimateTarget(heat({ target_temp_low: 20, target_temp_high: 24 }), vi.fn())
    );
    expect(single.result.current.targetRange).toBeNull();
  });
});

describe('GenericClimateCard target controls', () => {
  const cardProps = (entity: ReturnType<typeof heat>, size: 'small' | 'large' = 'large') =>
    ({
      cardId: 'climate_card_1',
      entityId: 'climate.stue',
      entity,
      dragProps: {},
      controls: null,
      cardStyle: {},
      editMode: false,
      customNames: {},
      customIcons: {},
      onOpen: vi.fn(),
      onSetTemperature: vi.fn(),
      settings: { size },
      t: (key: string) => key,
    }) as unknown as ComponentProps<typeof GenericClimateCard>;

  it.each(['small', 'large'] as const)('disables plus and minus without a target (%s)', (size) => {
    const props = cardProps(heat({ temperature: null }), size);
    const { container } = render(<GenericClimateCard {...props} />);
    expect(buttonWith(container, 'plus')).toBeDisabled();
    expect(buttonWith(container, 'minus')).toBeDisabled();
  });

  it.each(['small', 'large'] as const)('shows a heat_cool range read-only (%s)', (size) => {
    const entity = heat({ temperature: null, target_temp_low: 20, target_temp_high: 24 });
    const { container } = render(<GenericClimateCard {...cardProps(entity, size)} />);
    expect(container).toHaveTextContent('20–24');
    expect(container).not.toHaveTextContent('--');
    expect(buttonWith(container, 'plus')).toBeDisabled();
    expect(buttonWith(container, 'minus')).toBeDisabled();
  });

  it('shows the pending target and sends a single call for quick taps', async () => {
    const props = cardProps(heat());
    const { container } = render(<GenericClimateCard {...props} />);
    const plus = buttonWith(container, 'plus');
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(container).toHaveTextContent('21.5');
    await tick(350);
    expect(props.onSetTemperature).toHaveBeenCalledTimes(1);
    expect(props.onSetTemperature).toHaveBeenCalledWith(21.5);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('shows the small card controls on touch screens', () => {
    const { container } = render(<GenericClimateCard {...cardProps(heat(), 'small')} />);
    expect(container.querySelector('.card-controls--temp')).toHaveClass('touch:visible');
  });

  it.each([false, true])('gives the large card a 44 px stepper (mobile %s)', (isMobile) => {
    const props = { ...cardProps(heat()), isMobile };
    const { container } = render(<GenericClimateCard {...props} />);
    for (const icon of ['plus', 'minus']) {
      expect(buttonWith(container, icon)).toHaveClass('h-11', 'w-11');
    }
  });
});

describe('GenericClimateModal target controls', () => {
  const renderModal = (entity: ReturnType<typeof heat>) => {
    const callService = vi.fn();
    const view = render(
      <GenericClimateModal
        entityId="climate.stue"
        entity={entity}
        onClose={vi.fn()}
        callService={callService}
        hvacMap={{ off: 'off', heat: 'heat' }}
        fanMap={{}}
        swingMap={{}}
        settings={{ climateFavoriteModes: ['off', 'heat'] }}
        t={(key: string) => key}
      />
    );
    return { ...view, callService };
  };

  it('disables the stepper and slider without a numeric target', () => {
    const { container } = renderModal(heat({ temperature: null }));
    expect(buttonWith(container, 'plus')).toBeDisabled();
    expect(buttonWith(container, 'minus')).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
    expect(container).not.toHaveTextContent('21');
  });

  it('shows a heat_cool range read-only', () => {
    const { container } = renderModal(
      heat({
        temperature: null,
        current_temperature: null,
        target_temp_low: 20,
        target_temp_high: 24,
      })
    );
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('20–24');
    expect(buttonWith(container, 'plus')).toBeDisabled();
    expect(buttonWith(container, 'minus')).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('follows the pending value in the big number and sends once', async () => {
    const { container, callService } = renderModal(heat());
    const plus = buttonWith(container, 'plus');
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('21');
    await tick(350);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.stue',
      temperature: 21,
    });
  });

  it('sends the slider once after the finger pauses', async () => {
    const { callService } = renderModal(heat());
    const slider = screen.getByRole('slider');
    for (const value of ['22', '23', '24']) {
      fireEvent.change(slider, { target: { value } });
      await tick(20);
    }
    await tick(350);
    expect(callService).toHaveBeenCalledTimes(1);
    expect(callService).toHaveBeenCalledWith('climate', 'set_temperature', {
      entity_id: 'climate.stue',
      temperature: 24,
    });
  });

  it('is inert when unavailable and hides the dropdowns', () => {
    const { container, callService } = renderModal(
      heat({ temperature: 20, current_temperature: 19 }, 'unavailable')
    );
    expect(buttonWith(container, 'plus')).toBeDisabled();
    expect(buttonWith(container, 'minus')).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
    for (const shortcut of screen.getAllByRole('button', { name: /^climate\.shortcuts/ })) {
      expect(shortcut).toBeDisabled();
    }
    expect(
      screen.queryByRole('button', { name: /^climate\.(allModes|fanSpeed|swing)/ })
    ).toBeNull();
    expect(callService).not.toHaveBeenCalled();
  });
});
