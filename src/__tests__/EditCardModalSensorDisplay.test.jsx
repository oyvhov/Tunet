import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditCardModal from '../modals/EditCardModal';
import en from '../i18n/en.json';

vi.mock('../contexts', () => ({
  useConfig: () => ({ unitsMode: 'follow_ha' }),
  useHomeAssistantMeta: () => ({
    connected: false,
    haConfig: { unit_system: { temperature: '°C' } },
  }),
}));
vi.mock('../components/ui/AccessibleModalShell', () => ({
  default: ({ open, children }) => (open ? <div>{children('edit-modal-title')}</div> : null),
}));
vi.mock('../components/cards/SensorCard', () => ({ default: () => <div /> }));
vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const entities = {
  'scene.night': {
    entity_id: 'scene.night',
    state: '2026-09-29T19:00:00Z',
    attributes: { friendly_name: 'Night lights' },
  },
  'sensor.temperature': {
    entity_id: 'sensor.temperature',
    state: '21',
    attributes: { friendly_name: 'Temperature' },
  },
  'climate.room': {
    entity_id: 'climate.room',
    state: 'off',
    attributes: { friendly_name: 'Aircondition', current_temperature: 21 },
  },
  'input_number.target': {
    entity_id: 'input_number.target',
    state: '21',
    attributes: { friendly_name: 'Target' },
  },
};
const props = {
  isOpen: true,
  onClose: vi.fn(),
  t: (key) => en[key] || key,
  entityId: 'entity_card_scene',
  nameFallbackEntityId: 'scene.night',
  entities,
  isEditSensor: true,
  editSettingsKey: 'entity_card_scene',
  customNames: {},
  customIcons: {},
  saveCustomName: vi.fn(),
  saveCustomIcon: vi.fn(),
  saveCardSetting: vi.fn(),
  conn: null,
  pagesConfig: { pages: [] },
  pageSettings: {},
};

describe('EditCardModal sensor display settings', () => {
  it('offers variants for an independent input-number status and custom input-number action', () => {
    const { rerender } = render(
      <EditCardModal
        {...props}
        editSettings={{
          entityId: 'scene.night',
          sensorStatusMode: 'entity',
          sensorStatusEntityId: 'input_number.target',
        }}
      />
    );
    expect(screen.getByRole('button', { name: en['sensor.variantGauge'] })).toBeInTheDocument();
    expect(screen.queryByText(en['form.showGraph'])).not.toBeInTheDocument();
    rerender(
      <EditCardModal
        {...props}
        editSettings={{ entityId: 'input_number.target', sensorAction: { type: 'more-info' } }}
      />
    );
    expect(screen.getByRole('button', { name: en['sensor.variantGauge'] })).toBeInTheDocument();
    rerender(<EditCardModal {...props} editSettings={{ entityId: 'input_number.target' }} />);
    expect(
      screen.queryByRole('button', { name: en['sensor.variantGauge'] })
    ).not.toBeInTheDocument();
  });
  it('offers numeric variants and graph controls when a scene card displays a sensor entity', () => {
    render(
      <EditCardModal
        {...props}
        editSettings={{
          entityId: 'scene.night',
          sensorStatusMode: 'entity',
          sensorStatusEntityId: 'sensor.temperature',
        }}
      />
    );
    expect(screen.getByRole('button', { name: en['sensor.variantGauge'] })).toBeInTheDocument();
    expect(screen.getByText(en['form.showGraph'])).toBeInTheDocument();
  });

  it('offers numeric variants for a numeric attribute while hiding unsupported graph controls', () => {
    render(
      <EditCardModal
        {...props}
        editSettings={{
          entityId: 'scene.night',
          sensorStatusMode: 'attribute',
          sensorStatusEntityId: 'climate.room',
          sensorStatusAttribute: 'current_temperature',
        }}
      />
    );
    expect(screen.getByRole('button', { name: en['sensor.variantGauge'] })).toBeInTheDocument();
    expect(screen.queryByText(en['form.showGraph'])).not.toBeInTheDocument();
  });

  it('hides numeric options when the displayed status is custom text', () => {
    render(
      <EditCardModal
        {...props}
        editSettings={{
          entityId: 'sensor.temperature',
          sensorStatusMode: 'text',
          sensorStatusText: 'Warm',
        }}
      />
    );
    expect(
      screen.queryByRole('button', { name: en['sensor.variantGauge'] })
    ).not.toBeInTheDocument();
  });
});
