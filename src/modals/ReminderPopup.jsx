import { useState } from 'react';
import { Bell, Check, Clock, X, Calendar, Activity } from '../icons';
import { SNOOZE_OPTIONS, getRecurrenceLabel, computeNextOccurrence } from '../utils/reminderEngine';

/**
 * ReminderPopup — the full-screen overlay that appears when a reminder is due.
 *
 * Shows one reminder at a time with Done / Snooze / Dismiss actions.
 * Styled with the dashboard's glassmorphism popup conventions.
 * Enlarged (max-w-lg) with pulsing icon glow, source badge, and next occurrence.
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

  // Source icon & label
  const isCalendar = reminder.source === 'calendar';
  const isEntityState = reminder.source === 'entityState';
  const SourceIcon = isCalendar ? Calendar : isEntityState ? Activity : Bell;
  const sourceLabel = isCalendar
    ? t('reminder.source.calendar')
    : isEntityState
    ? t('reminder.source.entityState')
    : null;

  // Next occurrence
  const nextOcc = computeNextOccurrence(reminder.dueAt, reminder.recurrence);
  const nextOccStr = nextOcc
    ? new Date(nextOcc).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={() => onDismiss(reminder.id)}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-lg border rounded-3xl md:rounded-[2.5rem] backdrop-blur-xl shadow-2xl overflow-hidden reminder-popup-enter"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header accent bar — animated gradient */}
        <div
          className="h-1.5 w-full reminder-accent-bar"
          style={{
            background: 'linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 60%, #fff), var(--accent-color))',
            backgroundSize: '200% 100%',
          }}
        />

        <div className="p-8 flex flex-col items-center text-center gap-5">
          {/* Pulsing icon with glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl reminder-glow-ring"
              style={{
                boxShadow: '0 0 25px var(--accent-color), 0 0 50px color-mix(in srgb, var(--accent-color) 30%, transparent)',
              }}
            />
            <div
              className="relative p-5 rounded-2xl reminder-pulse-icon"
              style={{ backgroundColor: 'var(--accent-bg)' }}
            >
              <SourceIcon className="w-8 h-8" style={{ color: 'var(--accent-color)' }} />
            </div>
          </div>

          {/* Source badge */}
          {sourceLabel && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-color)',
                border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
              }}
            >
              <SourceIcon className="w-3 h-3" />
              {sourceLabel}
            </span>
          )}

          {/* Title & description */}
          <div>
            <h2
              className="text-xl font-semibold mb-1.5"
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
            {/* Time info for manual reminders */}
            {!isCalendar && !isEntityState && (
              <p className="text-xs opacity-50" style={{ color: 'var(--text-secondary)' }}>
                {dateStr} · {timeStr}
                {reminder.recurrence?.type !== 'none' && (
                  <span> · {getRecurrenceLabel(reminder.recurrence, t)}</span>
                )}
              </p>
            )}
            {/* Calendar event detail */}
            {isCalendar && reminder._matchedEvent?.summary && (
              <p className="text-xs opacity-50 mt-1" style={{ color: 'var(--text-secondary)' }}>
                {reminder._matchedEvent.summary}
              </p>
            )}
          </div>

          {/* Next occurrence */}
          {nextOccStr && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px]"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock className="w-3 h-3 opacity-60" />
              {t('reminder.nextOccurrence')}: {nextOccStr}
            </div>
          )}

          {/* Snooze options (if expanded) */}
          {showSnoozeOptions && (
            <div className="w-full popup-surface rounded-2xl p-3 grid grid-cols-3 gap-2">
              {SNOOZE_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => onSnooze(reminder.id, mins)}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] active:scale-95"
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
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
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
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
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
              className="p-3.5 rounded-2xl transition-all hover:scale-[1.05] active:scale-95"
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
