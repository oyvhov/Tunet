import { useState, useMemo } from 'react';
import { Bell, Plus, Trash2, Clock, Check, RotateCcw, X, ChevronDown, ChevronUp } from '../icons';
import {
  createReminder,
  getRecurrenceLabel,
  SNOOZE_OPTIONS,
} from '../utils/reminderEngine';

const RECURRENCE_TYPES = [
  'none', 'daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RecurrenceEditor({ rule, onChange, t }) {
  const type = rule?.type || 'none';
  const customDays = rule?.customDays || [];
  const intervalDays = rule?.intervalDays || 2;

  return (
    <div className="flex flex-col gap-3">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {RECURRENCE_TYPES.map((rt) => (
          <button
            key={rt}
            onClick={() => onChange({ type: rt, customDays: rt === 'custom' ? customDays : undefined, intervalDays: rt === 'custom' ? intervalDays : undefined })}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              type === rt ? 'ring-2 ring-[var(--accent-color)]' : ''
            }`}
            style={{
              backgroundColor: type === rt ? 'var(--accent-bg)' : 'var(--glass-bg)',
              color: type === rt ? 'var(--accent-color)' : 'var(--text-secondary)',
              border: '1px solid var(--glass-border)',
            }}
          >
            {getRecurrenceLabel({ type: rt }, t)}
          </button>
        ))}
      </div>

      {/* Custom weekday picker */}
      {type === 'custom' && (
        <div className="flex flex-col gap-2 popup-surface rounded-2xl p-3">
          <p className="text-xs font-medium opacity-70" style={{ color: 'var(--text-secondary)' }}>
            {t('reminder.customDays')}
          </p>
          <div className="flex gap-2">
            {DAY_NAMES.map((name, idx) => {
              const active = customDays.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const next = active
                      ? customDays.filter((d) => d !== idx)
                      : [...customDays, idx];
                    onChange({ ...rule, customDays: next.sort((a, b) => a - b) });
                  }}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    active ? 'ring-2 ring-[var(--accent-color)]' : ''
                  }`}
                  style={{
                    backgroundColor: active ? 'var(--accent-bg)' : 'var(--glass-bg)',
                    color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  {name.charAt(0)}
                </button>
              );
            })}
          </div>

          {/* Interval days (when no custom days selected) */}
          {customDays.length === 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.everyNDays')}
              </span>
              <input
                type="number"
                min={1}
                max={365}
                value={intervalDays}
                onChange={(e) =>
                  onChange({ ...rule, intervalDays: Math.max(1, Number(e.target.value) || 1) })
                }
                className="w-16 px-2 py-1 rounded-xl text-sm text-center"
                style={{
                  backgroundColor: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderForm({ initial, onSave, onCancel, t }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(initial?.dueAt || Date.now() + 3600_000);
    return d.toISOString().slice(0, 16); // datetime-local format
  });
  const [recurrence, setRecurrence] = useState(initial?.recurrence || { type: 'none' });
  const [snoozeMinutes, setSnoozeMinutes] = useState(initial?.snoozeMinutes || 15);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(initial || {}),
      title: title.trim(),
      description: description.trim(),
      dueAt: new Date(dueAt).getTime(),
      recurrence,
      snoozeMinutes,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Title */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.titleLabel')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('reminder.titlePlaceholder')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.descriptionLabel')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('reminder.descriptionPlaceholder')}
          rows={2}
          className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Due date/time */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.dueAt')}
        </label>
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl text-sm"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
            colorScheme: 'dark',
          }}
        />
      </div>

      {/* Recurrence */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.repeat')}
        </label>
        <RecurrenceEditor rule={recurrence} onChange={setRecurrence} t={t} />
      </div>

      {/* Default snooze */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.defaultSnooze')}
        </label>
        <div className="flex flex-wrap gap-2">
          {SNOOZE_OPTIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => setSnoozeMinutes(mins)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                snoozeMinutes === mins ? 'ring-2 ring-[var(--accent-color)]' : ''
              }`}
              style={{
                backgroundColor: snoozeMinutes === mins ? 'var(--accent-bg)' : 'var(--glass-bg)',
                color: snoozeMinutes === mins ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
              }}
            >
              {mins < 60 ? `${mins}m` : mins < 1440 ? `${mins / 60}h` : '1d'}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          style={{
            backgroundColor: 'var(--accent-color)',
            color: '#fff',
          }}
        >
          {initial?.id ? t('reminder.save') : t('reminder.create')}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-3 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
          }}
        >
          {t('reminder.cancel')}
        </button>
      </div>
    </div>
  );
}

function ReminderListItem({ reminder, onEdit, onDelete, onToggle, t }) {
  const [expanded, setExpanded] = useState(false);
  const isPast = reminder.dueAt < Date.now() && reminder.enabled && reminder.recurrence?.type === 'none';
  const isSnoozed = reminder.snoozedUntil && reminder.snoozedUntil > Date.now();

  const dueDate = new Date(reminder.dueAt);
  const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div
      className={`popup-surface rounded-2xl overflow-hidden transition-all ${
        !reminder.enabled ? 'opacity-50' : ''
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Enable/disable toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(reminder.id, !reminder.enabled); }}
          className="p-1.5 rounded-xl transition-all"
          style={{
            backgroundColor: reminder.enabled ? 'var(--accent-bg)' : 'var(--glass-bg)',
            color: reminder.enabled ? 'var(--accent-color)' : 'var(--text-secondary)',
          }}
        >
          {reminder.enabled ? <Bell className="w-4 h-4" /> : <Bell className="w-4 h-4 opacity-40" />}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${isPast ? 'line-through opacity-60' : ''}`}
            style={{ color: 'var(--text-primary)' }}
          >
            {reminder.title || t('reminder.untitled')}
          </p>
          <p className="text-xs opacity-50 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <Clock className="w-3 h-3" />
            {dateStr} {timeStr}
            {reminder.recurrence?.type !== 'none' && (
              <>
                <span>·</span>
                <RotateCcw className="w-3 h-3" />
                {getRecurrenceLabel(reminder.recurrence, t)}
              </>
            )}
            {isSnoozed && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}>
                {t('reminder.snoozed')}
              </span>
            )}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 opacity-40" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <ChevronDown className="w-4 h-4 opacity-40" style={{ color: 'var(--text-secondary)' }} />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 flex gap-2 border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <button
            onClick={() => onEdit(reminder)}
            className="flex-1 mt-2 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            }}
          >
            {t('reminder.edit')}
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'color-mix(in srgb, #ef4444 15%, transparent)',
              border: '1px solid color-mix(in srgb, #ef4444 30%, transparent)',
              color: '#ef4444',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function ReminderModal({
  show,
  onClose,
  reminders,
  onAdd,
  onUpdate,
  onDelete,
  t = (k) => k,
}) {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingReminder, setEditingReminder] = useState(null);

  const sortedReminders = useMemo(() => {
    if (!reminders) return [];
    return [...reminders].sort((a, b) => {
      // enabled first, then by dueAt ascending
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.dueAt - b.dueAt;
    });
  }, [reminders]);

  if (!show) return null;

  const handleCreateClick = () => {
    setEditingReminder(null);
    setView('form');
  };

  const handleEditClick = (reminder) => {
    setEditingReminder(reminder);
    setView('form');
  };

  const handleSave = (data) => {
    if (editingReminder?.id) {
      onUpdate(editingReminder.id, data);
    } else {
      onAdd(data);
    }
    setView('list');
    setEditingReminder(null);
  };

  const handleToggle = (id, enabled) => {
    onUpdate(id, { enabled });
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4 popup-anim">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
              <Bell className="w-5 h-5" style={{ color: 'var(--accent-color)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {view === 'form'
                ? (editingReminder ? t('reminder.editTitle') : t('reminder.newTitle'))
                : t('reminder.title')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={handleCreateClick}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={view === 'form' ? () => { setView('list'); setEditingReminder(null); } : onClose}
              className="p-2 rounded-xl transition-all hover:scale-105"
              style={{ backgroundColor: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'form' ? (
            <ReminderForm
              initial={editingReminder}
              onSave={handleSave}
              onCancel={() => { setView('list'); setEditingReminder(null); }}
              t={t}
            />
          ) : sortedReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--accent-bg)' }}>
                <Bell className="w-8 h-8 opacity-40" style={{ color: 'var(--accent-color)' }} />
              </div>
              <p className="text-sm opacity-60" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.noReminders')}
              </p>
              <button
                onClick={handleCreateClick}
                className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}
              >
                <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                {t('reminder.createFirst')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-4">
              {sortedReminders.map((r) => (
                <ReminderListItem
                  key={r.id}
                  reminder={r}
                  onEdit={handleEditClick}
                  onDelete={onDelete}
                  onToggle={handleToggle}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
