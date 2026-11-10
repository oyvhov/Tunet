import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MowerCard from '../components/cards/MowerCard';

const baseProps = (overrides = {}) => {
  const callService = vi.fn();
  const onOpen = vi.fn();
  const props = {
    mowerId: 'lawn_mower.garden',
    dragProps: {},
    controls: null,
    cardStyle: {},
    entities: {
      'lawn_mower.garden': {
        state: 'docked',
        attributes: {
          friendly_name: 'Garden Mower',
          battery_level: 87,
        },
      },
    },
    editMode: false,
    cardSettings: {},
    settingsKey: 'lawn_mower.garden',
    customNames: {},
    customIcons: {},
    getA: (id, attr, fallback) => {
      const e = props?.entities?.[id];
      const v = e?.attributes?.[attr];
      return v == null ? fallback : v;
    },
    callService,
    onOpen,
    isMobile: false,
    t: (key) => key,
    ...overrides,
  };
  return { props, callService, onOpen };
};

describe('MowerCard', () => {
  it('renders friendly name and docked status', () => {
    const { props } = baseProps();
    render(<MowerCard {...props} />);
    expect(screen.getByText('Garden Mower')).toBeInTheDocument();
    // 87% battery → not docked-full → "charging" label key
    expect(screen.getByText('mower.charging')).toBeInTheDocument();
  });

  it('start button calls lawn_mower.start_mowing when not active', () => {
    const { props, callService } = baseProps();
    render(<MowerCard {...props} />);
    const startBtn = screen.getByLabelText('mower.start');
    fireEvent.click(startBtn);
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'start_mowing', {
      entity_id: 'lawn_mower.garden',
    });
  });

  it('primary button calls lawn_mower.pause when mowing', () => {
    const { props, callService } = baseProps({
      entities: {
        'lawn_mower.garden': {
          state: 'mowing',
          attributes: { friendly_name: 'Garden Mower', battery_level: 60 },
        },
      },
    });
    render(<MowerCard {...props} />);
    const pauseBtn = screen.getByLabelText('mower.pause');
    fireEvent.click(pauseBtn);
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'pause', {
      entity_id: 'lawn_mower.garden',
    });
  });

  it('dock button calls lawn_mower.dock', () => {
    const { props, callService } = baseProps();
    render(<MowerCard {...props} />);
    const dockBtn = screen.getByLabelText('mower.dock');
    fireEvent.click(dockBtn);
    expect(callService).toHaveBeenCalledWith('lawn_mower', 'dock', {
      entity_id: 'lawn_mower.garden',
    });
  });

  it('does not call services when entity is unavailable', () => {
    const { props, callService } = baseProps({
      entities: {
        'lawn_mower.garden': {
          state: 'unavailable',
          attributes: { friendly_name: 'Garden Mower' },
        },
      },
    });
    render(<MowerCard {...props} />);
    fireEvent.click(screen.getByLabelText('mower.start'));
    fireEvent.click(screen.getByLabelText('mower.dock'));
    expect(callService).not.toHaveBeenCalled();
  });

  it('puts the two buttons of a small phone card side by side', () => {
    const { props } = baseProps({
      isMobile: true,
      cardSettings: { 'lawn_mower.garden': { size: 'small' } },
    });
    render(<MowerCard {...props} />);
    const buttons = screen.getByLabelText('mower.dock').parentElement;
    expect(buttons).toContainElement(screen.getByLabelText('mower.start'));
    expect(buttons).not.toHaveClass('flex-col');
  });

  it('renders missing entity placeholder in edit mode when entity is absent', () => {
    const { props } = baseProps({ entities: {}, editMode: true });
    render(<MowerCard {...props} />);
    expect(screen.getByText('common.missing')).toBeInTheDocument();
    expect(screen.getByText('lawn_mower.garden')).toBeInTheDocument();
  });
});
