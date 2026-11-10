import { describe, expect, it } from 'vitest';
import type { EntityMap } from '../types/dashboard';
import { readVacuumSession } from '../utils/vacuumSession';

const NOW = new Date(2026, 10, 10, 12, 0, 0);
const sensor = (id: string, state: string, unit?: string): EntityMap => ({
  [id]: { entity_id: id, state, attributes: unit ? { unit_of_measurement: unit } : {} },
});
const read = (
  attributes: Record<string, unknown> = {},
  {
    entities = {},
    settings = {},
    sensors = {},
  }: Partial<Parameters<typeof readVacuumSession>[1]> = {}
) => readVacuumSession(attributes, { entities, settings, sensors }, NOW);

describe('readVacuumSession', () => {
  it('has nothing for a vacuum that reports nothing', () => {
    expect(read()).toEqual({
      cleaningMinutes: null,
      area: null,
      lastRunAt: null,
      progressPercent: null,
    });
  });

  it('reads the session from the vacuum attributes', () => {
    const session = read({
      cleaning_time: 42,
      cleaned_area: 34,
      cleaned_area_unit: 'm²',
      last_clean_end: '2026-11-10T09:30:00Z',
      cleaning_progress: 60,
    });
    expect(session).toEqual({
      cleaningMinutes: 42,
      area: { value: 34, unit: 'm²' },
      lastRunAt: new Date('2026-11-10T09:30:00Z'),
      progressPercent: 60,
    });
  });

  it('leaves out an area without a unit', () => {
    expect(read({ cleaned_area: 34 }).area).toBeNull();
  });

  it('prefers sensors mapped on the card', () => {
    const entities = {
      ...sensor('sensor.time', '0.5', 'h'),
      ...sensor('sensor.area', '120', 'ft²'),
      ...sensor('sensor.end', '2026-11-10T08:00:00Z'),
    };
    const session = read(
      { cleaning_time: 42, cleaned_area: 34, cleaned_area_unit: 'm²' },
      {
        entities,
        settings: {
          cleaningTimeSensorId: 'sensor.time',
          cleanedAreaSensorId: 'sensor.area',
          lastCleanEndSensorId: 'sensor.end',
        },
      }
    );
    expect(session.cleaningMinutes).toBe(30);
    expect(session.area).toEqual({ value: 120, unit: 'ft²' });
    expect(session.lastRunAt).toEqual(new Date('2026-11-10T08:00:00Z'));
  });

  it('finds Roborock style sensors named after the vacuum and skips the totals', () => {
    const sensors = {
      ...sensor('sensor.rocky_total_cleaning_time', '3000', 'min'),
      ...sensor('sensor.rocky_total_cleaning_area', '900', 'm²'),
      ...sensor('sensor.rocky_cleaning_time', '1500', 's'),
      ...sensor('sensor.rocky_cleaning_area', '18', 'm²'),
      ...sensor('sensor.rocky_last_clean_begin', '2026-11-10T07:00:00Z'),
      ...sensor('sensor.rocky_main_brush_time_left', '200', 'h'),
    };
    const session = read({}, { sensors });
    expect(session.cleaningMinutes).toBe(25);
    expect(session.area).toEqual({ value: 18, unit: 'm²' });
    expect(session.lastRunAt).toEqual(new Date('2026-11-10T07:00:00Z'));
  });

  it('takes the end of the last run before its start', () => {
    const sensors = {
      ...sensor('sensor.rocky_last_clean_begin', '2026-11-10T07:00:00Z'),
      ...sensor('sensor.rocky_last_clean_end', '2026-11-10T07:40:00Z'),
    };
    expect(read({}, { sensors }).lastRunAt).toEqual(new Date('2026-11-10T07:40:00Z'));
  });

  it.each([['unknown'], ['not a date'], ['2026-11-11T09:00:00Z']])(
    'ignores a last run of %s',
    (value) => {
      expect(read({ last_clean_end: value }).lastRunAt).toBeNull();
    }
  );

  it('ignores a progress that is not a percentage', () => {
    expect(read({ cleaning_progress: 140 }).progressPercent).toBeNull();
    expect(read({ cleaning_progress: 'unknown' }).progressPercent).toBeNull();
  });

  it('reads progress from a percentage sensor', () => {
    const sensors = sensor('sensor.rocky_cleaning_progress', '35', '%');
    expect(read({}, { sensors }).progressPercent).toBe(35);
  });
});
