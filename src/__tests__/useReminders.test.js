import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminders } from '../hooks/useReminders';

describe('useReminders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('re-arms a completed one-shot when edited to recurring with new time', async () => {
    const { result } = renderHook(() => useReminders());

    const now = Date.now();
    let reminderId = null;

    act(() => {
      const created = result.current.addReminder({
        title: 'Medicine',
        source: 'manual',
        dueAt: now - 60_000,
        recurrence: { type: 'none' },
        enabled: false,
        completedAt: now - 30_000,
      });
      reminderId = created.id;
    });

    const nextDueAt = now + 2 * 60_000;
    act(() => {
      result.current.updateReminder(reminderId, {
        recurrence: { type: 'daily' },
        dueAt: nextDueAt,
      });
    });

    const updated = result.current.reminders.find((r) => r.id === reminderId);
    expect(updated).toBeTruthy();
    expect(updated.enabled).toBe(true);
    expect(updated.recurrence.type).toBe('daily');
    expect(updated.dueAt).toBe(nextDueAt);

    act(() => {
      result.current.checkDue(nextDueAt + 1_000);
    });

    await waitFor(() => {
      expect(result.current.activePopup?.id).toBe(reminderId);
    });
  });

  it('clears active popup/queue for a reminder when schedule is edited', async () => {
    const { result } = renderHook(() => useReminders());

    const now = Date.now();
    let reminderId = null;

    act(() => {
      const created = result.current.addReminder({
        title: 'Workout',
        source: 'manual',
        dueAt: now - 1_000,
        recurrence: { type: 'daily' },
        enabled: true,
      });
      reminderId = created.id;
    });

    act(() => {
      result.current.checkDue(now + 5_000);
    });

    await waitFor(() => {
      expect(result.current.activePopup?.id).toBe(reminderId);
    });

    act(() => {
      result.current.updateReminder(reminderId, { dueAt: now + 10 * 60_000 });
    });

    expect(result.current.activePopup).toBeNull();
    expect(result.current.dueQueue.find((r) => r.id === reminderId)).toBeFalsy();
  });
});
