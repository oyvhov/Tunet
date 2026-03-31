const hasText = (value) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().length > 0
    : false;

const getPreferredDeviceName = (device) => device?.name_by_user || device?.name || null;

export const buildRegistryLookupMap = (entries, key) => {
  const map = new Map();
  if (!Array.isArray(entries) || !key) return map;

  entries.forEach((entry) => {
    const value = entry?.[key];
    if (hasText(value)) {
      map.set(String(value), entry);
    }
  });

  return map;
};

export const enrichEntitiesWithRegistryMetadata = (
  entities,
  entityRegistryById = new Map(),
  deviceRegistryById = new Map()
) => {
  if (!entities || typeof entities !== 'object') return {};

  let changed = false;
  const nextEntities = {};

  Object.entries(entities).forEach(([entityId, entity]) => {
    if (!entity || typeof entity !== 'object') {
      nextEntities[entityId] = entity;
      return;
    }

    const attributes = entity.attributes || {};
    const entityRegistryEntry = entityRegistryById.get(entityId);
    const deviceRegistryEntry = entityRegistryEntry?.device_id
      ? deviceRegistryById.get(entityRegistryEntry.device_id)
      : null;

    const metadata = {};
    const assignIfMissing = (key, value) => {
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

    if (Object.keys(metadata).length === 0) {
      nextEntities[entityId] = entity;
      return;
    }

    changed = true;
    nextEntities[entityId] = {
      ...entity,
      attributes: {
        ...attributes,
        ...metadata,
      },
    };
  });

  return changed ? nextEntities : entities;
};