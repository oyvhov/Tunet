import type { Translate } from '../types/ha';
import { formatDateTime } from './formatting';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const MINUTES_PER_UNIT: Record<string, number> = {
  s: 1 / 60,
  sec: 1 / 60,
  secs: 1 / 60,
  second: 1 / 60,
  seconds: 1 / 60,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  d: 1440,
  day: 1440,
  days: 1440,
};

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d/;

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateTime = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !ISO_DATETIME.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Minutes in a duration reading, or null when the unit is not a unit of time. */
export function durationToMinutes(value: unknown, unit: unknown): number | null {
  const unitKey = String(unit ?? '')
    .trim()
    .toLowerCase();
  const factor = MINUTES_PER_UNIT[unitKey];
  const number = toNumber(value);
  return factor === undefined || number === null ? null : number * factor;
}

export interface ChargeFinishInput {
  /** State of a charge end time sensor. */
  endTime?: unknown;
  /** State of a time-to-full sensor: a duration, or a timestamp on some integrations. */
  timeToFull?: unknown;
  timeToFullUnit?: unknown;
}

/** When the car will be charged, or null when the sensors do not say. */
export function getChargeFinishTime(
  { endTime, timeToFull, timeToFullUnit }: ChargeFinishInput,
  now: Date
): Date | null {
  for (const candidate of [parseDateTime(endTime), parseDateTime(timeToFull)]) {
    if (candidate && candidate.getTime() > now.getTime()) return candidate;
  }
  const minutes = durationToMinutes(timeToFull, timeToFullUnit);
  return minutes !== null && minutes > 0 ? new Date(now.getTime() + minutes * MINUTE_MS) : null;
}

/**
 * When a cleaning run will end, projected from the share done so far. Early in a run the
 * projection swings wildly, so it waits for 10 % progress.
 */
export function getCleaningFinishTime(
  elapsedMinutes: number | null,
  progressPercent: number | null,
  now: Date
): Date | null {
  if (elapsedMinutes === null || progressPercent === null) return null;
  if (elapsedMinutes <= 0 || progressPercent < 10 || progressPercent >= 100) return null;
  const remaining = (elapsedMinutes * (100 - progressPercent)) / progressPercent;
  return new Date(now.getTime() + remaining * MINUTE_MS);
}

/** "05:40" within a day; the date is added further out. */
export function formatClockTime(at: Date, now: Date, locale?: string): string {
  if (at.getTime() - now.getTime() >= DAY_MS) return formatDateTime(at, locale);
  return at.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** "Done in 25 min" within the hour, otherwise "Done at 05:40". */
export function formatFinish(
  at: Date,
  now: Date,
  t: Translate,
  locale: string | undefined,
  { inKey, atKey }: { inKey: string; atKey: string }
): string {
  const minutes = Math.max(1, Math.round((at.getTime() - now.getTime()) / MINUTE_MS));
  if (minutes < 60) return t(inKey).replace('{minutes}', String(minutes));
  return t(atKey).replace('{time}', formatClockTime(at, now, locale));
}

export interface PriceSlot {
  start: string | number | Date;
  end: string | number | Date;
  value: unknown;
}

export interface PriceWindow {
  start: Date;
  end: Date;
  average: number;
}

/** The cheapest run of `size` back-to-back prices from `fromIndex` on; null when none is left. */
export function findCheapestWindow(
  slots: PriceSlot[],
  fromIndex: number,
  size = 2
): PriceWindow | null {
  let best: { index: number; average: number } | null = null;
  for (let index = Math.max(0, fromIndex); index + size <= slots.length; index += 1) {
    const values = slots.slice(index, index + size).map((slot) => slot.value);
    if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) continue;
    const average = (values as number[]).reduce((sum, value) => sum + value, 0) / size;
    if (!best || average < best.average) best = { index, average };
  }
  if (!best) return null;
  return {
    start: new Date(slots[best.index].start),
    end: new Date(slots[best.index + size - 1].end),
    average: best.average,
  };
}

export type PrecipitationKind = 'rain' | 'snow';

const PRECIPITATION_BY_CONDITION: Record<string, PrecipitationKind> = {
  rainy: 'rain',
  pouring: 'rain',
  'lightning-rainy': 'rain',
  'snowy-rainy': 'rain',
  hail: 'rain',
  snowy: 'snow',
};

const forecastTime = (entry: Record<string, unknown>) =>
  new Date((entry.datetime || entry.datetime_local || entry.time || entry.start || '') as string);

/**
 * The first forecast period that starts within `hours` and brings rain or snow. Null while it
 * is already wet, since the card shows that, and when it stays dry.
 */
export function findNextPrecipitation(
  forecast: Record<string, unknown>[],
  now: Date,
  { currentCondition, hours = 24 }: { currentCondition?: unknown; hours?: number } = {}
): { at: Date; kind: PrecipitationKind } | null {
  if (PRECIPITATION_BY_CONDITION[String(currentCondition)]) return null;
  const until = now.getTime() + hours * 60 * MINUTE_MS;
  let next: { at: Date; kind: PrecipitationKind } | null = null;
  for (const entry of forecast) {
    const at = forecastTime(entry);
    const time = at.getTime();
    if (Number.isNaN(time) || time <= now.getTime() || time > until) continue;
    if (next && time >= next.at.getTime()) continue;
    const condition = typeof entry.condition === 'string' ? entry.condition : null;
    const precipitation = toNumber(entry.precipitation);
    const kind = condition
      ? PRECIPITATION_BY_CONDITION[condition]
      : precipitation !== null && precipitation > 0
        ? 'rain'
        : undefined;
    if (kind) next = { at, kind };
  }
  return next;
}
