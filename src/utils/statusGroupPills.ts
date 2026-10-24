import type { HassEntity, Translate } from '../types/ha';

// Callers pass live HA entities or lighter test/preview objects.
type StatusGroupEntity = Partial<HassEntity> | null | undefined;
export type StatusGroupEntities = Record<string, Partial<HassEntity> | undefined>;
export type StatusGroupEntityRow = { id: string; entity: Partial<HassEntity> };

export type StatusGroupPill = {
  groupPreset?: string | null;
  groupSelectionMode?: string | null;
  groupEntityIds?: string[] | null;
  groupThreshold?: string | number | null;
  label?: unknown;
  name?: unknown;
  sublabel?: unknown;
  hideWhenEmpty?: boolean;
};

export type StatusGroupPreset = {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  emptyLabelKey: string;
  fallbackEmptyLabel: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  actionDomain?: string;
  actionService?: string;
  actionLabelKey?: string;
  fallbackActionLabel?: string;
  rowActionLabelKey?: string;
  fallbackRowActionLabel?: string;
  defaultThreshold?: number;
  minThreshold?: number;
  maxThreshold?: number;
  candidates?: (id: string, entity: StatusGroupEntity) => boolean;
  matches: (id: string, entity: StatusGroupEntity, pill?: StatusGroupPill | null) => boolean;
};

export const STATUS_GROUP_PILL_TYPE = 'group_status';
export const STATUS_GROUP_SELECTION_ALL = 'all';
export const STATUS_GROUP_SELECTION_INCLUDE = 'include';
export const STATUS_GROUP_SELECTION_EXCLUDE = 'exclude';
export const DEFAULT_LOW_BATTERY_THRESHOLD = 20;

const VALID_GROUP_SELECTION_MODES = new Set<unknown>([
  STATUS_GROUP_SELECTION_ALL,
  STATUS_GROUP_SELECTION_INCLUDE,
  STATUS_GROUP_SELECTION_EXCLUDE,
]);

const OPENING_DEVICE_CLASSES = new Set(['door', 'garage_door', 'opening', 'window']);
const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown']);

const toEntityRows = (entities: StatusGroupEntities | null | undefined): StatusGroupEntityRow[] =>
  Object.entries(entities || {})
    .map(([id, entity]) => ({ id, entity }))
    .filter((row): row is StatusGroupEntityRow => !!row.entity && typeof row.entity === 'object');

const sortByFriendlyName = (left: StatusGroupEntityRow, right: StatusGroupEntityRow) => {
  const leftName = left.entity?.attributes?.friendly_name || left.id;
  const rightName = right.entity?.attributes?.friendly_name || right.id;
  return leftName.localeCompare(rightName);
};

const isUnavailable = (entity: StatusGroupEntity) =>
  UNAVAILABLE_STATES.has(String(entity?.state || '').toLowerCase());

const isOpeningSensor = (id: string, entity: StatusGroupEntity) => {
  if (!id.startsWith('binary_sensor.')) return false;
  const deviceClass = String(entity?.attributes?.device_class || '').toLowerCase();
  return OPENING_DEVICE_CLASSES.has(deviceClass);
};

const isBatteryEntity = (_id: string, entity: StatusGroupEntity) =>
  String(entity?.attributes?.device_class || '').toLowerCase() === 'battery';

const getBatteryLevel = (entity: StatusGroupEntity) => {
  // parseFloat(undefined) is NaN, which the isFinite check below handles
  const level = Number.parseFloat(entity?.state as string);
  return Number.isFinite(level) ? level : null;
};

const normalizeGroupSelectionMode = (mode: string | null | undefined): string =>
  // has() doesn't narrow; a hit means mode is one of the string modes
  VALID_GROUP_SELECTION_MODES.has(mode) ? (mode as string) : STATUS_GROUP_SELECTION_ALL;

const getGroupEntityIdSet = (pill: StatusGroupPill | null | undefined) =>
  new Set(
    Array.isArray(pill?.groupEntityIds)
      ? pill.groupEntityIds.filter((id) => typeof id === 'string' && id.trim())
      : []
  );

const isAllowedBySelection = (pill: StatusGroupPill | null | undefined, id: string) => {
  const mode = normalizeGroupSelectionMode(pill?.groupSelectionMode);
  if (mode === STATUS_GROUP_SELECTION_ALL) return true;

  const selectedIds = getGroupEntityIdSet(pill);
  if (mode === STATUS_GROUP_SELECTION_INCLUDE) return selectedIds.has(id);
  return !selectedIds.has(id);
};

export const STATUS_GROUP_PRESETS: StatusGroupPreset[] = [
  {
    id: 'lights_on',
    labelKey: 'statusPills.groupPresetLightsOn',
    fallbackLabel: 'Lights on',
    emptyLabelKey: 'statusPills.groupPresetLightsOnEmpty',
    fallbackEmptyLabel: 'No lights on',
    icon: 'Lightbulb',
    iconBgColor: 'rgba(245, 158, 11, 0.14)',
    iconColor: 'text-amber-300',
    actionDomain: 'light',
    actionService: 'turn_off',
    actionLabelKey: 'statusPills.groupActionTurnOffAll',
    fallbackActionLabel: 'Turn off all',
    rowActionLabelKey: 'statusPills.groupActionTurnOff',
    fallbackRowActionLabel: 'Turn off',
    candidates: (id) => id.startsWith('light.'),
    matches: (id, entity) => id.startsWith('light.') && entity?.state === 'on',
  },
  {
    id: 'openings_open',
    labelKey: 'statusPills.groupPresetOpeningsOpen',
    fallbackLabel: 'Open doors/windows',
    emptyLabelKey: 'statusPills.groupPresetOpeningsOpenEmpty',
    fallbackEmptyLabel: 'All doors/windows closed',
    icon: 'DoorOpen',
    iconBgColor: 'rgba(14, 165, 233, 0.14)',
    iconColor: 'text-sky-300',
    candidates: isOpeningSensor,
    matches: (id, entity) => {
      if (entity?.state !== 'on') return false;
      return isOpeningSensor(id, entity);
    },
  },
  {
    id: 'covers_open',
    labelKey: 'statusPills.groupPresetCoversOpen',
    fallbackLabel: 'Open covers',
    emptyLabelKey: 'statusPills.groupPresetCoversOpenEmpty',
    fallbackEmptyLabel: 'All covers closed',
    icon: 'Columns',
    iconBgColor: 'rgba(16, 185, 129, 0.14)',
    iconColor: 'text-emerald-300',
    actionDomain: 'cover',
    actionService: 'close_cover',
    actionLabelKey: 'statusPills.groupActionCloseAll',
    fallbackActionLabel: 'Close all',
    rowActionLabelKey: 'statusPills.groupActionClose',
    fallbackRowActionLabel: 'Close',
    candidates: (id) => id.startsWith('cover.'),
    matches: (id, entity) =>
      id.startsWith('cover.') && !isUnavailable(entity) && entity?.state !== 'closed',
  },
  {
    id: 'low_battery',
    labelKey: 'statusPills.groupPresetLowBattery',
    fallbackLabel: 'Low battery',
    emptyLabelKey: 'statusPills.groupPresetLowBatteryEmpty',
    fallbackEmptyLabel: 'No low batteries',
    icon: 'Battery',
    iconBgColor: 'rgba(239, 68, 68, 0.14)',
    iconColor: 'text-red-400',
    defaultThreshold: DEFAULT_LOW_BATTERY_THRESHOLD,
    minThreshold: 0,
    maxThreshold: 100,
    candidates: isBatteryEntity,
    matches: (id, entity, pill) => {
      if (!isBatteryEntity(id, entity) || isUnavailable(entity)) return false;
      if (id.startsWith('binary_sensor.')) return entity?.state === 'on';
      const level = getBatteryLevel(entity);
      // low_battery always has a defaultThreshold, so the threshold is a number here
      return level !== null && level <= (getStatusGroupThreshold(pill) as number);
    },
  },
];

export const DEFAULT_STATUS_GROUP_PRESET = STATUS_GROUP_PRESETS[0].id;

export function getStatusGroupPreset(presetId: string | null | undefined): StatusGroupPreset {
  return STATUS_GROUP_PRESETS.find((preset) => preset.id === presetId) || STATUS_GROUP_PRESETS[0];
}

export function getStatusGroupThreshold(
  pill: StatusGroupPill | null | undefined
): number | undefined {
  const preset = getStatusGroupPreset(pill?.groupPreset);
  if (!Number.isFinite(preset.defaultThreshold)) return undefined;

  // parseFloat coerces numbers/nullish itself; the cast only satisfies its string signature
  const parsed = Number.parseFloat(pill?.groupThreshold as string);
  // presets with a defaultThreshold (checked above) also define min/maxThreshold
  const threshold = Number.isFinite(parsed) ? parsed : (preset.defaultThreshold as number);
  return Math.min(
    preset.maxThreshold as number,
    Math.max(preset.minThreshold as number, threshold)
  );
}

export function getStatusGroupPresetText(
  presetId: string | null | undefined,
  t: Translate | null | undefined,
  mode: 'label' | 'empty' = 'label'
): string {
  const preset = getStatusGroupPreset(presetId);
  const key = mode === 'empty' ? preset.emptyLabelKey : preset.labelKey;
  const fallback = mode === 'empty' ? preset.fallbackEmptyLabel : preset.fallbackLabel;
  const translated = typeof t === 'function' ? t(key) : key;
  return translated && translated !== key ? String(translated) : fallback;
}

export function buildStatusGroupPillVisuals(presetId: string | null | undefined) {
  const preset = getStatusGroupPreset(presetId);
  return {
    icon: preset.icon,
    iconBgColor: preset.iconBgColor,
    iconColor: preset.iconColor,
  };
}

export function getStatusGroupSelectionMode(pill: StatusGroupPill | null | undefined): string {
  return normalizeGroupSelectionMode(pill?.groupSelectionMode);
}

export function resolveStatusGroupCandidates(
  presetId: string | null | undefined,
  entities: StatusGroupEntities | null | undefined
): StatusGroupEntityRow[] {
  const preset = getStatusGroupPreset(presetId);
  const candidates = toEntityRows(entities).filter(({ id, entity }) =>
    typeof preset.candidates === 'function'
      ? preset.candidates(id, entity)
      : preset.matches(id, entity)
  );
  candidates.sort(sortByFriendlyName);
  return candidates;
}

export function resolveStatusGroupPill(
  pill: StatusGroupPill | null | undefined,
  entities: StatusGroupEntities | null | undefined,
  t: Translate | null | undefined
) {
  const preset = getStatusGroupPreset(pill?.groupPreset);
  const matchedEntities = toEntityRows(entities).filter(
    ({ id, entity }) => preset.matches(id, entity, pill) && isAllowedBySelection(pill, id)
  );
  matchedEntities.sort(sortByFriendlyName);

  const count = matchedEntities.length;
  const customLabel = typeof pill?.label === 'string' ? pill.label.trim() : '';
  const customName = typeof pill?.name === 'string' ? pill.name.trim() : '';
  const customSublabel = typeof pill?.sublabel === 'string' ? pill.sublabel.trim() : '';
  const label = customLabel || customName || getStatusGroupPresetText(preset.id, t);
  const emptyLabel = getStatusGroupPresetText(preset.id, t, 'empty');

  return {
    preset,
    count,
    matchedEntities,
    shouldRender: pill?.hideWhenEmpty === false || count > 0,
    syntheticEntity: {
      entity_id: `status_group.${preset.id}`,
      state: String(count),
      attributes: {
        friendly_name: label,
        statusPillSublabel: customSublabel || (count > 0 ? String(count) : emptyLabel),
        statusPillCount: count,
        statusPillPreset: preset.id,
      },
    },
  };
}
