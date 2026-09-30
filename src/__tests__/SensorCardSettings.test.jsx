import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorCardSettings from '../modals/SensorCardSettings';
import en from '../i18n/en.json';

vi.mock('../components/ui/IconPicker', () => ({ default: () => <div /> }));

const t = (key) => en[key] || key;
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
    attributes: { friendly_name: 'Aircondition' },
  },
  'input_number.target': {
    entity_id: 'input_number.target',
    state: '18',
    attributes: { friendly_name: 'Target' },
  },
};

function Editor({ initialSettings = {}, onSave, conn = null, connected = true }) {
  const [settings, setSettings] = useState(initialSettings);
  return (
    <SensorCardSettings
      entityId="scene.night"
      settingsKey="entity_card_example"
      settings={settings}
      entities={entities}
      conn={conn}
      connected={connected}
      saveCardSetting={(id, key, value) => {
        onSave?.(id, key, value);
        setSettings((previous) => ({ ...previous, [key]: value }));
      }}
      name="Night lights"
      iconName={null}
      onNameChange={vi.fn()}
      onIconChange={vi.fn()}
      numericEntityOptions={['sensor.temperature', 'input_number.target']}
      t={t}
    />
  );
}

describe('SensorCardSettings', () => {
  it('offers a reset only for customized sections and clears only the action section', () => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{ sensorStatusMode: 'text', sensorStatusText: 'Ready' }}
        onSave={save}
      />
    );
    const actionSection = screen.getByRole('heading', { name: 'Action' }).closest('section');
    expect(
      within(actionSection).queryByRole('button', { name: 'Use defaults' })
    ).not.toBeInTheDocument();
    const statusSection = screen.getByRole('heading', { name: 'Status' }).closest('section');
    expect(within(statusSection).getByRole('button', { name: 'Use defaults' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Button text'), {
      target: { value: 'Turn on night lights' },
    });
    fireEvent.click(within(actionSection).getByRole('button', { name: 'Use defaults' }));
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorAction', null);
    expect(save).not.toHaveBeenCalledWith('entity_card_example', 'sensorStatusText', null);
    expect(screen.getByLabelText('Custom status text')).toHaveValue('Ready');
  });

  it('restores status visibility when switching a legacy hidden status to custom text', () => {
    const save = vi.fn();
    render(<Editor initialSettings={{ showStatus: false }} onSave={save} />);
    expect(screen.getByRole('button', { name: 'Hidden' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Custom text' }));
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorStatusMode', 'text');
    expect(save).toHaveBeenCalledWith('entity_card_example', 'showStatus', true);
    fireEvent.change(screen.getByLabelText('Custom status text'), {
      target: { value: 'Ready for bedtime' },
    });
    expect(save).toHaveBeenCalledWith(
      'entity_card_example',
      'sensorStatusText',
      'Ready for bedtime'
    );
  });

  it('lets a sensor display one entity and control an aircondition target', () => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{
          entityId: 'sensor.temperature',
          sensorAction: { type: 'toggle', entityId: 'climate.room' },
        }}
        onSave={save}
      />
    );
    expect(screen.getByRole('button', { name: 'Aircondition' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Button' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Icon' }));
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorAction', {
      type: 'toggle',
      entityId: 'climate.room',
      trigger: 'icon',
    });
  });

  it('uses automatic button text when the override is emptied', () => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{ sensorAction: { type: 'scene', label: 'Bedtime' } }}
        onSave={save}
      />
    );
    fireEvent.change(screen.getByLabelText('Button text'), { target: { value: '' } });
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorAction', {
      type: 'scene',
      label: null,
    });
  });

  it('loads service metadata only with a connected Home Assistant session', () => {
    const conn = { sendMessagePromise: vi.fn() };
    render(
      <Editor
        initialSettings={{ sensorAction: { type: 'service' } }}
        conn={conn}
        connected={false}
      />
    );
    expect(conn.sendMessagePromise).not.toHaveBeenCalled();
    expect(screen.getByText('Connect to Home Assistant to choose an action.')).toBeInTheDocument();
  });

  it('stages a service and refuses missing required fields or malformed JSON', async () => {
    const save = vi.fn();
    const conn = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        climate: {
          set_hvac_mode: {
            name: 'Set mode',
            target: { entity: { domain: 'climate' } },
            fields: {
              hvac_mode: {
                name: 'Mode',
                required: true,
                selector: { select: { options: ['cool', 'heat'] } },
              },
            },
          },
        },
      }),
    };
    render(
      <Editor
        initialSettings={{ sensorAction: { type: 'service', entityId: 'climate.room' } }}
        onSave={save}
        conn={conn}
      />
    );
    await waitFor(() =>
      expect(conn.sendMessagePromise).toHaveBeenCalledWith({ type: 'get_services' })
    );
    fireEvent.click(screen.getByRole('button', { name: /^Action to run:/ }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'Set mode (climate.set_hvac_mode)' })
    );
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Fill in Mode before saving.');
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Mode *'), { target: { value: 'cool' } });
    fireEvent.click(screen.getByText('Advanced parameters (JSON)'));
    fireEvent.change(screen.getByLabelText('Additional parameters'), {
      target: { value: '{bad json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter valid JSON');
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Additional parameters'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorAction', {
      type: 'service',
      entityId: 'climate.room',
      service: 'climate.set_hvac_mode',
      data: { hvac_mode: 'cool' },
      targetMode: 'entity',
    });
  });

  it('automatically saves services without a declared target without an entity', async () => {
    const save = vi.fn();
    const conn = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        rest_command: {
          aircon_boost: { name: 'Boost aircon', fields: { duration: { name: 'Duration' } } },
        },
      }),
    };
    render(
      <Editor initialSettings={{ sensorAction: { type: 'service' } }} conn={conn} onSave={save} />
    );
    await waitFor(() => expect(conn.sendMessagePromise).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /^Action to run:/ }));
    fireEvent.click(
      await screen.findByRole('option', { name: 'Boost aircon (rest_command.aircon_boost)' })
    );
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: 'ten minutes' } });
    expect(screen.queryByText('Action target')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));
    expect(save).toHaveBeenCalledWith('entity_card_example', 'sensorAction', {
      type: 'service',
      service: 'rest_command.aircon_boost',
      data: { duration: 'ten minutes' },
      targetMode: 'none',
      entityId: null,
    });
  });

  it('filters response-only services and limits targets by native service domain metadata', async () => {
    const conn = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        climate: { turn_on: { name: 'Climate on', target: {} } },
        weather: {
          get_forecasts: { name: 'Forecast', target: {}, response: { optional: false } },
        },
      }),
    };
    render(<Editor initialSettings={{ sensorAction: { type: 'service' } }} conn={conn} />);
    fireEvent.click(screen.getByRole('button', { name: /^Action to run:/ }));
    const climateOption = await screen.findByRole('option', {
      name: 'Climate on (climate.turn_on)',
    });
    expect(screen.queryByRole('option', { name: /Forecast/ })).not.toBeInTheDocument();
    fireEvent.click(climateOption);
    const targetPicker = screen.getByText('Action target').parentElement;
    fireEvent.click(within(targetPicker).getByRole('button', { name: 'Not selected' }));
    expect(within(targetPicker).getByRole('button', { name: /Aircondition/ })).toBeInTheDocument();
    expect(
      within(targetPicker).queryByRole('button', { name: /Night lights/ })
    ).not.toBeInTheDocument();
  });

  it('refuses null required fields supplied through advanced JSON', async () => {
    const save = vi.fn();
    const conn = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        notify: {
          message: {
            name: 'Send notification',
            fields: { message: { name: 'Message', required: true } },
          },
        },
      }),
    };
    render(
      <Editor
        initialSettings={{ sensorAction: { type: 'service', service: 'notify.message' } }}
        conn={conn}
        onSave={save}
      />
    );
    await screen.findByLabelText('Message *');
    fireEvent.change(screen.getByLabelText('Message *'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByText('Advanced parameters (JSON)'));
    fireEvent.change(screen.getByLabelText('Additional parameters'), {
      target: { value: '{"message":null}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply parameters' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Fill in Message before saving.');
    expect(save).not.toHaveBeenCalled();
  });
  it('shows only the action choice for an entity that has no action of its own', () => {
    render(<Editor initialSettings={{ entityId: 'sensor.temperature' }} />);
    expect(screen.getByText('Automatic: Open details')).toBeInTheDocument();
    expect(screen.queryByLabelText('Button text')).not.toBeInTheDocument();
    expect(screen.queryByText('Action target')).not.toBeInTheDocument();
    expect(screen.queryByText('Activate using')).not.toBeInTheDocument();
  });

  it('asks for a target instead of pretending the displayed sensor can be toggled', () => {
    const save = vi.fn();
    render(<Editor initialSettings={{ entityId: 'sensor.temperature' }} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /^Action type:/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Toggle on/off' }));
    const target = screen.getByText('Action target').parentElement;
    expect(within(target).getByRole('button', { name: 'Not selected' })).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /Temperature/ })).not.toBeInTheDocument();
    fireEvent.click(within(target).getByRole('button', { name: 'Not selected' }));
    expect(within(target).getByRole('button', { name: /Aircondition/ })).toBeInTheDocument();
  });

  it('keeps the target hidden while the entity uses its own automatic action', () => {
    render(<Editor />);
    expect(screen.queryByText('Action target')).not.toBeInTheDocument();
    expect(screen.getByText('Activate using')).toBeInTheDocument();
  });

  it('describes what the automatic action resolves to', () => {
    render(<Editor />);
    expect(screen.getByText('Automatic: Activate scene')).toBeInTheDocument();
  });

  it('keeps a still valid action target when the action type changes', () => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{
          entityId: 'sensor.temperature',
          sensorAction: { type: 'turn_on', entityId: 'climate.room' },
        }}
        onSave={save}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Action type:/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Toggle on/off' }));
    expect(save).toHaveBeenLastCalledWith('entity_card_example', 'sensorAction', {
      type: 'toggle',
      entityId: 'climate.room',
      service: null,
      data: {},
      targetMode: 'entity',
    });
    fireEvent.click(screen.getByRole('button', { name: /^Action type:/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Activate scene' }));
    expect(save).toHaveBeenLastCalledWith(
      'entity_card_example',
      'sensorAction',
      expect.objectContaining({ type: 'scene', entityId: null })
    );
  });

  it('uses switches for what the card shows', () => {
    const save = vi.fn();
    render(<Editor onSave={save} />);
    const showName = screen.getByRole('switch', { name: 'Show name' });
    expect(showName).toBeChecked();
    fireEvent.click(showName);
    expect(save).toHaveBeenCalledWith('entity_card_example', 'showName', false);
    expect(screen.queryByRole('switch', { name: /controls/i })).not.toBeInTheDocument();
  });

  it('offers card styles only for numeric values and hides the graph switch for other styles', () => {
    const { rerender } = render(<Editor initialSettings={{ entityId: 'scene.night' }} />);
    expect(screen.queryByRole('button', { name: 'Gauge' })).not.toBeInTheDocument();
    rerender(<Editor key="numeric" initialSettings={{ entityId: 'sensor.temperature' }} />);
    expect(screen.getByRole('switch', { name: /^Graph/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Gauge' }));
    expect(screen.queryByRole('switch', { name: /^Graph/ })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Min' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Color thresholds' })).toBeChecked();
  });
  it('does not offer a layout choice because the card size is set on the card itself', () => {
    render(<Editor initialSettings={{ entityId: 'sensor.temperature' }} />);
    expect(screen.queryByText(/layout/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /compact row|action tile/i })
    ).not.toBeInTheDocument();
  });

  it('only shows the Appearance section when the card has numeric styling to offer', () => {
    const { rerender } = render(<Editor initialSettings={{ entityId: 'scene.night' }} />);
    expect(screen.queryByRole('heading', { name: 'Appearance' })).not.toBeInTheDocument();
    rerender(<Editor key="numeric" initialSettings={{ entityId: 'sensor.temperature' }} />);
    expect(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
  });
  it('offers name and icon but no separate subtitle', () => {
    render(<Editor />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByLabelText(/subtitle/i)).not.toBeInTheDocument();
  });
  it('always lets the text be set and names the field after where it shows', () => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{ sensorAction: { type: 'toggle', entityId: 'climate.room' } }}
        onSave={save}
      />
    );
    expect(screen.getByLabelText('Button text')).toHaveAttribute('placeholder', 'Automatic');
    fireEvent.click(screen.getByRole('button', { name: 'Icon' }));
    expect(screen.queryByLabelText('Button text')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Text on card'), { target: { value: 'Cooling' } });
    expect(save).toHaveBeenLastCalledWith('entity_card_example', 'sensorAction', {
      type: 'toggle',
      entityId: 'climate.room',
      trigger: 'icon',
      label: 'Cooling',
    });
    expect(screen.getByText(en['sensor.custom.triggerHint.icon'])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Whole card' }));
    expect(screen.getByLabelText('Text on card')).toHaveValue('Cooling');
    expect(screen.getByText(en['sensor.custom.triggerHint.card'])).toBeInTheDocument();
  });

  it('has no hidden extra options for state texts, action icon or controls', () => {
    render(
      <Editor initialSettings={{ sensorAction: { type: 'toggle', entityId: 'climate.room' } }} />
    );
    expect(screen.queryByText('More options')).not.toBeInTheDocument();
    expect(screen.queryByText('Action icon')).not.toBeInTheDocument();
    expect(screen.queryByText(/when on/i)).not.toBeInTheDocument();
  });

  it.each([
    ['button', 'Button text'],
    ['icon', 'Text on card'],
    ['card', 'Text on card'],
  ])('replaces legacy state labels when editing %s action text', (trigger, fieldLabel) => {
    const save = vi.fn();
    render(
      <Editor
        initialSettings={{
          sensorAction: {
            type: 'toggle',
            entityId: 'climate.room',
            trigger,
            label: 'Old text',
            labelOn: 'Stop cooling',
            labelOff: 'Start cooling',
            icon: 'Snowflake',
          },
        }}
        onSave={save}
      />
    );
    fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: 'Toggle cooling' } });
    expect(save).toHaveBeenLastCalledWith('entity_card_example', 'sensorAction', {
      type: 'toggle',
      entityId: 'climate.room',
      trigger,
      label: 'Toggle cooling',
      icon: 'Snowflake',
    });
    fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: '' } });
    expect(save).toHaveBeenLastCalledWith('entity_card_example', 'sensorAction', {
      type: 'toggle',
      entityId: 'climate.room',
      trigger,
      label: null,
      icon: 'Snowflake',
    });
  });
});
