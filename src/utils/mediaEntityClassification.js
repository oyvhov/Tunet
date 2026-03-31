const toLowerText = (value) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).toLowerCase() : '';

const valueContains = (value, needle) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).toLowerCase().includes(needle);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueContains(item, needle));
  }
  return false;
};

const attributesContain = (attributes, keys, needle) =>
  keys.some((key) => valueContains(attributes?.[key], needle));

const hasAttributePrefix = (attributes, prefix) =>
  Object.keys(attributes || {}).some((key) => key.toLowerCase().startsWith(prefix));

const SONOS_SIGNAL_FIELDS = [
  'manufacturer',
  'platform',
  'integration',
  'attribution',
  'app_name',
  'media_content_id',
  'model',
  'model_name',
  'device_manufacturer',
  'device_model',
];

const MUSIC_ASSISTANT_SIGNAL_FIELDS = [
  'platform',
  'integration',
  'attribution',
  'app_name',
  'media_content_id',
  'model',
  'model_name',
  'device_manufacturer',
  'device_model',
];

export function isMusicAssistantMediaEntity(entity) {
  if (!entity) return false;
  const attributes = entity.attributes || {};

  if (attributes.mass_player_type) return true;
  if (hasAttributePrefix(attributes, 'mass_')) return true;

  const entityId = toLowerText(entity.entity_id);
  const friendlyName = toLowerText(attributes.friendly_name);

  return (
    attributesContain(attributes, MUSIC_ASSISTANT_SIGNAL_FIELDS, 'music_assistant') ||
    toLowerText(attributes.platform) === 'mass' ||
    toLowerText(attributes.integration) === 'mass' ||
    entityId.includes('music_assistant') ||
    entityId.includes('mass_') ||
    friendlyName.includes('music assistant')
  );
}

export function isSonosMediaEntity(entity) {
  if (!entity) return false;
  if (isMusicAssistantMediaEntity(entity)) return false;

  const attributes = entity.attributes || {};
  const entityId = toLowerText(entity.entity_id);
  const friendlyName = toLowerText(attributes.friendly_name);

  if (hasAttributePrefix(attributes, 'sonos_')) return true;

  return (
    attributesContain(attributes, SONOS_SIGNAL_FIELDS, 'sonos') ||
    entityId.includes('sonos') ||
    friendlyName.includes('sonos')
  );
}