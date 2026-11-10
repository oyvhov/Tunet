import { describe, expect, it } from 'vitest';
import {
  durationToMinutes,
  findCheapestWindow,
  findNextPrecipitation,
  formatClockTime,
  formatFinish,
  getChargeFinishTime,
  getCleaningFinishTime,
} from '../utils/nextUp';

const NOW = new Date(2026, 10, 10, 22, 0, 0);
const at = (hours: number, minutes = 0, dayOffset = 0) =>
  new Date(2026, 10, 10 + dayOffset, hours, minutes, 0);
const t = (key: string) =>
  ({
    'car.chargedIn': 'Ferdig lada om {minutes} min',
    'car.chargedAt': 'Ferdig lada kl. {time}',
  })[key] || key;

describe('durationToMinutes', () => {
  it.each([
    [90, 's', 1.5],
    ['25', 'min', 25],
    [1.5, 'h', 90],
    [1, 'd', 1440],
    ['2,5', 'h', 150],
  ])('reads %s %s', (value, unit, expected) => {
    expect(durationToMinutes(value, unit)).toBe(expected);
  });

  it.each([
    [10, ''],
    [10, 'km'],
    ['unknown', 'min'],
  ])('gives up on %s %s', (value, unit) => {
    expect(durationToMinutes(value, unit)).toBeNull();
  });
});

describe('getChargeFinishTime', () => {
  it('takes a future end time as it is', () => {
    const end = at(5, 40, 1);
    expect(getChargeFinishTime({ endTime: end.toISOString() }, NOW)).toEqual(end);
  });

  it('ignores an end time that has passed and falls back to the time left', () => {
    const finish = getChargeFinishTime(
      { endTime: at(20).toISOString(), timeToFull: 25, timeToFullUnit: 'min' },
      NOW
    );
    expect(finish).toEqual(at(22, 25));
  });

  it('reads a time-to-full sensor in hours', () => {
    expect(getChargeFinishTime({ timeToFull: '1.5', timeToFullUnit: 'h' }, NOW)).toEqual(
      at(23, 30)
    );
  });

  it('reads a time-to-full sensor that reports a timestamp', () => {
    const end = at(6, 0, 1);
    expect(getChargeFinishTime({ timeToFull: end.toISOString() }, NOW)).toEqual(end);
  });

  it.each([
    [{}],
    [{ timeToFull: 0, timeToFullUnit: 'min' }],
    [{ timeToFull: 30 }],
    [{ endTime: 'unavailable', timeToFull: 'unknown', timeToFullUnit: 'min' }],
  ])('has nothing to say for %j', (input) => {
    expect(getChargeFinishTime(input, NOW)).toBeNull();
  });
});

describe('getCleaningFinishTime', () => {
  it('projects the rest of the run from the progress so far', () => {
    expect(getCleaningFinishTime(20, 40, NOW)).toEqual(at(22, 30));
  });

  it.each([
    [null, 40],
    [20, null],
    [0, 40],
    [2, 5],
    [20, 100],
  ])('has no estimate for %s min at %s %%', (elapsed, progress) => {
    expect(getCleaningFinishTime(elapsed, progress, NOW)).toBeNull();
  });
});

describe('formatFinish', () => {
  const keys = { inKey: 'car.chargedIn', atKey: 'car.chargedAt' };

  it('counts minutes within the hour', () => {
    expect(formatFinish(at(22, 25), NOW, t, 'nb-NO', keys)).toBe('Ferdig lada om 25 min');
  });

  it('never says zero minutes', () => {
    expect(formatFinish(at(22, 0, 0), NOW, t, 'nb-NO', keys)).toBe('Ferdig lada om 1 min');
  });

  it('gives the clock time further out', () => {
    expect(formatFinish(at(5, 40, 1), NOW, t, 'nb-NO', keys)).toBe('Ferdig lada kl. 05:40');
  });
});

describe('formatClockTime', () => {
  it('shows only the time within a day', () => {
    expect(formatClockTime(at(5, 40, 1), NOW, 'nb-NO')).toBe('05:40');
  });

  it('adds the date beyond a day', () => {
    expect(formatClockTime(at(5, 40, 2), NOW, 'nb-NO')).toMatch(/12\..*05:40/);
  });
});

describe('findCheapestWindow', () => {
  const slots = (values: unknown[]) =>
    values.map((value, index) => ({
      start: at(index).toISOString(),
      end: at(index + 1).toISOString(),
      value,
    }));

  it('finds the cheapest two hours from now on', () => {
    const prices = slots([1, 1, 5, 4, 2, 3, 3, 9]);
    expect(findCheapestWindow(prices, 2)).toEqual({ start: at(4), end: at(6), average: 2.5 });
  });

  it('ignores cheaper hours that have passed', () => {
    const prices = slots([0, 0, 5, 4, 6, 7]);
    expect(findCheapestWindow(prices, 2)).toMatchObject({ start: at(2), end: at(4) });
  });

  it('prefers the earliest of equal windows', () => {
    expect(findCheapestWindow(slots([2, 2, 2, 2]), 0)).toMatchObject({ start: at(0) });
  });

  it('skips windows with a missing price', () => {
    const prices = slots([5, null, 0, 6, 6]);
    expect(findCheapestWindow(prices, 0)).toMatchObject({ start: at(2), end: at(4) });
  });

  it('needs a whole window left', () => {
    expect(findCheapestWindow(slots([1, 2, 3]), 2)).toBeNull();
    expect(findCheapestWindow([], 0)).toBeNull();
  });
});

describe('findNextPrecipitation', () => {
  const hour = (hours: number, condition: string, extra: Record<string, unknown> = {}) => ({
    datetime: at(hours, 0, hours < 22 ? 1 : 0).toISOString(),
    condition,
    ...extra,
  });

  it('finds the first wet hour', () => {
    const forecast = [hour(23, 'cloudy'), hour(2, 'cloudy'), hour(4, 'rainy'), hour(5, 'pouring')];
    expect(findNextPrecipitation(forecast, NOW)).toEqual({ at: at(4, 0, 1), kind: 'rain' });
  });

  it('tells snow from rain', () => {
    expect(findNextPrecipitation([hour(23, 'snowy')], NOW)).toEqual({
      at: at(23),
      kind: 'snow',
    });
  });

  it('reads precipitation when the forecast has no condition', () => {
    const forecast = [
      { datetime: at(23).toISOString(), precipitation: 0 },
      { datetime: at(1, 0, 1).toISOString(), precipitation: 0.4 },
    ];
    expect(findNextPrecipitation(forecast, NOW)).toEqual({ at: at(1, 0, 1), kind: 'rain' });
  });

  it('says nothing while it is already raining', () => {
    expect(
      findNextPrecipitation([hour(23, 'rainy')], NOW, { currentCondition: 'rainy' })
    ).toBeNull();
  });

  it('looks only at the coming day', () => {
    const forecast = [
      hour(23, 'sunny'),
      { datetime: at(23, 0, 1).toISOString(), condition: 'rainy' },
    ];
    expect(findNextPrecipitation(forecast, NOW)).toBeNull();
  });

  it('skips hours that have started', () => {
    const forecast = [
      { datetime: at(21).toISOString(), condition: 'rainy' },
      { datetime: at(22).toISOString(), condition: 'rainy' },
    ];
    expect(findNextPrecipitation(forecast, NOW)).toBeNull();
  });
});
