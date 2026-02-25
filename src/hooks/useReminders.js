import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createReminder,
  getDueReminders,
  completeReminder,
  snoozeReminder,
  dismissReminder,
  evaluateEntityTrigger,
  matchCalendarEvents,
  canTriggerAgain,
  DEFAULT_SNOOZE_MINUTES,
} from '../utils/reminderEngine';
import { getCalendarEvents } from '../services';

const STORAGE_KEY = 'tunet_reminders';

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const isScheduleChanged = (prevReminder, nextReminder) => {
  if (!prevReminder || !nextReminder) return false;
  if (prevReminder.source !== nextReminder.source) return true;
  if (prevReminder.dueAt !== nextReminder.dueAt) return true;
  if (!sameJSON(prevReminder.recurrence, nextReminder.recurrence)) return true;
  if (prevReminder.calendarEntityId !== nextReminder.calendarEntityId) return true;
  if (prevReminder.calendarEventFilter !== nextReminder.calendarEventFilter) return true;
  if (prevReminder.calendarTriggerMode !== nextReminder.calendarTriggerMode) return true;
  if (prevReminder.calendarTriggerOffsetMinutes !== nextReminder.calendarTriggerOffsetMinutes) return true;
  if (prevReminder.sourceEntityId !== nextReminder.sourceEntityId) return true;
  if (!sameJSON(prevReminder.triggerCondition, nextReminder.triggerCondition)) return true;
  return false;
};

// ── localStorage helpers ─────────────────────────────────────────────

const readReminders = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeReminders = (reminders) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (err) {
    console.error('[useReminders] Failed to persist reminders', err);
  }
};

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Central hook for reminder CRUD + due-queue management.
 *
 * Reminder definitions are persisted in localStorage (`tunet_reminders`).
 * The `dueQueue` and `activePopup` are transient React state.
 */
export function useReminders() {
  const [reminders, setReminders] = useState(readReminders);
  const [dueQueue, setDueQueue] = useState([]);
  const [activePopup, setActivePopup] = useState(null);
  // Track IDs that are currently "pending" in the queue — prevents re-enqueueing
  const enqueuedRef = useRef(new Set());

  // Persist whenever reminders change
  useEffect(() => {
    writeReminders(reminders);
  }, [reminders]);

  // ── CRUD ───────────────────────────────────────────────────────────

  const addReminder = useCallback((overrides = {}) => {
    const r = createReminder(overrides);
    setReminders((prev) => [...prev, r]);
    return r;
  }, []);

  const updateReminder = useCallback((id, updates) => {
    const now = Date.now();

    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const merged = { ...r, ...updates, updatedAt: now };
        const scheduleChanged = isScheduleChanged(r, merged);
        const hasExplicitEnabled = hasOwn(updates, 'enabled');

        if (scheduleChanged) {
          merged.snoozedUntil = null;
          merged.lastTriggeredAt = null;

          // Re-arm edited reminders when schedule/source changed after an earlier
          // one-shot completion/disable, unless caller explicitly sets enabled.
          if (!hasExplicitEnabled && r.enabled === false) {
            merged.enabled = true;
          }

          if (r.source !== merged.source || !sameJSON(r.recurrence, merged.recurrence)) {
            merged.completedAt = null;
          }
        }

        return merged;
      }),
    );

    // If timing/source settings change, ensure this reminder can be re-enqueued
    // at its new schedule and does not stay stuck in pending queue state.
    enqueuedRef.current.delete(id);
    setDueQueue((prev) => prev.filter((r) => r.id !== id));
    setActivePopup((prev) => (prev?.id === id ? null : prev));
  }, []);

  const deleteReminder = useCallback((id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    // Remove from queue / popup if present
    setDueQueue((prev) => prev.filter((r) => r.id !== id));
    setActivePopup((prev) => (prev?.id === id ? null : prev));
    enqueuedRef.current.delete(id);
  }, []);

  // Bulk setter used by snapshot restore
  const setAllReminders = useCallback((next) => {
    setReminders(Array.isArray(next) ? next : []);
  }, []);

  // ── Due-check (called on each clock tick) ──────────────────────────

  const checkDue = useCallback(
    (nowMs = Date.now()) => {
      const due = getDueReminders(reminders, nowMs);
      if (due.length === 0) return;

      // Only enqueue IDs we haven't already enqueued
      const fresh = due.filter((r) => !enqueuedRef.current.has(r.id));
      if (fresh.length === 0) return;

      fresh.forEach((r) => enqueuedRef.current.add(r.id));
      setDueQueue((prev) => [...prev, ...fresh]);
    },
    [reminders],
  );

  // ── Popup queue management ─────────────────────────────────────────

  // When the queue grows and there's no active popup → show the first
  useEffect(() => {
    if (activePopup) return;
    if (dueQueue.length === 0) return;
    const [first, ...rest] = dueQueue;
    setActivePopup(first);
    setDueQueue(rest);
  }, [dueQueue, activePopup]);

  const handleComplete = useCallback(
    (id) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? completeReminder(r) : r)),
      );
      enqueuedRef.current.delete(id);
      setActivePopup(null);
    },
    [],
  );

  const handleSnooze = useCallback(
    (id, minutes = DEFAULT_SNOOZE_MINUTES) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? snoozeReminder(r, minutes) : r)),
      );
      enqueuedRef.current.delete(id);
      setActivePopup(null);
    },
    [],
  );

  const handleDismiss = useCallback(
    (id) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? dismissReminder(r) : r)),
      );
      enqueuedRef.current.delete(id);
      setActivePopup(null);
    },
    [],
  );

  // ── Entity / Calendar trigger checks ─────────────────────────────

  const lastCalendarSyncRef = useRef(0);
  const CALENDAR_SYNC_INTERVAL = 60_000; // 1-minute debounce

  /**
   * Called on each 30-second tick.
   * - Entity-state reminders: evaluate condition against current entity state.
   * - Calendar reminders: fetch events (debounced to 5 min) and match.
   */
  const checkEntityTriggers = useCallback(
    async (entities, conn) => {
      if (!entities) return;
      const nowMs = Date.now();

      // ── Entity-state triggers (instant, from in-memory entities) ──
      const entityStateReminders = reminders.filter(
        (r) => r.enabled && r.source === 'entityState' && r.sourceEntityId && r.triggerCondition,
      );

      const freshEntityTriggers = [];
      for (const r of entityStateReminders) {
        if (!canTriggerAgain(r, nowMs)) continue;
        const entity = entities[r.sourceEntityId];
        if (!entity) continue;
        if (evaluateEntityTrigger(entity, r.triggerCondition)) {
          if (!enqueuedRef.current.has(r.id)) {
            freshEntityTriggers.push(r);
          }
        }
      }

      if (freshEntityTriggers.length > 0) {
        // Mark trigger time
        setReminders((prev) =>
          prev.map((r) => {
            const match = freshEntityTriggers.find((t) => t.id === r.id);
            return match ? { ...r, lastTriggeredAt: nowMs, updatedAt: nowMs } : r;
          }),
        );
        freshEntityTriggers.forEach((r) => enqueuedRef.current.add(r.id));
        setDueQueue((prev) => [...prev, ...freshEntityTriggers]);
      }

      // ── Calendar triggers (debounced WS call) ─────────────────────
      if (!conn) return;
      const calendarReminders = reminders.filter(
        (r) => r.enabled && r.source === 'calendar' && r.calendarEntityId,
      );
      if (calendarReminders.length === 0) return;
      if (nowMs - lastCalendarSyncRef.current < CALENDAR_SYNC_INTERVAL) return;
      lastCalendarSyncRef.current = nowMs;

      // Collect unique calendar entity IDs
      const calendarIds = [...new Set(calendarReminders.map((r) => r.calendarEntityId))];

      try {
        const start = new Date(nowMs - 10 * 60_000); // 10 min ago
        const maxLeadMinutes = calendarReminders.reduce((max, reminder) => {
          if (reminder.calendarTriggerMode !== 'beforeEvent') return max;
          const mins = Math.max(0, Number(reminder.calendarTriggerOffsetMinutes) || 0);
          return Math.max(max, mins);
        }, 0);
        const end = new Date(nowMs + (60 + maxLeadMinutes) * 60_000); // 1 h ahead + max lead offset
        const result = await getCalendarEvents(conn, { start, end, entityIds: calendarIds });

        const freshCalTriggers = [];
        for (const r of calendarReminders) {
          if (!canTriggerAgain(r, nowMs)) continue;
          if (enqueuedRef.current.has(r.id)) continue;
          const calData = result[r.calendarEntityId];
          const events = calData?.events || [];
          const matched = matchCalendarEvents(events, r.calendarEventFilter, nowMs, {
            calendarTriggerMode: r.calendarTriggerMode,
            calendarTriggerOffsetMinutes: r.calendarTriggerOffsetMinutes,
          });
          if (matched.length > 0) {
            freshCalTriggers.push({ ...r, _matchedEvent: matched[0] });
          }
        }

        if (freshCalTriggers.length > 0) {
          setReminders((prev) =>
            prev.map((rm) => {
              const match = freshCalTriggers.find((t) => t.id === rm.id);
              return match ? { ...rm, lastTriggeredAt: nowMs, updatedAt: nowMs } : rm;
            }),
          );
          freshCalTriggers.forEach((r) => enqueuedRef.current.add(r.id));
          setDueQueue((prev) => [...prev, ...freshCalTriggers]);
        }
      } catch (err) {
        console.warn('[useReminders] Calendar sync failed', err);
      }
    },
    [reminders],
  );

  return {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    setAllReminders,
    checkDue,
    checkEntityTriggers,
    activePopup,
    dueQueue,
    handleComplete,
    handleSnooze,
    handleDismiss,
  };
}
