import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatusBar from '../layouts/StatusBar';

type PillProps = {
  pill: { id: string };
  entity?: { state?: string; attributes?: Record<string, unknown> };
  badge?: number;
  onClick?: () => void;
};

const mocks = vi.hoisted(() => ({
  entities: {} as Record<string, unknown>,
  statusPillsConfig: [] as unknown[],
  renderPill: vi.fn(),
  actions: {
    setActiveMediaId: vi.fn(),
    setActiveMediaGroupKey: vi.fn(),
    setActiveMediaGroupIds: vi.fn(),
    setActiveMediaSessionSensorIds: vi.fn(),
    setActiveMediaModal: vi.fn(),
    setShowAlarmModal: vi.fn(),
    setShowStatusGroupModal: vi.fn(),
    setShowStatusPillsConfig: vi.fn(),
    setShowSensorInfoModal: vi.fn(),
  },
}));

vi.mock('../contexts', () => ({
  useHomeAssistant: () => ({ entities: mocks.entities }),
  usePages: () => ({ statusPillsConfig: mocks.statusPillsConfig }),
  useModalActions: () => mocks.actions,
}));

// Memoized like the real pill, so a render here means StatusPill's memo did not hold.
vi.mock('../components/cards/StatusPill', async () => {
  const { memo } = await import('react');
  return {
    default: memo(function MockStatusPill(props: PillProps) {
      mocks.renderPill(props);
      return <button onClick={props.onClick}>{props.pill.id}</button>;
    }),
  };
});

const t = (key: string) => key;

// getA changes on every entity update in the real app, so each render gets a new one.
const renderBar = () => render(<StatusBar t={t} getA={() => null} />);
const rerenderBar = (rerender: (ui: React.ReactNode) => void) =>
  rerender(<StatusBar t={t} getA={() => null} />);

const lastPillProps = () => mocks.renderPill.mock.lastCall?.[0] as PillProps;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StatusBar group pills', () => {
  const groupPill = {
    id: 'lights',
    type: 'group_status',
    groupPreset: 'lights_on',
    clickable: true,
    showCount: true,
  };
  const entities = {
    'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen' } },
    'sensor.power': { state: '100', attributes: {} },
  };

  beforeEach(() => {
    mocks.statusPillsConfig = [groupPill];
    mocks.entities = entities;
  });

  it('does not re-render the pill when an unrelated entity changes', () => {
    const { rerender } = renderBar();
    expect(mocks.renderPill).toHaveBeenCalledTimes(1);

    mocks.entities = { ...entities, 'sensor.power': { state: '101', attributes: {} } };
    rerenderBar(rerender);

    expect(mocks.renderPill).toHaveBeenCalledTimes(1);
  });

  it('re-renders with the new count when the group changes', () => {
    const { rerender } = renderBar();

    mocks.entities = { ...entities, 'light.porch': { state: 'on', attributes: {} } };
    rerenderBar(rerender);

    expect(mocks.renderPill).toHaveBeenCalledTimes(2);
    expect(lastPillProps().entity?.state).toBe('2');
    expect(lastPillProps().entity?.attributes?.statusPillCount).toBe(2);
    expect(lastPillProps().badge).toBe(2);
  });

  it('renders nothing when the group is empty', () => {
    mocks.entities = { 'sensor.power': { state: '100', attributes: {} } };

    renderBar();

    expect(mocks.renderPill).not.toHaveBeenCalled();
  });

  it('opens the group popup when tapped', () => {
    renderBar();

    fireEvent.click(screen.getByText('lights'));

    expect(mocks.actions.setShowStatusGroupModal).toHaveBeenCalledWith({
      pill: groupPill,
      presetId: 'lights_on',
    });
  });

  it('is not tappable when clickable is off', () => {
    mocks.statusPillsConfig = [{ ...groupPill, clickable: false }];

    renderBar();

    expect(lastPillProps().onClick).toBeUndefined();
  });
});
