import { describe, it, expect } from 'vitest';
import {
  computeCalendarReminderTriggerAt,
  getCalendarReminderNextTriggerFromEntity,
  matchCalendarEvents,
} from '../utils/reminderEngine';

describe('reminderEngine calendar trigger timing', () => {
  it('computes trigger time at event start by default', () => {
    const start = Date.parse('2026-02-24T10:00:00.000Z');
    expect(computeCalendarReminderTriggerAt(start, { calendarTriggerMode: 'atEvent' })).toBe(start);
  });

  it('computes trigger time before event using offset minutes', () => {
    const start = Date.parse('2026-02-24T10:00:00.000Z');
    const trigger = computeCalendarReminderTriggerAt(start, {
      calendarTriggerMode: 'beforeEvent',
      calendarTriggerOffsetMinutes: 30,
    });
    expect(trigger).toBe(Date.parse('2026-02-24T09:30:00.000Z'));
  });

  it('matches calendar events using pre-event trigger time', () => {
    const events = [
      {
        summary: 'Team meeting',
        start: { dateTime: '2026-02-24T10:00:00.000Z' },
        end: { dateTime: '2026-02-24T11:00:00.000Z' },
      },
    ];

    const now = Date.parse('2026-02-24T09:30:00.000Z');
    const matched = matchCalendarEvents(events, 'meeting', now, {
      calendarTriggerMode: 'beforeEvent',
      calendarTriggerOffsetMinutes: 30,
    });

    expect(matched).toHaveLength(1);
    expect(matched[0]._triggerAt).toBe(now);
  });

  it('derives next trigger preview from calendar entity attributes', () => {
    const entities = {
      'calendar.work': {
        attributes: {
          start_time: '2026-02-24T15:00:00.000Z',
        },
      },
    };

    const next = getCalendarReminderNextTriggerFromEntity(
      {
        source: 'calendar',
        calendarEntityId: 'calendar.work',
        calendarTriggerMode: 'beforeEvent',
        calendarTriggerOffsetMinutes: 15,
      },
      entities,
      Date.parse('2026-02-24T14:00:00.000Z'),
    );

    expect(next).toBeTruthy();
    expect(next.triggerAt).toBe(Date.parse('2026-02-24T14:45:00.000Z'));
  });
});
