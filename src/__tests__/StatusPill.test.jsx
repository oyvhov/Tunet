import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StatusPill from '../components/cards/StatusPill';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: {
      unit_system: {
        temperature: '°C',
      },
    },
  }),
}));

describe('StatusPill', () => {
  const baseEntity = {
    entity_id: 'sensor.living_room_temperature',
    state: '21',
    attributes: {
      friendly_name: 'Living Room Temperature',
      unit_of_measurement: '°C',
    },
  };

  const basePill = {
    id: 'pill-1',
    type: 'conditional',
    icon: 'Activity',
    conditionEnabled: false,
    iconBgColor: 'rgba(59, 130, 246, 0.1)',
    iconColor: 'text-[var(--accent-color)]',
  };

  it('supports icon-only pills by hiding label and subtitle text', () => {
    const { container } = render(
      <StatusPill
        pill={{ ...basePill, showLabel: false, showSublabel: false }}
        entity={baseEntity}
        t={(key) => key}
      />
    );

    expect(screen.queryByText('Living Room Temperature')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('21');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('uses the larger mobile text size without changing the desktop size', () => {
    render(
      <StatusPill
        pill={{ ...basePill, showLabel: true }}
        entity={baseEntity}
        isMobile
        t={(key) => key}
      />
    );

    expect(screen.getByText('Living Room Temperature')).toHaveClass('text-[11px]');
  });

  it('prefers an explicit heading over the generic name field for visible heading text', () => {
    render(
      <StatusPill
        pill={{ ...basePill, name: 'Custom pill', label: 'Legacy label', showLabel: true }}
        entity={baseEntity}
        t={(key) => key}
      />
    );

    expect(screen.getByText('Legacy label')).toBeInTheDocument();
    expect(screen.queryByText('Custom pill')).not.toBeInTheDocument();
  });

  it('applies rotate-medium-slow animation preset to the icon when active', () => {
    const { container } = render(
      <StatusPill
        pill={{ ...basePill, animationPreset: 'rotate-medium-slow' }}
        entity={{ ...baseEntity, state: 'on' }}
        t={(key) => key}
      />
    );

    const icon = container.querySelector('svg');

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('class') || '').toContain('animate-spin');
    expect(icon?.style.animationDuration).toBe('8s');
  });

  it('applies pulse animation to the icon instead of the full pill wrapper', () => {
    const { container } = render(
      <StatusPill
        pill={{ ...basePill, animationPreset: 'pulse-medium' }}
        entity={{ ...baseEntity, state: 'on' }}
        t={(key) => key}
      />
    );

    const wrapper = container.firstElementChild;
    const icon = container.querySelector('svg');

    expect(wrapper?.getAttribute('class') || '').not.toContain('animate-pulse');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('class') || '').toContain('status-pill-icon-pulse');
    expect(icon?.style.getPropertyValue('--status-pill-pulse-duration')).toBe('2.2s');
  });

  it('runs the selected rotation animation on conditional pills regardless of entity state', () => {
    const { container } = render(
      <StatusPill
        pill={{ ...basePill, animationPreset: 'rotate-slow' }}
        entity={{ ...baseEntity, state: 'home' }}
        t={(key) => key}
      />
    );

    const icon = container.querySelector('svg');

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('class') || '').toContain('animate-spin');
    expect(icon?.style.animationDuration).toBe('12s');
  });

  it('formats numeric sensor values using the configured decimal places', () => {
    render(
      <StatusPill
        pill={{ ...basePill, decimals: 2 }}
        entity={{
          ...baseEntity,
          state: '21.6789',
          attributes: {
            ...baseEntity.attributes,
            unit_of_measurement: '%',
          },
        }}
        t={(key) => key}
      />
    );

    expect(screen.getByText('21.68 %')).toBeInTheDocument();
  });

  it('supports zero decimal places for numeric sensor values', () => {
    render(
      <StatusPill
        pill={{ ...basePill, decimals: 0 }}
        entity={{
          ...baseEntity,
          state: '21.6789',
          attributes: {
            ...baseEntity.attributes,
            unit_of_measurement: '%',
          },
        }}
        t={(key) => key}
      />
    );

    expect(screen.getByText('22 %')).toBeInTheDocument();
  });

  it('renders smart group pills with their synthetic count entity', () => {
    render(
      <StatusPill
        pill={{ ...basePill, type: 'group_status', icon: 'Lightbulb', showCount: true }}
        entity={{
          entity_id: 'status_group.lights_on',
          state: '2',
          attributes: {
            friendly_name: 'Lights on',
            statusPillSublabel: '2',
            statusPillCount: 2,
          },
        }}
        badge={2}
        t={(key) => key}
      />
    );

    expect(screen.getByText('Lights on')).toBeInTheDocument();
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('keeps the media count badge above and outside the pill on mobile', () => {
    const { container } = render(
      <StatusPill
        pill={{
          ...basePill,
          type: 'sonos',
          label: 'Flowers',
          conditionEnabled: false,
          showCount: true,
        }}
        entity={[
          {
            entity_id: 'media_player.living_room',
            state: 'playing',
            attributes: { media_title: 'Flowers', media_artist: 'Miley Cyrus' },
          },
        ]}
        badge={1}
        isMobile
        isMediaActive={(entity) => entity.state === 'playing'}
        getA={(_id, attribute) =>
          ({ media_title: 'Flowers', media_artist: 'Miley Cyrus' })[attribute]
        }
        getEntityImageUrl={() => null}
        t={(key) => key}
      />
    );

    const badge = container.querySelector('[data-status-pill-badge]');
    expect(badge).toHaveClass('-top-2', '-right-2');
    expect(badge).not.toHaveClass('top-1', 'right-1');
    expect(badge).not.toHaveClass('border-2');
    expect(container.firstElementChild).not.toHaveClass('pr-6');
  });
});
