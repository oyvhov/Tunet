import type { Connection } from 'home-assistant-js-websocket';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callService, getForecast, getHistory, getTodoItems } from '../services/haClient';

const ENTITY = 'sensor.temp';
const WEATHER = 'weather.home';
const TODO = 'todo.shopping';

type Reply = unknown | ((message: Record<string, unknown>) => unknown);

const connection = (reply: Reply) => {
  const sendMessagePromise = vi.fn(async (message: Record<string, unknown>) =>
    typeof reply === 'function' ? reply(message) : reply
  );
  return { conn: { sendMessagePromise } as unknown as Connection, sendMessagePromise };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getHistory', () => {
  const range = {
    start: new Date('2026-01-01T00:00:00Z'),
    end: new Date('2026-01-02T00:00:00Z'),
    entityId: ENTITY,
  };
  const rows = [{ s: '20', lu: 1 }];

  it('sends the entity and the time range', async () => {
    const { conn, sendMessagePromise } = connection({ [ENTITY]: rows });

    await getHistory(conn, range);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'history/history_during_period',
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-02T00:00:00.000Z',
      entity_ids: [ENTITY],
      minimal_response: false,
      no_attributes: true,
    });
  });

  it.each([
    ['keyed by entity id', { [ENTITY]: rows }],
    ['an array of arrays', [rows]],
    ['a flat array', rows],
    ['wrapped in result', { result: [rows] }],
    ['wrapped in response', { response: rows }],
    ['wrapped in data', { data: [rows] }],
    ['wrapped in history', { history: rows }],
  ])('reads a response %s', async (_shape, reply) => {
    const { conn } = connection(reply);

    await expect(getHistory(conn, range)).resolves.toEqual(rows);
  });

  it.each([
    ['null', null],
    ['an empty object', {}],
    ['an empty array', []],
    ['another entity only', { 'sensor.other': rows }],
    ['a non-array entity value', { [ENTITY]: 'nope' }],
  ])('returns nothing for %s', async (_shape, reply) => {
    const { conn } = connection(reply);

    await expect(getHistory(conn, range)).resolves.toEqual([]);
  });

  it.each([null, undefined, {}])('rejects a %j connection', async (conn) => {
    await expect(getHistory(conn as Connection | null, range)).rejects.toThrow(
      'Invalid or disconnected HA connection'
    );
  });
});

describe('getForecast', () => {
  const forecast = [{ datetime: '2026-01-01T00:00:00Z', temperature: 3 }];
  const inner = { forecast };

  it('asks for the requested forecast with a returned response', async () => {
    const { conn, sendMessagePromise } = connection({ [WEATHER]: inner });

    await getForecast(conn, { entityId: WEATHER, type: 'daily' });

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      target: { entity_id: WEATHER },
      service_data: { type: 'daily' },
      return_response: true,
    });
  });

  it('defaults to hourly', async () => {
    const { conn, sendMessagePromise } = connection({});

    await getForecast(conn, { entityId: WEATHER });

    expect(sendMessagePromise.mock.calls[0][0].service_data).toEqual({ type: 'hourly' });
  });

  it.each([
    ['service_response.weather', { service_response: { weather: { [WEATHER]: inner } } }],
    ['service_response', { service_response: { [WEATHER]: inner } }],
    ['response.weather', { response: { weather: { [WEATHER]: inner } } }],
    ['response', { response: { [WEATHER]: inner } }],
    ['result.weather', { result: { weather: { [WEATHER]: inner } } }],
    ['result', { result: { [WEATHER]: inner } }],
    ['weather', { weather: { [WEATHER]: inner } }],
    ['the entity id', { [WEATHER]: inner }],
    ['the top level', inner],
  ])('finds the forecast under %s', async (_where, reply) => {
    const { conn } = connection(reply);

    await expect(getForecast(conn, { entityId: WEATHER })).resolves.toEqual(forecast);
  });

  it('prefers the outermost service_response candidate', async () => {
    const { conn } = connection({
      service_response: { weather: { [WEATHER]: inner } },
      [WEATHER]: { forecast: [{ temperature: -99 }] },
    });

    await expect(getForecast(conn, { entityId: WEATHER })).resolves.toEqual(forecast);
  });

  it('skips a candidate whose forecast is not a list', async () => {
    const { conn } = connection({
      service_response: { [WEATHER]: { forecast: 'n/a' } },
      response: { [WEATHER]: inner },
    });

    await expect(getForecast(conn, { entityId: WEATHER })).resolves.toEqual(forecast);
  });

  it.each([
    ['null', null],
    ['an empty object', {}],
    ['another entity', { service_response: { 'weather.other': inner } }],
  ])('returns nothing for %s', async (_shape, reply) => {
    const { conn } = connection(reply);

    await expect(getForecast(conn, { entityId: WEATHER })).resolves.toEqual([]);
  });

  it('rejects without a connection', async () => {
    await expect(getForecast(null, { entityId: WEATHER })).rejects.toThrow(
      'Invalid or disconnected HA connection'
    );
  });
});

describe('getTodoItems', () => {
  const items = [{ uid: '1', summary: 'Milk', status: 'needs_action' }];

  it('uses todo/item/list when it answers', async () => {
    const { conn, sendMessagePromise } = connection({ items });

    await expect(getTodoItems(conn, TODO)).resolves.toEqual(items);
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: 'todo/item/list', entity_id: TODO });
  });

  it('returns an empty list from todo/item/list without falling back', async () => {
    const { conn, sendMessagePromise } = connection({ items: [] });

    await expect(getTodoItems(conn, TODO)).resolves.toEqual([]);
    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  const fallingBackWith = (serviceReply: unknown) =>
    connection((message) => {
      if (message.type === 'todo/item/list') throw new Error('unknown_command');
      return serviceReply;
    });

  it('falls back to todo.get_items with both statuses when the command fails', async () => {
    const { conn, sendMessagePromise } = fallingBackWith({ service_response: { items } });

    await expect(getTodoItems(conn, TODO)).resolves.toEqual(items);
    expect(sendMessagePromise).toHaveBeenLastCalledWith({
      type: 'call_service',
      domain: 'todo',
      service: 'get_items',
      target: { entity_id: TODO },
      service_data: { status: ['needs_action', 'completed'] },
      return_response: true,
    });
  });

  it('falls back when the command answers without items', async () => {
    const { conn } = connection((message: Record<string, unknown>) =>
      message.type === 'todo/item/list' ? {} : { response: { [TODO]: { items } } }
    );

    await expect(getTodoItems(conn, TODO)).resolves.toEqual(items);
  });

  it.each([
    ['service_response.items', { service_response: { items } }],
    ['service_response by entity', { service_response: { [TODO]: { items } } }],
    ['response.items', { response: { items } }],
    ['response by entity', { response: { [TODO]: { items } } }],
    ['result.items', { result: { items } }],
    ['result by entity', { result: { [TODO]: { items } } }],
    ['top-level items', { items }],
    ['top-level by entity', { [TODO]: { items } }],
    ['nested response by entity', { context: {}, response: { [TODO]: { items } } }],
    ['another first-level key', { response: { 'todo.renamed': { items } } }],
  ])('reads the fallback response from %s', async (_where, reply) => {
    const { conn } = fallingBackWith(reply);

    await expect(getTodoItems(conn, TODO)).resolves.toEqual(items);
  });

  it('reports an empty list found in a later wrapper as empty', async () => {
    const { conn } = fallingBackWith({ response: { [TODO]: { items: [] } } });

    await expect(getTodoItems(conn, TODO)).resolves.toEqual([]);
  });

  it.each([
    ['null', null],
    ['an empty object', {}],
    ['an unrelated reply', { context: { id: 'x' } }],
  ])('returns nothing for %s', async (_shape, reply) => {
    const { conn } = fallingBackWith(reply);

    await expect(getTodoItems(conn, TODO)).resolves.toEqual([]);
  });

  it('surfaces a failure of the fallback call', async () => {
    const { conn } = connection(() => {
      throw new Error('offline');
    });

    await expect(getTodoItems(conn, TODO)).rejects.toThrow('offline');
  });

  it('rejects without a connection', async () => {
    await expect(getTodoItems(null, TODO)).rejects.toThrow('Invalid or disconnected HA connection');
  });
});

describe('callService', () => {
  it('moves an explicit target out of service_data', async () => {
    const { conn, sendMessagePromise } = connection({});

    await callService(conn, 'light', 'turn_on', {
      target: { area_id: 'kitchen' },
      brightness: 100,
    });

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      target: { area_id: 'kitchen' },
      service_data: { brightness: 100 },
    });
  });

  it('splits clean_area entity_id into the target', async () => {
    const { conn, sendMessagePromise } = connection({});

    await callService(conn, 'vacuum', 'clean_area', {
      entity_id: 'vacuum.robot',
      area_ids: ['kitchen'],
    });

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'vacuum',
      service: 'clean_area',
      target: { entity_id: 'vacuum.robot' },
      service_data: { area_ids: ['kitchen'] },
    });
  });

  it('keeps clean_area entity_id in the data when an explicit target is given', async () => {
    const { conn, sendMessagePromise } = connection({});
    const target = { device_id: 'abc' };

    await callService(conn, 'vacuum', 'clean_area', { target, entity_id: 'vacuum.robot' });

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ target, service_data: { entity_id: 'vacuum.robot' } })
    );
  });

  it('leaves entity_id in service_data for other services', async () => {
    const { conn, sendMessagePromise } = connection({});
    const data = { entity_id: 'light.desk', brightness: 10 };

    await callService(conn, 'light', 'turn_on', data);

    const message = sendMessagePromise.mock.calls[0][0];
    expect(message).not.toHaveProperty('target');
    expect(message.service_data).toEqual(data);
  });

  it('sends a call without data', async () => {
    const { conn, sendMessagePromise } = connection({});

    await callService(conn, 'homeassistant', 'restart');

    const message = sendMessagePromise.mock.calls[0][0];
    expect(message).not.toHaveProperty('target');
    expect(message.service_data).toBeUndefined();
  });

  it('rejects without a connection instead of throwing', async () => {
    await expect(callService(null, 'light', 'turn_on')).rejects.toThrow(
      'Invalid or disconnected HA connection'
    );
  });

  it('logs and rethrows a failed call', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('service_not_found');
    const { conn } = connection(() => {
      throw failure;
    });

    await expect(callService(conn, 'light', 'turn_on', {})).rejects.toBe(failure);
    expect(consoleError).toHaveBeenCalledWith('Service call failed (light.turn_on):', failure);
  });
});
