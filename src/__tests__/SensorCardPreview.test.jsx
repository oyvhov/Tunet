import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorCardPreview from '../modals/editCard/SensorCardPreview';
import en from '../i18n/en.json';
import { ToggleRight } from '../icons';

const { previewProps } = vi.hoisted(() => ({ previewProps: vi.fn() }));
vi.mock('../components/cards/SensorCard', () => ({
  default: (props) => {
    previewProps(props);
    return <div data-testid="preview-card">{props.settings.sensorAction?.label}</div>;
  },
}));

const t = (key) => en[key] || key;
const entities = {
  'scene.night': {
    entity_id: 'scene.night',
    state: '2026-09-29T19:00:00Z',
    attributes: { friendly_name: 'Night lights' },
  },
  'input_boolean.guest': {
    entity_id: 'input_boolean.guest',
    state: 'on',
    attributes: { friendly_name: 'Guest mode' },
  },
};

describe('SensorCardPreview', () => {
  it('renders a noninteractive card with the dashboard card styling', () => {
    render(
      <SensorCardPreview
        entityId="scene.night"
        settings={{ sensorAction: { label: 'Start night lights' } }}
        entities={entities}
        name="Night lights"
        iconName={null}
        t={t}
      />
    );
    expect(screen.getByTestId('preview-card')).toHaveTextContent('Start night lights');
    expect(screen.getByTestId('sensor-card-preview')).toHaveAttribute('inert');
    expect(previewProps.mock.lastCall[0]).toMatchObject({
      preview: true,
      editMode: false,
      conn: null,
      entity: entities['scene.night'],
      cardStyle: expect.objectContaining({ borderColor: 'var(--card-border)' }),
    });
  });

  it('uses the same default icon as the dashboard card for the entity domain', () => {
    render(
      <SensorCardPreview
        entityId="input_boolean.guest"
        settings={{}}
        entities={entities}
        iconName={null}
        t={t}
      />
    );
    expect(previewProps.mock.lastCall[0].Icon).toBe(ToggleRight);
  });

  it('previews the selected display entity rather than the card id', () => {
    render(
      <SensorCardPreview
        entityId="entity_card_example"
        settings={{ entityId: 'input_boolean.guest' }}
        entities={entities}
        t={t}
      />
    );
    expect(previewProps.mock.lastCall[0].entity).toBe(entities['input_boolean.guest']);
  });

  it('explains when the selected entity is unavailable and can be collapsed on small screens', () => {
    render(<SensorCardPreview entityId="sensor.gone" settings={{}} entities={entities} t={t} />);
    expect(screen.getByText(en['sensor.custom.missingEntity'])).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: en['sensor.custom.preview'] });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
