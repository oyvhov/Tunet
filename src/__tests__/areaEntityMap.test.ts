import { describe, expect, it, vi } from 'vitest';
import { getAreaEntityMap } from '../services/haClient';
import type { HaConnection } from '../services/haClient';

const connWith = (entities: unknown[], devices: unknown[]) => {
  const sendMessagePromise = vi.fn(async ({ type }: { type: string }) =>
    type === 'config/entity_registry/list' ? entities : devices
  );
  return { conn: { sendMessagePromise } as unknown as HaConnection, sendMessagePromise };
};

describe('getAreaEntityMap', () => {
  it('groups entities by their own area or their device area from one fetch of each registry', async () => {
    const { conn, sendMessagePromise } = connWith(
      [
        { entity_id: 'light.direct', area_id: 'kitchen' },
        { entity_id: 'light.on_device', device_id: 'd1' },
        { entity_id: 'light.moved', device_id: 'd1', area_id: 'hall' },
        { entity_id: 'light.nowhere' },
      ],
      [{ id: 'd1', area_id: 'kitchen' }]
    );

    await expect(getAreaEntityMap(conn)).resolves.toEqual({
      kitchen: ['light.direct', 'light.on_device'],
      hall: ['light.moved'],
    });
    expect(sendMessagePromise).toHaveBeenCalledTimes(2);
  });

  it('leaves out diagnostic, config, hidden and disabled entities', async () => {
    const { conn } = connWith(
      [
        { entity_id: 'light.keep', area_id: 'kitchen', entity_category: null },
        { entity_id: 'sensor.signal', area_id: 'kitchen', entity_category: 'diagnostic' },
        { entity_id: 'switch.led', area_id: 'kitchen', entity_category: 'config' },
        { entity_id: 'light.hidden', area_id: 'kitchen', hidden_by: 'user' },
        { entity_id: 'light.disabled', area_id: 'kitchen', disabled_by: 'user' },
      ],
      []
    );

    await expect(getAreaEntityMap(conn)).resolves.toEqual({ kitchen: ['light.keep'] });
  });
});
