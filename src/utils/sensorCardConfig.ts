import { normalizeExternalUrl } from './externalLinks';

export const SENSOR_STATUS_MODES = ['auto', 'text', 'entity', 'attribute', 'hidden'];
export const SENSOR_ACTION_TYPES = [
  'auto',
  'more-info',
  'toggle',
  'turn_on',
  'turn_off',
  'scene',
  'script',
  'press',
  'service',
  'url',
  'none',
];

const AUTOMATIC_TOGGLE_DOMAINS = ['input_boolean', 'switch', 'light', 'automation', 'climate'];
const POWER_DOMAINS = [
  ...AUTOMATIC_TOGGLE_DOMAINS,
  'fan',
  'humidifier',
  'media_player',
  'remote',
  'siren',
];
const ACTION_TARGET_DOMAINS: Record<string, string[]> = {
  scene: ['scene'],
  script: ['script'],
  press: ['button', 'input_button'],
  toggle: POWER_DOMAINS,
  turn_on: POWER_DOMAINS,
  turn_off: POWER_DOMAINS,
};
export type SensorEntity = {
  entity_id?: string;
  state?: string;
  attributes?: Record<string, unknown> | null;
};

export type SensorEntities = Record<string, SensorEntity | undefined>;

export type SensorActionSettings = {
  type?: string;
  targetMode?: string;
  entityId?: unknown;
  trigger?: string;
  label?: unknown;
  labelOn?: unknown;
  labelOff?: unknown;
  icon?: unknown;
  service?: unknown;
  data?: unknown;
  confirm?: unknown;
  confirmLabel?: unknown;
  url?: unknown;
};

export type SensorCardSettings = {
  entityId?: unknown;
  sensorAction?: SensorActionSettings | null;
  sensorStatusEntityId?: unknown;
  scriptStatusText?: unknown;
  sensorStatusText?: unknown;
  sensorStatusMode?: string;
  showStatus?: boolean;
  sensorStatusAttribute?: unknown;
};

export type SensorCardAction = {
  type?: string;
  targetMode?: string;
  entityId?: unknown;
  targetEntity?: SensorEntity;
  service?: unknown;
  data?: Record<string, unknown>;
  url?: unknown;
};

export type SensorActionExpectation = {
  entityId: string;
  active: boolean;
  state: string | null;
};

const CLIMATE_TURN_OFF = 128;
const CLIMATE_TURN_ON = 256;
const textValue = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const objectValue = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function getSensorActionTargetDomains(type: string): string[] | null {
  return ACTION_TARGET_DOMAINS[type] || null;
}

export function getSensorAutomaticActionType(entity: SensorEntity | null | undefined): string {
  const domain = entity?.entity_id?.split('.')[0];
  if (AUTOMATIC_TOGGLE_DOMAINS.includes(domain as string)) return 'toggle';
  if (domain === 'scene' || domain === 'script') return domain;
  if (domain === 'button' || domain === 'input_button') return 'press';
  return 'none';
}

export function isSensorEntityActive(entity: SensorEntity | null | undefined): boolean {
  if (!entity || ['unknown', 'unavailable', 'off'].includes(entity.state as string)) return false;
  if (entity.entity_id?.startsWith('climate.')) return Boolean(entity.state);
  if (entity.entity_id?.startsWith('media_player.'))
    return Boolean(entity.state) && entity.state !== 'standby';
  return entity.state === 'on';
}

export function resolveSensorCardConfig(
  settings: SensorCardSettings = {},
  entity: SensorEntity | null | undefined,
  entities: SensorEntities = {}
) {
  const entityId = textValue(settings?.entityId) || entity?.entity_id || '';
  const primaryEntity = entities[entityId] || (entity?.entity_id === entityId ? entity : undefined);
  const storedAction: SensorActionSettings = objectValue(settings?.sensorAction)
    ? settings.sensorAction
    : {};
  const configuredType = SENSOR_ACTION_TYPES.includes(storedAction.type as string)
    ? (storedAction.type as string)
    : 'auto';
  const targetMode =
    configuredType === 'url' || (configuredType === 'service' && storedAction.targetMode === 'none')
      ? 'none'
      : 'entity';
  const actionEntityId = targetMode === 'none' ? '' : textValue(storedAction.entityId) || entityId;
  const targetEntity =
    entities[actionEntityId] ||
    (primaryEntity?.entity_id === actionEntityId ? primaryEntity : undefined);
  const statusEntityId = textValue(settings?.sensorStatusEntityId) || entityId;
  const statusEntity =
    entities[statusEntityId] ||
    (primaryEntity?.entity_id === statusEntityId ? primaryEntity : undefined);
  const legacyStatusText = primaryEntity?.entity_id?.startsWith('script.')
    ? textValue(settings?.scriptStatusText)
    : '';
  const statusText = textValue(settings?.sensorStatusText) || legacyStatusText;
  let statusMode = SENSOR_STATUS_MODES.includes(settings?.sensorStatusMode as string)
    ? (settings.sensorStatusMode as string)
    : 'auto';
  if (settings?.showStatus === false) statusMode = 'hidden';
  if (statusMode === 'text' && !statusText) statusMode = 'auto';

  const resolvedActionType =
    configuredType === 'auto' ? getSensorAutomaticActionType(targetEntity) : configuredType;
  const allowedTargetDomains = getSensorActionTargetDomains(resolvedActionType);

  return {
    entityId,
    statusMode,
    statusEntity,
    statusEntityId,
    statusText,
    statusAttribute: textValue(settings?.sensorStatusAttribute),
    showLegacyControls: configuredType === 'auto',
    action: {
      type: resolvedActionType,
      configuredType,
      isAutomatic: configuredType === 'auto',
      targetMode,
      entityId: actionEntityId,
      targetEntity,
      targetSupported:
        !allowedTargetDomains || allowedTargetDomains.includes(actionEntityId.split('.')[0]),
      trigger: ['button', 'icon', 'card'].includes(storedAction.trigger as string)
        ? storedAction.trigger
        : 'button',
      label: textValue(storedAction.label),
      labelOn: textValue(storedAction.labelOn),
      labelOff: textValue(storedAction.labelOff),
      icon: textValue(storedAction.icon),
      service: textValue(storedAction.service),
      data: objectValue(storedAction.data) ? { ...storedAction.data } : {},
      confirm: storedAction.confirm === true && !['none', 'more-info'].includes(resolvedActionType),
      confirmLabel: textValue(storedAction.confirmLabel),
      url: normalizeExternalUrl(storedAction.url),
    },
  };
}

export function canSensorUseNumericVariants(
  config: { action?: { configuredType?: string } } | null | undefined,
  displayEntity: SensorEntity | null | undefined,
  primaryEntity: SensorEntity | null | undefined
): boolean {
  const domain = displayEntity?.entity_id?.split('.')[0];
  return (
    domain !== 'input_number' ||
    displayEntity?.entity_id !== primaryEntity?.entity_id ||
    config?.action?.configuredType !== 'auto'
  );
}

function actionError(code: string): Error {
  return new Error(code);
}

export function resolveSensorCardActionCall(
  action: SensorCardAction | null | undefined,
  entity: SensorEntity | null | undefined = action?.targetEntity
) {
  const type = action?.type === 'auto' ? getSensorAutomaticActionType(entity) : action?.type;
  if (type === 'none' || type === 'more-info' || type === 'url') return null;
  const entityId =
    type === 'service' && action?.targetMode === 'none'
      ? ''
      : textValue(action?.entityId) || entity?.entity_id;
  const domain = entityId?.split('.')[0];

  if (type === 'service') {
    const parts = textValue(action?.service).split('.');
    if (parts.length !== 2 || parts.some((part) => !/^[a-z][a-z0-9_]*$/.test(part))) {
      throw actionError('invalid_service');
    }
    if (action?.data !== undefined && !objectValue(action.data)) throw actionError('invalid_data');
    const data: Record<string, unknown> = { ...action?.data };
    if (!data.target && data.entity_id === undefined && entityId) data.entity_id = entityId;
    return { domain: parts[0], service: parts[1], data, expectation: null, type };
  }

  if (!entityId || !entity || entity.entity_id !== entityId || entity.state === 'unavailable') {
    throw actionError('unavailable');
  }
  if (type === 'scene' || type === 'script' || type === 'press') {
    const validDomain =
      type === 'press' ? ['button', 'input_button'].includes(domain as string) : domain === type;
    if (!validDomain) throw actionError('unsupported');
    return {
      domain,
      service: type === 'press' ? 'press' : 'turn_on',
      data: { entity_id: entityId },
      expectation: null,
      type,
    };
  }

  if (
    !['toggle', 'turn_on', 'turn_off'].includes(type as string) ||
    !POWER_DOMAINS.includes(domain as string)
  ) {
    throw actionError('unsupported');
  }
  if (entity.state === 'unknown') throw actionError('unavailable');
  const active = type === 'toggle' ? !isSensorEntityActive(entity) : type === 'turn_on';
  const expectation: SensorActionExpectation = {
    entityId,
    active,
    state: ['climate', 'media_player'].includes(domain as string) ? null : active ? 'on' : 'off',
  };
  const service = active ? 'turn_on' : 'turn_off';
  if (domain !== 'climate') {
    return { domain, service, data: { entity_id: entityId }, expectation, type };
  }

  const features = Number(entity.attributes?.supported_features) || 0;
  if (features & (active ? CLIMATE_TURN_ON : CLIMATE_TURN_OFF)) {
    return { domain, service, data: { entity_id: entityId }, expectation, type };
  }
  const modes = Array.isArray(entity.attributes?.hvac_modes) ? entity.attributes.hvac_modes : [];
  const mode = active
    ? ['auto', 'heat_cool'].find((candidate) => modes.includes(candidate)) ||
      modes.find((candidate: unknown) => candidate !== 'off')
    : modes.includes('off')
      ? 'off'
      : null;
  if (!mode) throw actionError('unsupported');
  return {
    domain,
    service: 'set_hvac_mode',
    data: { entity_id: entityId, hvac_mode: mode },
    expectation: { ...expectation, state: mode },
    type,
  };
}

export function sensorActionExpectationMatches(
  expectation: SensorActionExpectation,
  entities: SensorEntities | null | undefined
): boolean {
  const entity = entities?.[expectation?.entityId];
  if (!entity || ['unavailable', 'unknown'].includes(entity.state as string)) return false;
  return expectation.state !== null
    ? entity.state === expectation.state
    : isSensorEntityActive(entity) === expectation.active;
}
