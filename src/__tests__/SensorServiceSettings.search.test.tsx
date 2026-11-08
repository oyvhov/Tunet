import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SensorServiceSettings from '../modals/editCard/SensorServiceSettings';
import en from '../i18n/en.json';

const translations: Record<string, string> = en;
const t = (key: string) => translations[key] || key;

const entities = {
  'light.desk': { entity_id: 'light.desk', state: 'on', attributes: { friendly_name: 'Desk' } },
};

const services = {
  light: {
    turn_on: {
      name: 'Turn on',
      target: { entity: { domain: ['light'] } },
      fields: {
        brightness: { name: 'Brightness', selector: { number: { min: 0, max: 255 } } },
      },
    },
  },
  climate: { set_hvac_mode: { name: 'Set mode', target: {} } },
};

const conn = { sendMessagePromise: vi.fn().mockResolvedValue(services) };

function renderSettings(updateAction = vi.fn(), flushRef = { current: null }) {
  render(
    <SensorServiceSettings
      action={{ service: 'light.turn_on', data: {}, targetMode: 'entity', entityId: 'light.desk' }}
      primaryId="light.desk"
      updateAction={updateAction}
      conn={conn}
      connected
      entities={entities}
      t={t}
      flushRef={flushRef}
    />
  );
  return { updateAction, flushRef };
}

describe('SensorServiceSettings', () => {
  it('filters the service list with the search field', async () => {
    renderSettings();
    await screen.findByLabelText('Brightness');
    fireEvent.change(screen.getByLabelText(en['form.search']), { target: { value: 'hvac' } });
    fireEvent.click(screen.getByRole('button', { name: /^Action to run:/ }));
    expect(
      await screen.findByRole('option', { name: 'Set mode (climate.set_hvac_mode)' })
    ).toBeInTheDocument();
    // The chosen service stays listed so the dropdown can still show it.
    expect(screen.getByRole('option', { name: 'Turn on (light.turn_on)' })).toBeInTheDocument();
  });

  it('hides services that do not match', async () => {
    renderSettings();
    await screen.findByLabelText('Brightness');
    fireEvent.change(screen.getByLabelText(en['form.search']), { target: { value: 'turn' } });
    fireEvent.click(screen.getByRole('button', { name: /^Action to run:/ }));
    await screen.findByRole('option', { name: 'Turn on (light.turn_on)' });
    expect(
      screen.queryByRole('option', { name: 'Set mode (climate.set_hvac_mode)' })
    ).not.toBeInTheDocument();
  });

  it('applies an unapplied draft through the flush function', async () => {
    const { updateAction, flushRef } = renderSettings();
    fireEvent.change(await screen.findByLabelText('Brightness'), { target: { value: '100' } });
    let result: unknown;
    act(() => {
      result = (flushRef.current as unknown as () => boolean)();
    });
    expect(result).toBe(true);
    expect(updateAction).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'light.turn_on', data: { brightness: 100 } })
    );
  });

  it('reports an invalid draft instead of dropping it', async () => {
    const { updateAction, flushRef } = renderSettings();
    fireEvent.change(await screen.findByLabelText('Brightness'), { target: { value: '999' } });
    let result: unknown;
    act(() => {
      result = (flushRef.current as unknown as () => boolean)();
    });
    expect(result).toBe(false);
    expect(updateAction).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has nothing to flush without a draft', async () => {
    const { updateAction, flushRef } = renderSettings();
    await screen.findByLabelText('Brightness');
    expect((flushRef.current as unknown as () => boolean)()).toBe(true);
    expect(updateAction).not.toHaveBeenCalled();
  });
});
