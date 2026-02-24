/**
 * Reminder Engine — recurrence calculation, due-check, and data helpers.
 *
 * A reminder definition lives in localStorage (`tunet_reminders`).
 * Transient queue state (what is currently showing) lives in React state only.
 */

// ── ID generation ────────────────────────────────────────────────────

let _counter = 0;
export const generateReminderId = () =>
  `rem_${Date.now().toString(36)}_${(++_counter).toString(36)}`;

// ── Recurrence types ─────────────────────────────────────────────────

/**
 * @typedef {'none'|'daily'|'weekdays'|'weekends'|'weekly'|'biweekly'|'monthly'|'yearly'|'custom'} RecurrenceType
 *
 * @typedef {Object} RecurrenceRule
 * @property {RecurrenceType} type
 * @property {number[]} [customDays]   - 0=Sun … 6=Sat  (only for type='custom')
 * @property {number}   [intervalDays] - arbitrary day interval (only for type='custom' when customDays is empty)
 */

/**
 * @typedef {'manual'|'calendar'|'entityState'} ReminderSource
 *
 * @typedef {'eq'|'neq'|'gt'|'lt'|'gte'|'lte'} TriggerOperator
 *
 * @typedef {Object} TriggerCondition
 * @property {TriggerOperator} operator
 * @property {string}          value    - compared as number when both sides are numeric
 *
 * @typedef {Object} Reminder
 * @property {string}            id
 * @property {string}            title
 * @property {string}            [description]
 * @property {ReminderSource}    source            - 'manual' | 'calendar' | 'entityState'
 * @property {string}            [sourceEntityId]  - HA entity id for calendar/entity source
 * @property {string}            [sourceItemUid]   - HA todo item uid (legacy)
 * @property {string}            [calendarEntityId] - calendar.* entity to watch
 * @property {string}            [calendarEventFilter] - optional substring filter on event summary
 * @property {TriggerCondition}  [triggerCondition] - condition for entityState source
 * @property {number}            dueAt             - epoch ms of next occurrence
 * @property {RecurrenceRule}    recurrence
 * @property {number}            [snoozedUntil]    - epoch ms; if set & future, skip until then
 * @property {number}            [completedAt]     - epoch ms of last completion
 * @property {string[]}          [dismissedOccurrences] - ISO date strings
 * @property {number}            [snoozeMinutes]   - default snooze duration (default 15)
 * @property {boolean}           [enabled]         - false = paused
 * @property {number}            [lastTriggeredAt] - epoch ms of last entity/calendar trigger
 * @property {number}            createdAt
 * @property {number}            updatedAt
 */

// ── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_SNOOZE_MINUTES = 15;

export const SNOOZE_OPTIONS = [5, 10, 15, 30, 60, 120, 1440]; // minutes

/** Create a blank manual reminder. */
export function createReminder(overrides = {}) {
  const now = Date.now();
  return {
    id: generateReminderId(),
    title: '',
    description: '',
    source: 'manual',
    sourceEntityId: null,
    sourceItemUid: null,
    calendarEntityId: null,
    calendarEventFilter: '',
    triggerCondition: null,
    dueAt: now + 3600_000, // 1 h from now
    recurrence: { type: 'none' },
    snoozedUntil: null,
    completedAt: null,
    dismissedOccurrences: [],
    snoozeMinutes: DEFAULT_SNOOZE_MINUTES,
    enabled: true,
    lastTriggeredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Recurrence helpers ───────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * Given a completed/dismissed occurrence timestamp and a recurrence rule,
 * compute the next occurrence epoch (ms).  Returns `null` for non-recurring.
 */
export function computeNextOccurrence(fromMs, rule) {
  if (!rule || rule.type === 'none') return null;

  const d = new Date(fromMs);

  switch (rule.type) {
    case 'daily':
      return fromMs + DAY_MS;

    case 'weekdays': {
      const next = new Date(fromMs + DAY_MS);
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setTime(next.getTime() + DAY_MS);
      }
      return next.getTime();
    }

    case 'weekends': {
      const next = new Date(fromMs + DAY_MS);
      while (next.getDay() !== 0 && next.getDay() !== 6) {
        next.setTime(next.getTime() + DAY_MS);
      }
      return next.getTime();
    }

    case 'weekly':
      return fromMs + 7 * DAY_MS;

    case 'biweekly':
      return fromMs + 14 * DAY_MS;

    case 'monthly': {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next.getTime();
    }

    case 'yearly': {
      const next = new Date(d);
      next.setFullYear(next.getFullYear() + 1);
      return next.getTime();
    }

    case 'custom': {
      // Custom weekdays
      if (Array.isArray(rule.customDays) && rule.customDays.length > 0) {
        const sorted = [...new Set(rule.customDays)].sort((a, b) => a - b);
        const today = d.getDay();
        // find next day in the set after today
        const nextDay = sorted.find((day) => day > today);
        if (nextDay !== undefined) {
          return fromMs + (nextDay - today) * DAY_MS;
        }
        // wrap to next week's first matching day
        const daysUntil = 7 - today + sorted[0];
        return fromMs + daysUntil * DAY_MS;
      }
      // Arbitrary interval
      if (Number.isFinite(rule.intervalDays) && rule.intervalDays > 0) {
        return fromMs + rule.intervalDays * DAY_MS;
      }
      return null;
    }

    default:
      return null;
  }
}

// ── Due-check ────────────────────────────────────────────────────────

/**
 * Return the list of reminders that are currently due (should trigger popup).
 * Sorted oldest-first so the queue processes them in order.
 */
export function getDueReminders(reminders, nowMs = Date.now()) {
  return reminders
    .filter((r) => {
      if (!r.enabled) return false;
      if (r.snoozedUntil && r.snoozedUntil > nowMs) return false;
      if (r.completedAt && r.recurrence.type === 'none') return false;
      return r.dueAt <= nowMs;
    })
    .sort((a, b) => a.dueAt - b.dueAt);
}

// ── Actions ──────────────────────────────────────────────────────────

/** Mark a reminder as done.  For recurring: advance to next occurrence. */
export function completeReminder(reminder) {
  const now = Date.now();
  const next = computeNextOccurrence(reminder.dueAt, reminder.recurrence);
  return {
    ...reminder,
    completedAt: now,
    snoozedUntil: null,
    dueAt: next ?? reminder.dueAt,
    enabled: next ? true : false, // disable non-recurring after done
    updatedAt: now,
  };
}

/** Snooze a reminder by N minutes. */
export function snoozeReminder(reminder, minutes) {
  const now = Date.now();
  const mins = minutes || reminder.snoozeMinutes || DEFAULT_SNOOZE_MINUTES;
  return {
    ...reminder,
    snoozedUntil: now + mins * 60_000,
    updatedAt: now,
  };
}

/** Dismiss the current occurrence (skip it, advance if recurring). */
export function dismissReminder(reminder) {
  const now = Date.now();
  const occKey = new Date(reminder.dueAt).toISOString();
  const next = computeNextOccurrence(reminder.dueAt, reminder.recurrence);
  return {
    ...reminder,
    dismissedOccurrences: [...(reminder.dismissedOccurrences || []), occKey],
    snoozedUntil: null,
    dueAt: next ?? reminder.dueAt,
    enabled: next ? true : false,
    updatedAt: now,
  };
}

// ── Recurrence label ─────────────────────────────────────────────────

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getRecurrenceLabel(rule, t) {
  if (!rule) return t?.('reminder.recurrence.none') || 'Once';
  switch (rule.type) {
    case 'none':      return t?.('reminder.recurrence.none') || 'Once';
    case 'daily':     return t?.('reminder.recurrence.daily') || 'Daily';
    case 'weekdays':  return t?.('reminder.recurrence.weekdays') || 'Weekdays';
    case 'weekends':  return t?.('reminder.recurrence.weekends') || 'Weekends';
    case 'weekly':    return t?.('reminder.recurrence.weekly') || 'Weekly';
    case 'biweekly':  return t?.('reminder.recurrence.biweekly') || 'Every 2 weeks';
    case 'monthly':   return t?.('reminder.recurrence.monthly') || 'Monthly';
    case 'yearly':    return t?.('reminder.recurrence.yearly') || 'Yearly';
    case 'custom': {
      if (Array.isArray(rule.customDays) && rule.customDays.length > 0) {
        return rule.customDays.map((d) => DAY_NAMES_SHORT[d]).join(', ');
      }
      if (rule.intervalDays) {
        return `Every ${rule.intervalDays} days`;
      }
      return t?.('reminder.recurrence.custom') || 'Custom';
    }
    default: return rule.type;
  }
}

// ── Entity-state trigger evaluation ──────────────────────────────────

/**
 * Evaluate whether an entity's current state satisfies a trigger condition.
 * Numeric coercion is applied when both sides look like numbers.
 *
 * @param {{ state: string }} entity
 * @param {TriggerCondition}  condition
 * @returns {boolean}
 */
export function evaluateEntityTrigger(entity, condition) {
  if (!entity || !condition || !condition.operator) return false;
  const actual = entity.state;
  if (actual === undefined || actual === null || actual === 'unavailable' || actual === 'unknown') return false;

  const target = condition.value;
  const aNum = Number(actual);
  const tNum = Number(target);
  const numeric = !isNaN(aNum) && !isNaN(tNum) && actual !== '' && target !== '';

  switch (condition.operator) {
    case 'eq':  return numeric ? aNum === tNum : actual === target;
    case 'neq': return numeric ? aNum !== tNum : actual !== target;
    case 'gt':  return numeric && aNum > tNum;
    case 'lt':  return numeric && aNum < tNum;
    case 'gte': return numeric && aNum >= tNum;
    case 'lte': return numeric && aNum <= tNum;
    default:    return false;
  }
}

// ── Calendar event matching ──────────────────────────────────────────

/**
 * Given a flat array of calendar events and an optional summary filter,
 * return events happening roughly "now" (started within the last 5 min or
 * starting in the next 5 min).
 *
 * @param {{ start: string|{dateTime:string}, end: string|{dateTime:string}, summary: string }[]} events
 * @param {string} [summaryFilter] - case-insensitive substring
 * @param {number} [nowMs]
 * @returns {{ start: string, end: string, summary: string }[]}
 */
export function matchCalendarEvents(events, summaryFilter, nowMs = Date.now()) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const WINDOW_MS = 5 * 60_000; // ±5 minutes

  return events.filter((ev) => {
    // Resolve start time
    const rawStart = ev.start?.dateTime || ev.start;
    const startMs = new Date(rawStart).getTime();
    if (isNaN(startMs)) return false;

    // Check if event is within the window
    const diff = startMs - nowMs;
    if (diff > WINDOW_MS || diff < -WINDOW_MS) return false;

    // Optional summary filter
    if (summaryFilter && typeof summaryFilter === 'string' && summaryFilter.trim()) {
      const summary = (ev.summary || '').toLowerCase();
      if (!summary.includes(summaryFilter.trim().toLowerCase())) return false;
    }

    return true;
  });
}

// ── Cooldown check for entity/calendar triggers ──────────────────────

/** Minimum ms between repeated triggers for the same reminder. */
export const TRIGGER_COOLDOWN_MS = 5 * 60_000; // 5 minutes

/**
 * Returns true if the reminder hasn't been triggered recently.
 */
export function canTriggerAgain(reminder, nowMs = Date.now()) {
  if (!reminder.lastTriggeredAt) return true;
  return (nowMs - reminder.lastTriggeredAt) >= TRIGGER_COOLDOWN_MS;
}
