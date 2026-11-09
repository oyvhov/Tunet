import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import RoomCard from '../components/cards/RoomCard';
import RoomModal from '../modals/RoomModal';
import type { EntityMap } from '../types/dashboard';

vi.mock('../contexts', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConfig: () => ({ unitsMode: 'metric', language: 'en' }),
  useHomeAssistantMeta: () => ({
    haConfig: { unit_system: { temperature: '°C', length: 'km' } },
  }),
}));

const t = (key: string) => key;

const makeEntities = (spec: Record<string, [string, Record<string, unknown>?]>): EntityMap =>
  Object.fromEntries(
    Object.entries(spec).map(([id, [state, attributes = {}]]) => [
      id,
      { entity_id: id, state, attributes, last_changed: '', last_updated: '' },
    ])
  );

function cardElement(entities: EntityMap, settings: Record<string, unknown>) {
  const props = {
    cardId: 'room',
    settings: { areaId: 'a', areaName: 'A', ...settings },
    entities,
    conn: {},
    callService,
    customNames: {},
    customIcons: {},
    t,
  } as unknown as ComponentProps<typeof RoomCard>;
  return <RoomCard {...props} />;
}

let callService = vi.fn(async () => ({}));

function modalElement(
  entities: EntityMap,
  settings: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) {
  const props = {
    show: true,
    onClose: () => {},
    settings: { areaId: 'a', areaName: 'A', ...settings },
    entities,
    conn: {},
    callService,
    getEntityImageUrl: (url: string) => url,
    t,
    ...extra,
  } as unknown as ComponentProps<typeof RoomModal>;
  return <RoomModal {...props} />;
}

const mainLight = () => screen.getByRole('button', { name: 'room.mainLight' }) as HTMLButtonElement;

describe('room card and popup', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => {
    cleanup();
    callService = vi.fn(async () => ({}));
  });

  it('skips an unavailable light and toggles the first usable one', () => {
    const entities = makeEntities({ 'light.a': ['unavailable'], 'light.b': ['off'] });
    render(cardElement(entities, { entityIds: ['light.a', 'light.b'] }));
    fireEvent.click(mainLight());
    expect(callService).toHaveBeenCalledWith('light', 'turn_on', { entity_id: 'light.b' });
  });

  it('skips a missing light', () => {
    const entities = makeEntities({ 'light.b': ['on'] });
    render(cardElement(entities, { entityIds: ['light.gone', 'light.b'] }));
    fireEvent.click(mainLight());
    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.b' });
  });

  it('disables the main light when no light is usable', () => {
    const entities = makeEntities({ 'light.a': ['unavailable'], 'light.b': ['unknown'] });
    render(cardElement(entities, { entityIds: ['light.a', 'light.b', 'light.gone'] }));
    expect(mainLight().disabled).toBe(true);
  });

  it('stops showing the last temperature when the sensor goes unavailable', () => {
    const settings = { entityIds: [], tempEntityId: 'sensor.temp' };
    const unit = { unit_of_measurement: '°C' };
    const { rerender, container } = render(
      cardElement(makeEntities({ 'sensor.temp': ['21.5', unit] }), settings)
    );
    expect(container).toHaveTextContent('21.5');

    rerender(cardElement(makeEntities({ 'sensor.temp': ['unavailable', unit] }), settings));
    expect(container).not.toHaveTextContent('21.5');
    expect(container).toHaveTextContent('--');
  });

  it('keeps the climate reading when only the sensor is unavailable', () => {
    const entities = makeEntities({
      'sensor.temp': ['unavailable', { unit_of_measurement: '°C' }],
      'climate.a': ['heat', { current_temperature: 19 }],
    });
    const { container } = render(
      cardElement(entities, {
        entityIds: [],
        tempEntityId: 'sensor.temp',
        climateEntityId: 'climate.a',
      })
    );
    expect(container).toHaveTextContent('19');
  });

  it('asks before unlocking from the room popup', () => {
    const entities = makeEntities({ 'lock.door': ['locked'] });
    render(modalElement(entities, { entityIds: ['lock.door'] }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(callService).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm unlock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'unlock', { entity_id: 'lock.door' });
  });

  it('locks from the room popup on a single tap', () => {
    const entities = makeEntities({ 'lock.door': ['unlocked'] });
    render(modalElement(entities, { entityIds: ['lock.door'] }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.door' });
  });

  it('disables the lock row while the lock is unavailable', () => {
    const entities = makeEntities({ 'lock.door': ['unavailable'] });
    render(modalElement(entities, { entityIds: ['lock.door'] }));
    const row = screen.getByRole('button', { name: 'status.unavailable' }) as HTMLButtonElement;
    expect(row.disabled).toBe(true);
  });

  it.each([
    ['locked', 'Unlock'],
    ['unlocked', 'Lock'],
  ])('sends a %s lock that needs a code to the lock popup', (state, label) => {
    const onOpenLock = vi.fn();
    const entities = makeEntities({ 'lock.door': [state, { code_format: '^\\d{4}$' }] });
    render(modalElement(entities, { entityIds: ['lock.door'] }, { onOpenLock }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(onOpenLock).toHaveBeenCalledWith('lock.door');
    expect(callService).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Confirm unlock' })).toBeNull();
  });

  it('keeps the in-place flow when code_format is none', () => {
    const onOpenLock = vi.fn();
    const entities = makeEntities({ 'lock.door': ['unlocked', { code_format: 'none' }] });
    render(modalElement(entities, { entityIds: ['lock.door'] }, { onOpenLock }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    expect(onOpenLock).not.toHaveBeenCalled();
    expect(callService).toHaveBeenCalledWith('lock', 'lock', { entity_id: 'lock.door' });
  });

  it.each(['unavailable', 'unknown'])('disables the row of a light that is %s', (state) => {
    const entities = makeEntities({ 'light.a': [state, { friendly_name: 'Lampe' }] });
    render(modalElement(entities, { entityIds: ['light.a'] }));
    const toggle = screen.getByRole('switch', { name: 'Lampe' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    expect((screen.getAllByRole('slider')[0] as HTMLInputElement).disabled).toBe(true);
  });

  it('keeps the row of an available light usable', () => {
    const entities = makeEntities({ 'light.a': ['off', { friendly_name: 'Lampe' }] });
    render(modalElement(entities, { entityIds: ['light.a'] }));
    const toggle = screen.getByRole('switch', { name: 'Lampe' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);
    expect((screen.getAllByRole('slider')[0] as HTMLInputElement).disabled).toBe(false);
  });

  it('gives the light switch a 44 px hit area', () => {
    const entities = makeEntities({ 'light.a': ['on', { friendly_name: 'Lampe' }] });
    render(modalElement(entities, { entityIds: ['light.a'] }));
    const toggle = screen.getByRole('switch', { name: 'Lampe' });
    expect(toggle.className).toMatch(/\bh-11\b/);
    expect(toggle.className).toMatch(/\bw-11\b/);
  });
});
