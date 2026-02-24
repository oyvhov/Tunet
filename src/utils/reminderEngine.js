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
 * @typedef {'manual'|'calendar'|'todo'} ReminderSource
 *
 * @typedef {Object} Reminder
 * @property {string}         id
 * @property {string}         title
 * @property {string}         [description]
 * @property {ReminderSource} source          - 'manual' | 'calendar' | 'todo'
 * @property {string}         [sourceEntityId] - HA entity id for calendar/todo source
 * @property {string}         [sourceItemUid]  - HA todo item uid
 * @property {number}         dueAt           - epoch ms of next occurrence
 * @property {RecurrenceRule} recurrence
 * @property {number}         [snoozedUntil]  - epoch ms; if set & future, skip until then
 * @property {number}         [completedAt]   - epoch ms of last completion
 * @property {string[]}       [dismissedOccurrences] - ISO date strings of dismissed occurrences
 * @property {number}         [snoozeMinutes] - default snooze duration (default 15)
 * @property {boolean}        [enabled]       - false = paused
 * @property {number}         createdAt
 * @property {number}         updatedAt
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
    dueAt: now + 3600_000, // 1 h from now
    recurrence: { type: 'none' },
    snoozedUntil: null,
    completedAt: null,
    dismissedOccurrences: [],
    snoozeMinutes: DEFAULT_SNOOZE_MINUTES,
    enabled: true,
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
