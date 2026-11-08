import type { EntityMap } from '../types/dashboard';
import { getUnavailableLabel, isUnavailableState } from './entityState';

type Translate = (key: string) => string;

const isUsableState = (value: unknown) =>
  value != null && value !== '' && value !== 'unavailable' && value !== 'unknown';

/** Sensors named after the vacuum, for when the entity registry has not listed them. */
export function findVacuumSensorsByName(entities: EntityMap, vacuumId: string): EntityMap {
  const vacuumName = (vacuumId.split('.')[1] || '').toLowerCase();
  if (!vacuumName) return {};
  const friendlyName = String(entities[vacuumId]?.attributes?.friendly_name || '').toLowerCase();
  const tokens = vacuumName
    .split(/[_\-\s]+/)
    .filter((token) => token.length > 2 && !['vacuum', 'robot', 'cleaner'].includes(token));

  const found: EntityMap = {};
  for (const [id, entity] of Object.entries(entities)) {
    if (!id.startsWith('sensor.')) continue;
    const lowerId = id.toLowerCase();
    const friendly = String(entity?.attributes?.friendly_name || '').toLowerCase();
    if (
      lowerId.includes(vacuumName) ||
      (friendlyName && friendly.includes(friendlyName)) ||
      tokens.some((token) => lowerId.includes(token) || friendly.includes(token))
    ) {
      found[id] = entity;
    }
  }
  return found;
}

/** Battery level from the vacuum's attribute, its mapped sensor, or a related sensor. */
export function getVacuumBattery(
  attribute: unknown,
  mappedSensorState: unknown,
  sensors: EntityMap
): number | null {
  const findState = (keyword: string) =>
    Object.entries(sensors).find(([id, entity]) => {
      const haystack = `${id} ${entity?.attributes?.friendly_name || ''}`.toLowerCase();
      return haystack.includes(keyword) && isUsableState(entity?.state);
    })?.[1]?.state;

  const raw = [
    attribute,
    mappedSensorState,
    findState('battery_level'),
    findState('battery'),
    findState('soc'),
  ].find(isUsableState);
  if (raw == null) return null;
  const battery = Number(raw);
  return Number.isFinite(battery) ? battery : null;
}

/** The status text shared by the vacuum card and popup. */
export function getVacuumStateLabel(
  state: string | null | undefined,
  battery: number | null,
  t: Translate
): string {
  if (isUnavailableState(state)) return getUnavailableLabel(state, t);
  const normalized = String(state || '').toLowerCase();
  if (!normalized) return t('vacuum.unknown');

  if (normalized === 'cleaning' || normalized === 'vacuuming') return t('vacuum.cleaning');
  if (['returning', 'going_home', 'return_to_base'].includes(normalized)) {
    return t('vacuum.returning') || t('room.vacuumStatus.goingHome') || normalized;
  }
  if (normalized === 'charging') {
    return battery !== null && battery >= 100 ? t('vacuum.docked') : t('vacuum.charging');
  }
  if (normalized === 'docked') {
    return battery !== null && battery < 100 ? t('vacuum.charging') : t('vacuum.docked');
  }
  if (normalized === 'idle' || normalized === 'ready') return t('vacuum.idle');
  if (normalized === 'paused' || normalized === 'pause') return t('vacuum.pause');
  if (['error', 'fault', 'problem', 'stuck'].includes(normalized)) {
    return t('room.vacuumStatus.error') || 'Error';
  }
  if (normalized === 'stopped') return t('room.vacuumStatus.stopped') || 'Stopped';
  return String(state);
}
