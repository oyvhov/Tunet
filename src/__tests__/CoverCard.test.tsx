import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import CoverCard from '../components/cards/CoverCard';

const OPEN_CLOSE = 3;
const OPEN_CLOSE_STOP = 11;
const WITH_POSITION = 15;

const cover = (features: number, attributes: Record<string, unknown> = {}) => ({
  entity_id: 'cover.stue',
  state: 'open',
  attributes: {
    friendly_name: 'Stue',
    supported_features: features,
    ...attributes,
  },
});

const cardProps = (
  entity: ReturnType<typeof cover>,
  size: 'small' | 'large' = 'small',
  callService: ReturnType<typeof vi.fn> = vi.fn(async () => ({}))
) =>
  ({
    cardId: 'cover_card_1',
    entityId: 'cover.stue',
    entity,
    dragProps: {},
    controls: null,
    cardStyle: {},
    editMode: false,
    customNames: {},
    customIcons: {},
    onOpen: vi.fn(),
    callService,
    settings: { size },
    isMobile: false,
    t: (key: string) => key,
  }) as unknown as ComponentProps<typeof CoverCard>;

const stopButton = (root: ParentNode) =>
  root.querySelector('button .rounded-sm')?.closest('button') ?? null;

const chevron = (root: ParentNode, direction: 'up' | 'down') =>
  root.querySelector(`.lucide-chevron-${direction}`)?.closest('button') as HTMLButtonElement;

afterEach(cleanup);

describe('CoverCard', () => {
  it('switches mode from the small card icon without throwing', () => {
    const { container } = render(
      <CoverCard {...cardProps(cover(WITH_POSITION, { current_position: 50 }))} />
    );
    expect(chevron(container, 'up')).toBeUndefined();
    const icon = container.querySelector('.h-12.w-12') as HTMLElement;
    fireEvent.click(icon);
    expect(chevron(container, 'up')).toBeInTheDocument();
  });

  it.each(['small', 'large'] as const)('hides Stop without the stop feature (%s)', (size) => {
    const { container } = render(<CoverCard {...cardProps(cover(OPEN_CLOSE), size)} />);
    expect(chevron(container, 'up')).toBeInTheDocument();
    expect(stopButton(container)).toBeNull();
  });

  it.each(['small', 'large'] as const)('shows Stop with the stop feature (%s)', (size) => {
    const { container } = render(<CoverCard {...cardProps(cover(OPEN_CLOSE_STOP), size)} />);
    expect(stopButton(container)).toBeInTheDocument();
  });

  it('gives small card Open and Close a 44 px hit area without resizing them', () => {
    const { container } = render(<CoverCard {...cardProps(cover(OPEN_CLOSE_STOP))} />);
    expect(chevron(container, 'up').className).toMatch(/after:-left-\[22px\]/);
    expect(chevron(container, 'down').className).toMatch(/after:-right-\[22px\]/);
    for (const button of [chevron(container, 'up'), chevron(container, 'down')]) {
      expect(button).toHaveClass('relative', 'after:absolute', 'after:-inset-y-2');
    }
  });

  it('rolls back the position when the commit fails', async () => {
    const callService = vi.fn().mockRejectedValue(new Error('nope'));
    const props = cardProps(cover(WITH_POSITION, { current_position: 50 }), 'small', callService);
    const { container } = render(<CoverCard {...props} />);
    const slider = container.querySelector('.cursor-ew-resize') as HTMLElement;
    slider.setPointerCapture = () => {};
    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 100, top: 0, height: 40 }) as unknown as DOMRect;
    await act(async () => {
      fireEvent.pointerDown(slider, { clientX: 80, pointerId: 1 });
      fireEvent.pointerUp(slider, { clientX: 80, pointerId: 1 });
    });
    expect(callService).toHaveBeenCalledWith('cover', 'set_cover_position', {
      entity_id: 'cover.stue',
      position: 20,
    });
    expect(container).toHaveTextContent('50%');
  });

  const horizontalSlider = (container: HTMLElement) => {
    const slider = container.querySelector('.cursor-ew-resize') as HTMLElement;
    slider.setPointerCapture = () => {};
    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 100, top: 0, height: 40 }) as unknown as DOMRect;
    return slider;
  };

  it('does not move the cover when the drag is cancelled', async () => {
    const props = cardProps(cover(WITH_POSITION, { current_position: 50 }));
    const { container } = render(<CoverCard {...props} />);
    const slider = horizontalSlider(container);
    await act(async () => {
      fireEvent.pointerDown(slider, { clientX: 80, pointerId: 1 });
      fireEvent.pointerCancel(slider, { clientX: 0, pointerId: 1 });
    });
    expect(props.callService).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('50%');
  });

  it('does not move the cover when a vertical drag is cancelled', async () => {
    const props = cardProps(cover(WITH_POSITION, { current_position: 50 }), 'large');
    const { container } = render(<CoverCard {...props} />);
    const slider = container.querySelector('.cursor-ns-resize') as HTMLElement;
    slider.setPointerCapture = () => {};
    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 40, top: 0, height: 100 }) as unknown as DOMRect;
    await act(async () => {
      fireEvent.pointerDown(slider, { clientY: 80, pointerId: 1 });
      fireEvent.pointerCancel(slider, { clientY: 0, pointerId: 1 });
    });
    expect(props.callService).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('50%');
  });

  describe('draft position', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('returns to the reported position after 10 seconds if the motor never moves', async () => {
      const props = cardProps(cover(WITH_POSITION, { current_position: 50 }));
      const { container } = render(<CoverCard {...props} />);
      const slider = horizontalSlider(container);
      await act(async () => {
        fireEvent.pointerDown(slider, { clientX: 80, pointerId: 1 });
        fireEvent.pointerUp(slider, { clientX: 80, pointerId: 1 });
      });
      expect(container).toHaveTextContent('20%');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000);
      });
      expect(container).toHaveTextContent('20%');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      expect(container).toHaveTextContent('50%');
    });
  });
});
