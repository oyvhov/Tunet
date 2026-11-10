import type { EntityMap } from '../types/dashboard';
import { durationToMinutes } from './nextUp';

export interface VacuumSession {
  /** Length of the current run, or of the last one when docked. */
  cleaningMinutes: number | null;
  area: { value: number; unit: string } | null;
  lastRunAt: Date | null;
  progressPercent: number | null;
}

interface Reading {
  value: unknown;
  unit: string | null;
}

interface VacuumSessionSources {
  entities: EntityMap;
  /** Card settings; the vacuum popup lets the user map sensors here. */
  settings: Record<string, unknown>;
  /** Sensors that belong to the vacuum. */
  sensors: EntityMap;
}

const isUsable = (value: unknown) =>
  value != null && value !== '' && value !== 'unavailable' && value !== 'unknown';

const unitOf = (entity: EntityMap[string] | undefined) => {
  const unit = entity?.attributes?.unit_of_measurement;
  return typeof unit === 'string' && unit.trim() ? unit.trim() : null;
};

const toNumber = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

const toPastDate = (value: unknown, now: Date): Date | null => {
  if (!isUsable(value)) return null;
  const date = new Date(value as string);
  // A minute of slack for clocks that are slightly out of step.
  return Number.isNaN(date.getTime()) || date.getTime() > now.getTime() + 60_000 ? null : date;
};

function createReader(attributes: Record<string, unknown>, sources: VacuumSessionSources) {
  const { entities, settings, sensors } = sources;
  return {
    mapped(settingKey: string): Reading | null {
      const id = settings[settingKey];
      const entity = typeof id === 'string' ? entities[id] : undefined;
      return entity && isUsable(entity.state)
        ? { value: entity.state, unit: unitOf(entity) }
        : null;
    },
    attribute(keys: string[], unitKeys: string[] = []): Reading | null {
      const key = keys.find((name) => isUsable(attributes[name]));
      if (!key) return null;
      const unit = unitKeys.map((name) => attributes[name]).find((u) => typeof u === 'string');
      return { value: attributes[key], unit: (unit as string | undefined) ?? null };
    },
    /** First sensor whose id or name has every keyword and no word from `exclude`. */
    related(keywords: string[], exclude: string[] = []): Reading | null {
      for (const [id, entity] of Object.entries(sensors)) {
        const text = `${id} ${entity?.attributes?.friendly_name || ''}`.toLowerCase();
        if (!keywords.every((word) => text.includes(word))) continue;
        if (exclude.some((word) => text.includes(word))) continue;
        if (isUsable(entity?.state)) return { value: entity.state, unit: unitOf(entity) };
      }
      return null;
    },
  };
}

/** The current or last cleaning run, from mapped sensors, vacuum attributes or related sensors. */
export function readVacuumSession(
  attributes: Record<string, unknown> | undefined,
  sources: VacuumSessionSources,
  now: Date = new Date()
): VacuumSession {
  const read = createReader(attributes || {}, sources);
  const notTotal = ['total'];

  // Integrations that put the run length in an attribute give it in minutes.
  // "last_clean_time" is a timestamp, not a length.
  const time =
    read.mapped('cleaningTimeSensorId') ??
    read.attribute(['cleaning_time', 'current_clean_time', 'clean_time']) ??
    read.related(['cleaning_time'], ['total', 'last']) ??
    read.related(['clean_time'], ['total', 'last']);
  const cleaningMinutes = time ? durationToMinutes(time.value, time.unit ?? 'min') : null;

  const areaReading =
    read.mapped('cleanedAreaSensorId') ??
    read.attribute(
      ['cleaned_area', 'current_clean_area', 'clean_area'],
      ['cleaned_area_unit', 'current_clean_area_unit', 'clean_area_unit']
    ) ??
    read.related(['cleaning_area'], notTotal) ??
    read.related(['cleaned_area'], notTotal) ??
    read.related(['clean_area'], notTotal);
  const areaValue = areaReading ? toNumber(areaReading.value) : null;
  const area =
    areaValue !== null && areaValue > 0 && areaReading?.unit
      ? { value: areaValue, unit: areaReading.unit }
      : null;

  const lastRun =
    read.mapped('lastCleanEndSensorId') ??
    read.attribute(['last_clean_end', 'last_run_end']) ??
    read.related(['last_clean_end']) ??
    read.related(['last_run_end']) ??
    read.mapped('lastCleanStartSensorId') ??
    read.attribute(['last_clean_start', 'last_run_start']) ??
    read.related(['last_clean_start']) ??
    read.related(['last_clean_begin']) ??
    read.related(['last_run_start']);

  const progress =
    read.attribute(['cleaning_progress', 'progress']) ??
    read.related(['cleaning_progress']) ??
    read.related(['progress']);
  const progressValue = progress && (!progress.unit || progress.unit === '%') ? progress : null;
  const progressPercent = progressValue ? toNumber(progressValue.value) : null;

  return {
    cleaningMinutes,
    area,
    lastRunAt: lastRun ? toPastDate(lastRun.value, now) : null,
    progressPercent:
      progressPercent !== null && progressPercent >= 0 && progressPercent <= 100
        ? progressPercent
        : null,
  };
}
