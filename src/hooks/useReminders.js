import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createReminder,
  getDueReminders,
  completeReminder,
  snoozeReminder,
  dismissReminder,
  DEFAULT_SNOOZE_MINUTES,
} from '../utils/reminderEngine';

const STORAGE_KEY = 'tunet_reminders';

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
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r,
      ),
    );
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

  return {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    setAllReminders,
    checkDue,
    activePopup,
    dueQueue,
    handleComplete,
    handleSnooze,
    handleDismiss,
  };
}
