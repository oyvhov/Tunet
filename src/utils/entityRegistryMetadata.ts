type RegistryEntry = Record<string, unknown>;

export type EntityRegistryEntry = {
  device_id?: string | null;
  platform?: unknown;
  area_id?: unknown;
};

export type DeviceRegistryEntry = {
  name?: unknown;
  name_by_user?: unknown;
  manufacturer?: unknown;
  model?: unknown;
  area_id?: unknown;
};

type EntityLike = { attributes?: Record<string, unknown> | null };

type RegistryMetadata = Record<string, unknown>;

const hasText = (value: unknown): boolean =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim().length > 0 : false;

const getPreferredDeviceName = (device: DeviceRegistryEntry | null | undefined) =>
  device?.name_by_user || device?.name || null;

const enrichedEntityCache = new WeakMap<
  object,
  { metadata: RegistryMetadata; result: Record<string, unknown> }
>();

export const buildRegistryLookupMap = <T extends RegistryEntry>(
  entries: readonly T[] | null | undefined,
  key: string
): Map<string, T> => {
  const map = new Map<string, T>();
  if (!Array.isArray(entries) || !key) return map;

  entries.forEach((entry) => {
    const value = entry?.[key];
    if (hasText(value)) {
      map.set(String(value), entry);
    }
  });

  return map;
};

export const enrichEntitiesWithRegistryMetadata = <E extends Record<string, unknown>>(
  entities: E | null | undefined,
  entityRegistryById: Map<string, EntityRegistryEntry> = new Map(),
  deviceRegistryById: Map<string, DeviceRegistryEntry> = new Map()
): E | Record<string, never> => {
  if (!entities || typeof entities !== 'object') return {};

  let changed = false;
  const nextEntities: Record<string, unknown> = {};

  Object.entries(entities).forEach(([entityId, entity]) => {
    if (!entity || typeof entity !== 'object') {
      nextEntities[entityId] = entity;
      return;
    }

    const attributes = (entity as EntityLike).attributes || {};
    const entityRegistryEntry = entityRegistryById.get(entityId);
    const deviceRegistryEntry = entityRegistryEntry?.device_id
      ? deviceRegistryById.get(entityRegistryEntry.device_id)
      : null;

    const metadata: RegistryMetadata = {};
    const assignIfMissing = (key: string, value: unknown) => {
      if (!hasText(value)) return;
      if (hasText(attributes[key])) return;
      metadata[key] = value;
    };

    assignIfMissing('platform', entityRegistryEntry?.platform);
    assignIfMissing('integration', entityRegistryEntry?.platform);
    assignIfMissing('manufacturer', deviceRegistryEntry?.manufacturer);
    assignIfMissing('device_manufacturer', deviceRegistryEntry?.manufacturer);
    assignIfMissing('model', deviceRegistryEntry?.model);
    assignIfMissing('device_model', deviceRegistryEntry?.model);
    assignIfMissing('device_name', getPreferredDeviceName(deviceRegistryEntry));
    assignIfMissing('area_id', entityRegistryEntry?.area_id || deviceRegistryEntry?.area_id);

    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length === 0) {
      nextEntities[entityId] = entity;
      return;
    }

    changed = true;
    const cached = enrichedEntityCache.get(entity);
    if (
      cached &&
      metadataKeys.length === Object.keys(cached.metadata).length &&
      metadataKeys.every((key) => cached.metadata[key] === metadata[key])
    ) {
      nextEntities[entityId] = cached.result;
      return;
    }

    const result = {
      ...entity,
      attributes: {
        ...attributes,
        ...metadata,
      },
    };
    enrichedEntityCache.set(entity, { metadata, result });
    nextEntities[entityId] = result;
  });

  return changed ? (nextEntities as E) : entities;
};
