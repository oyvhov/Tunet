// Utility barrel — re-exports from all utility modules
export { formatRelativeTime, formatDuration, isToggleEntity } from './formatting';
export { logger } from './logger';
export { isCardRemovable, isCardHiddenByLogic, isMediaPage } from './cardUtils';
export {
  evaluateEntityCondition,
  evaluateVisibilityConditionConfig,
  normalizeVisibilityConditionConfig,
  isConditionConfigured,
  resolveConditionEntityId,
} from './conditionUtils';
export { getCardGridSpan, getCardColSpan, buildGridLayout } from './gridLayout';
export { createDragAndDropHandlers } from './dragAndDrop';
export {
  getEffectiveUnitMode,
  inferUnitKind,
  getDisplayUnitForKind,
  convertValueByKind,
  formatUnitValue,
  formatKindValueForDisplay,
} from './units';
export { isValidPin, hashPin, verifyPin } from './pinLock';
export {
  isEntityDataStale,
  ENTITY_STALE_DISCONNECT_GRACE_MS,
  ENTITY_STALE_NO_UPDATE_MS,
} from './connectionHealth';
export { getEffectiveRoomEntityIds, filterEntitiesByDomain } from './roomEntities';
export { matchCarEntities } from './carEntityMatcher';
export { CHART_STATUS_COLORS, WEATHER_BAND_COLORS, getThresholdColor } from './chartColors';
export { downsampleTimeSeries } from './sensorHistory';
export { isMusicAssistantMediaEntity, isSonosMediaEntity } from './mediaEntityClassification';
export {
  buildRegistryLookupMap,
  enrichEntitiesWithRegistryMetadata,
} from './entityRegistryMetadata';
export {
  STATUS_GROUP_PILL_TYPE,
  STATUS_GROUP_SELECTION_ALL,
  STATUS_GROUP_SELECTION_INCLUDE,
  STATUS_GROUP_SELECTION_EXCLUDE,
  STATUS_GROUP_PRESETS,
  DEFAULT_STATUS_GROUP_PRESET,
  getStatusGroupPreset,
  getStatusGroupPresetText,
  getStatusGroupSelectionMode,
  buildStatusGroupPillVisuals,
  resolveStatusGroupCandidates,
  resolveStatusGroupPill,
} from './statusGroupPills';
