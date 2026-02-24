import { useState } from 'react';
import { Bell, Check, Clock, X } from '../icons';
import { SNOOZE_OPTIONS, getRecurrenceLabel } from '../utils/reminderEngine';

/**
 * ReminderPopup — the full-screen overlay that appears when a reminder is due.
 *
 * Shows one reminder at a time with Done / Snooze / Dismiss actions.
 * Styled with the dashboard's glassmorphism popup conventions.
 */
export default function ReminderPopup({
  reminder,
  onComplete,
  onSnooze,
  onDismiss,
  t = (k) => k,
}) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  if (!reminder) return null;

  const formatSnooze = (mins) => {
    if (mins < 60) return `${mins} ${t('reminder.minutes')}`;
    if (mins === 60) return `1 ${t('reminder.hour')}`;
    if (mins < 1440) return `${mins / 60} ${t('reminder.hours')}`;
    return `1 ${t('reminder.day')}`;
  };

  const dueDate = new Date(reminder.dueAt);
  const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 popup-anim">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onDismiss(reminder.id)}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Header accent bar */}
        <div
          className="h-1 w-full"
          style={{ background: 'var(--accent-color)' }}
        />

        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div
            className="p-4 rounded-2xl"
            style={{ backgroundColor: 'var(--accent-bg)' }}
          >
            <Bell className="w-7 h-7" style={{ color: 'var(--accent-color)' }} />
          </div>

          {/* Title */}
          <div>
            <h2
              className="text-lg font-semibold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {reminder.title || t('reminder.untitled')}
            </h2>
            {reminder.description && (
              <p
                className="text-sm opacity-70 mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {reminder.description}
              </p>
            )}
            <p className="text-xs opacity-50" style={{ color: 'var(--text-secondary)' }}>
              {dateStr} · {timeStr}
              {reminder.recurrence?.type !== 'none' && (
                <span> · {getRecurrenceLabel(reminder.recurrence, t)}</span>
              )}
            </p>
          </div>

          {/* Snooze options (if expanded) */}
          {showSnoozeOptions && (
            <div className="w-full popup-surface rounded-2xl p-3 grid grid-cols-2 gap-2">
              {SNOOZE_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => onSnooze(reminder.id, mins)}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatSnooze(mins)}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 w-full mt-1">
            {/* Done */}
            <button
              onClick={() => onComplete(reminder.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
              }}
            >
              <Check className="w-4 h-4" />
              {t('reminder.done')}
            </button>

            {/* Snooze */}
            <button
              onClick={() =>
                showSnoozeOptions
                  ? setShowSnoozeOptions(false)
                  : setShowSnoozeOptions(true)
              }
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            >
              <Clock className="w-4 h-4" />
              {t('reminder.snooze')}
            </button>

            {/* Dismiss */}
            <button
              onClick={() => onDismiss(reminder.id)}
              className="p-3 rounded-2xl transition-all hover:scale-[1.05] active:scale-95"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
              title={t('reminder.dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
