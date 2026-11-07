import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GenericClimateModal from '../modals/GenericClimateModal';
import NordpoolModal from '../modals/NordpoolModal';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    haConfig: { currency: 'øre', unit_system: { temperature: '°C' } },
  }),
}));

vi.mock('../components/ui/AccessibleModalShell', () => ({
  useModalShell: () => null,
  default: ({ open, children, size, panelClassName, overlayClassName }) =>
    open ? (
      <div
        data-testid="modal-shell"
        data-size={size}
        data-panel-class={panelClassName}
        data-overlay-class={overlayClassName}
      >
        {children()}
      </div>
    ) : null,
}));

vi.mock('../components/ui/M3Slider', () => ({
  default: () => <input aria-label="temperature" type="range" />,
}));

vi.mock('../components/charts/InteractivePowerGraph', () => ({
  default: () => <div data-testid="power-graph" />,
}));

const t = (key) => key;

describe('mobile card modal layout', () => {
  it('uses the full mobile viewport for climate while restoring desktop spacing', () => {
    render(
      <GenericClimateModal
        entityId="climate.living_room"
        entity={{
          state: 'heat',
          attributes: {
            friendly_name: 'Living room',
            current_temperature: 20,
            temperature: 21,
            hvac_modes: [],
            fan_modes: [],
            swing_modes: [],
          },
        }}
        onClose={vi.fn()}
        callService={vi.fn()}
        hvacMap={{}}
        fanMap={{}}
        swingMap={{}}
        t={t}
      />
    );

    const shell = screen.getByTestId('modal-shell');
    expect(shell.dataset.size).toBe('m');
    expect(shell.dataset.panelClass).toBeUndefined();
    expect(shell.dataset.overlayClass).toBeUndefined();
  });

  it('packs Nordpool statistics into the compact mobile layout', () => {
    render(
      <NordpoolModal
        show
        onClose={vi.fn()}
        entity={{}}
        fullPriceData={[{ start: '2026-08-16T00:00:00', value: 50 }]}
        currentPriceIndex={0}
        priceStats={{ min: 30, avg: 50, max: 80 }}
        name="Straumpris"
        t={t}
        language="nn"
        saveCardSetting={vi.fn()}
        cardId="sensor.price"
        settings={{}}
      />
    );

    expect(screen.getByTestId('modal-shell').dataset.size).toBe('l');
    expect(screen.getByText('power.avg').parentElement?.parentElement).toHaveClass(
      'grid-cols-3',
      'lg:grid-cols-2'
    );
  });
});
