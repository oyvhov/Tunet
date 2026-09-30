import React, { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../components', () => ({
  ModalSuspense: ({ children }) => <Suspense fallback={null}>{children}</Suspense>,
}));
vi.mock('../services', () => ({ prepareNordpoolData: vi.fn() }));
vi.mock('../modals/SensorModal', () => ({
  default: ({ entityId, entity, customName, onClose }) => (
    <div>
      <h2>{customName || entity.attributes.friendly_name}</h2>
      <span>{entityId}</span>
      <span>{entity.state}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import { ModalEntitySlice } from '../rendering/modalSlices/ModalEntitySlice';

function makeProps(showSensorInfoModal) {
  return {
    core: {
      entities: {
        'sensor.temperature': {
          entity_id: 'sensor.temperature',
          state: '21',
          attributes: { friendly_name: 'Temperature' },
        },
      },
      conn: null,
      activeUrl: '',
      authRef: null,
      config: { authMethod: 'token', token: '' },
      t: (key) => key,
    },
    modals: { showSensorInfoModal, setShowSensorInfoModal: vi.fn() },
    cardConfig: {
      cardSettings: {},
      getCardSettingsKey: (id) => id,
      customIcons: {},
      customNames: { entity_card_1: 'Living room', 'sensor.temperature': 'Legacy name' },
    },
    entityHelpers: {},
  };
}

describe('sensor card detail modal identity', () => {
  it('passes the actual entity and instance custom name to the detail modal', async () => {
    const props = makeProps({ entityId: 'sensor.temperature', cardId: 'entity_card_1' });
    render(<ModalEntitySlice {...props} />);
    expect(await screen.findByRole('heading', { name: 'Living room' })).toBeInTheDocument();
    expect(screen.getByText('sensor.temperature')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.modals.setShowSensorInfoModal).toHaveBeenCalledWith(null);
  });

  it('keeps legacy string targets and custom entity names working', async () => {
    render(<ModalEntitySlice {...makeProps('sensor.temperature')} />);
    expect(await screen.findByRole('heading', { name: 'Legacy name' })).toBeInTheDocument();
    expect(screen.getByText('sensor.temperature')).toBeInTheDocument();
  });
});
