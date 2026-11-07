import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericClimateModal from '../modals/GenericClimateModal';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C' } },
  }),
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children }) => (open ? <div>{children()}</div> : null),
}));

vi.mock('../components/ui/M3Slider', () => ({
  default: () => <input aria-label="temperature" type="range" />,
}));

const translations = {
  'climate.shortcuts': 'Shortcuts',
  'climate.allModes': 'All modes',
};
const t = (key) => translations[key] || key;
const hvacMap = { off: 'Off', heat: 'Heat', cool: 'Cool' };
const entity = {
  state: 'heat',
  attributes: {
    friendly_name: 'Living room',
    current_temperature: 20,
    temperature: 21,
    hvac_modes: ['off', 'heat', 'cool'],
    fan_modes: [],
    swing_modes: [],
  },
};

const renderModal = (props = {}) => {
  const callService = vi.fn();
  render(
    <GenericClimateModal
      entityId="climate.living_room"
      entity={entity}
      onClose={vi.fn()}
      callService={callService}
      hvacMap={hvacMap}
      fanMap={{}}
      swingMap={{}}
      t={t}
      {...props}
    />
  );
  return callService;
};

describe('GenericClimateModal mode shortcuts', () => {
  it.each([
    ['heat', 'heat', 'status-chip--warn'],
    ['cool', 'cool', 'status-chip--accent'],
    ['dry', 'dry', 'status-chip--neutral'],
    ['fan_only', 'fanOnly', 'status-chip--neutral'],
    ['auto', 'auto', 'status-chip--neutral'],
    ['heat_cool', 'heatCool', 'status-chip--neutral'],
  ])('shows the %s mode when no action is reported', (mode, label, toneClass) => {
    renderModal({ entity: { ...entity, state: mode } });
    const badge = screen.getByText(`climate.hvac.${label}`);
    expect(badge.parentElement).toHaveClass('status-chip', toneClass);
    expect(screen.queryByText('climate.action.idle')).not.toBeInTheDocument();
  });

  it('shows Idle only when reported by the integration', () => {
    renderModal({
      entity: { ...entity, attributes: { ...entity.attributes, hvac_action: 'idle' } },
    });
    expect(screen.getByText('climate.action.idle').parentElement).toHaveClass(
      'status-chip--neutral'
    );
  });

  it('labels the large number as the target and shows the indoor temperature', () => {
    renderModal();
    expect(screen.getByText('climate.target')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('20°C')).toBeInTheDocument();
  });

  it('shows Off and Heat by default and sends the selected HVAC mode', () => {
    const callService = renderModal();

    expect(screen.getByRole('button', { name: 'Shortcuts: Off' })).toBeInTheDocument();
    const activeShortcut = screen.getByRole('button', { name: 'Shortcuts: Heat' });
    expect(activeShortcut).toHaveAttribute('aria-pressed', 'true');
    expect(activeShortcut.className).not.toContain('accent');

    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts: Off' }));
    expect(callService).toHaveBeenCalledWith('climate', 'set_hvac_mode', {
      entity_id: 'climate.living_room',
      hvac_mode: 'off',
    });
  });

  it('respects configured shortcuts and allows explicitly hiding them', () => {
    const { rerender } = render(
      <GenericClimateModal
        entityId="climate.living_room"
        entity={entity}
        onClose={vi.fn()}
        callService={vi.fn()}
        hvacMap={hvacMap}
        fanMap={{}}
        swingMap={{}}
        settings={{ climateFavoriteModes: ['cool'] }}
        t={t}
      />
    );

    expect(screen.getByRole('button', { name: 'Shortcuts: Cool' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shortcuts: Off' })).not.toBeInTheDocument();

    rerender(
      <GenericClimateModal
        entityId="climate.living_room"
        entity={entity}
        onClose={vi.fn()}
        callService={vi.fn()}
        hvacMap={hvacMap}
        fanMap={{}}
        swingMap={{}}
        settings={{ climateFavoriteModes: [] }}
        t={t}
      />
    );

    expect(screen.queryByText('Shortcuts')).not.toBeInTheDocument();
  });
});
