import { useState, useMemo } from 'react';
import { Bell, Plus, Trash2, Clock, RotateCcw, X, ChevronDown, ChevronUp, Calendar, Activity, Search } from '../icons';
import {
  getRecurrenceLabel,
  SNOOZE_OPTIONS,
  DEFAULT_CALENDAR_TRIGGER_MODE,
  DEFAULT_CALENDAR_TRIGGER_OFFSET_MINUTES,
  getCalendarReminderNextTriggerFromEntity,
} from '../utils/reminderEngine';

const RECURRENCE_TYPES = [
  'none', 'daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SOURCE_OPTIONS = [
  { key: 'manual', icon: Bell, labelKey: 'reminder.source.manual' },
  { key: 'calendar', icon: Calendar, labelKey: 'reminder.source.calendar' },
  { key: 'entityState', icon: Activity, labelKey: 'reminder.source.entityState' },
];

const OPERATOR_OPTIONS = [
  { value: 'eq',  label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt',  label: '>' },
  { value: 'lt',  label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];

const TRIGGER_ENTITY_DOMAINS = ['binary_sensor', 'sensor', 'input_boolean', 'switch', 'input_number'];
const CALENDAR_BEFORE_OPTIONS = [5, 10, 15, 30, 60, 120, 1440];

function toDateTimeLocalValue(epochMs) {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

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

function ReminderForm({ initial, onSave, onCancel, t, entities }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [source, setSource] = useState(initial?.source || 'manual');
  const [dueAt, setDueAt] = useState(() => {
    return toDateTimeLocalValue(initial?.dueAt || Date.now() + 3600_000);
  });
  const [recurrence, setRecurrence] = useState(initial?.recurrence || { type: 'none' });
  const [snoozeMinutes, setSnoozeMinutes] = useState(initial?.snoozeMinutes || 15);

  // Calendar source
  const [calendarEntityId, setCalendarEntityId] = useState(initial?.calendarEntityId || '');
  const [calendarEventFilter, setCalendarEventFilter] = useState(initial?.calendarEventFilter || '');
  const [calendarTriggerMode, setCalendarTriggerMode] = useState(initial?.calendarTriggerMode || DEFAULT_CALENDAR_TRIGGER_MODE);
  const [calendarTriggerOffsetMinutes, setCalendarTriggerOffsetMinutes] = useState(
    Number(initial?.calendarTriggerOffsetMinutes) > 0
      ? Number(initial?.calendarTriggerOffsetMinutes)
      : DEFAULT_CALENDAR_TRIGGER_OFFSET_MINUTES,
  );

  // Entity-state source
  const [sourceEntityId, setSourceEntityId] = useState(initial?.sourceEntityId || '');
  const [triggerOperator, setTriggerOperator] = useState(initial?.triggerCondition?.operator || 'eq');
  const [triggerValue, setTriggerValue] = useState(initial?.triggerCondition?.value || '');

  // Entity search
  const [entitySearch, setEntitySearch] = useState('');

  // Filter entities by domain for each source type
  const calendarEntities = useMemo(() => {
    if (!entities) return [];
    return Object.keys(entities)
      .filter((id) => id.startsWith('calendar.'))
      .sort();
  }, [entities]);

  const triggerEntities = useMemo(() => {
    if (!entities) return [];
    return Object.keys(entities)
      .filter((id) => TRIGGER_ENTITY_DOMAINS.some((d) => id.startsWith(d + '.')))
      .sort();
  }, [entities]);

  const filteredEntities = useMemo(() => {
    const list = source === 'calendar' ? calendarEntities : triggerEntities;
    if (!entitySearch.trim()) return list.slice(0, 50);
    const q = entitySearch.toLowerCase();
    return list.filter((id) => {
      const name = entities?.[id]?.attributes?.friendly_name || '';
      return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [source, calendarEntities, triggerEntities, entitySearch, entities]);

  const selectedEntityForSource = source === 'calendar' ? calendarEntityId : sourceEntityId;
  const setSelectedEntityForSource = source === 'calendar' ? setCalendarEntityId : setSourceEntityId;

  const selectedCalendarPreview = useMemo(() => {
    if (source !== 'calendar') return null;
    return getCalendarReminderNextTriggerFromEntity(
      {
        source: 'calendar',
        calendarEntityId,
        calendarTriggerMode,
        calendarTriggerOffsetMinutes,
      },
      entities,
    );
  }, [source, calendarEntityId, calendarTriggerMode, calendarTriggerOffsetMinutes, entities]);

  const handleSave = () => {
    if (!title.trim() && source === 'manual') return;
    // Auto-generate title for entity/calendar if empty
    let finalTitle = title.trim();
    if (!finalTitle && source === 'calendar') {
      const friendlyName = entities?.[calendarEntityId]?.attributes?.friendly_name || calendarEntityId;
      finalTitle = calendarEventFilter ? `${friendlyName}: ${calendarEventFilter}` : friendlyName;
    }
    if (!finalTitle && source === 'entityState') {
      const friendlyName = entities?.[sourceEntityId]?.attributes?.friendly_name || sourceEntityId;
      finalTitle = `${friendlyName} ${triggerOperator} ${triggerValue}`;
    }

    const data = {
      ...(initial || {}),
      title: finalTitle,
      description: description.trim(),
      source,
      snoozeMinutes,
    };

    if (source === 'manual') {
      data.dueAt = new Date(dueAt).getTime();
      data.recurrence = recurrence;
      data.calendarEntityId = null;
      data.calendarEventFilter = '';
      data.calendarTriggerMode = DEFAULT_CALENDAR_TRIGGER_MODE;
      data.calendarTriggerOffsetMinutes = DEFAULT_CALENDAR_TRIGGER_OFFSET_MINUTES;
      data.sourceEntityId = null;
      data.triggerCondition = null;
    } else if (source === 'calendar') {
      data.calendarEntityId = calendarEntityId;
      data.calendarEventFilter = calendarEventFilter;
      data.calendarTriggerMode = calendarTriggerMode;
      data.calendarTriggerOffsetMinutes = calendarTriggerMode === 'beforeEvent'
        ? Math.max(0, Number(calendarTriggerOffsetMinutes) || DEFAULT_CALENDAR_TRIGGER_OFFSET_MINUTES)
        : 0;
      data.dueAt = initial?.dueAt || Date.now();
      data.recurrence = { type: 'none' };
      data.sourceEntityId = null;
      data.triggerCondition = null;
    } else if (source === 'entityState') {
      data.sourceEntityId = sourceEntityId;
      data.triggerCondition = { operator: triggerOperator, value: triggerValue };
      data.dueAt = initial?.dueAt || Date.now();
      data.recurrence = { type: 'none' };
      data.calendarEntityId = null;
      data.calendarEventFilter = '';
      data.calendarTriggerMode = DEFAULT_CALENDAR_TRIGGER_MODE;
      data.calendarTriggerOffsetMinutes = DEFAULT_CALENDAR_TRIGGER_OFFSET_MINUTES;
    }

    onSave(data);
  };

  const canSave =
    source === 'manual' ? title.trim() :
    source === 'calendar' ? calendarEntityId :
    source === 'entityState' ? sourceEntityId && triggerValue !== '' :
    false;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Source selector */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-2 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.source')}
        </label>
        <div className="flex gap-2">
          {SOURCE_OPTIONS.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setSource(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
                source === key ? 'ring-2 ring-[var(--accent-color)]' : ''
              }`}
              style={{
                backgroundColor: source === key ? 'var(--accent-bg)' : 'var(--glass-bg)',
                color: source === key ? 'var(--accent-color)' : 'var(--text-secondary)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
          {t('reminder.titleLabel')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={source === 'manual' ? t('reminder.titlePlaceholder') : t('reminder.titlePlaceholderAuto')}
          className="w-full px-4 py-2.5 rounded-2xl text-sm"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
          autoFocus={source === 'manual'}
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

      {/* Calendar source fields */}
      {source === 'calendar' && (
        <div className="flex flex-col gap-3 popup-surface rounded-2xl p-3">
          <label className="text-xs font-medium uppercase tracking-widest opacity-60" style={{ color: 'var(--text-secondary)' }}>
            {t('reminder.selectCalendar')}
          </label>
          {/* Entity search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder={t('reminder.searchEntities')}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {/* Entity list */}
          <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
            {filteredEntities.map((id) => (
              <button
                key={id}
                onClick={() => { setSelectedEntityForSource(id); setEntitySearch(''); }}
                className={`text-left px-3 py-2 rounded-xl text-xs transition-all ${
                  selectedEntityForSource === id ? 'ring-2 ring-[var(--accent-color)]' : ''
                }`}
                style={{
                  backgroundColor: selectedEntityForSource === id ? 'var(--accent-bg)' : 'var(--glass-bg)',
                  color: selectedEntityForSource === id ? 'var(--accent-color)' : 'var(--text-primary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <span className="font-medium">{entities?.[id]?.attributes?.friendly_name || id}</span>
                <span className="block opacity-50 text-[10px]">{id}</span>
              </button>
            ))}
            {filteredEntities.length === 0 && (
              <p className="text-xs opacity-50 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.noEntitiesFound')}
              </p>
            )}
          </div>
          {/* Optional event filter */}
          <div>
            <label className="text-xs font-medium opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              {t('reminder.eventFilter')}
            </label>
            <input
              type="text"
              value={calendarEventFilter}
              onChange={(e) => setCalendarEventFilter(e.target.value)}
              placeholder={t('reminder.eventFilterPlaceholder')}
              className="w-full px-4 py-2 rounded-xl text-xs"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium opacity-60" style={{ color: 'var(--text-secondary)' }}>
              {t('reminder.calendarTriggerTiming')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCalendarTriggerMode('atEvent')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  calendarTriggerMode === 'atEvent' ? 'ring-2 ring-[var(--accent-color)]' : ''
                }`}
                style={{
                  backgroundColor: calendarTriggerMode === 'atEvent' ? 'var(--accent-bg)' : 'var(--glass-bg)',
                  color: calendarTriggerMode === 'atEvent' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {t('reminder.calendarTriggerOnEvent')}
              </button>
              <button
                onClick={() => setCalendarTriggerMode('beforeEvent')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  calendarTriggerMode === 'beforeEvent' ? 'ring-2 ring-[var(--accent-color)]' : ''
                }`}
                style={{
                  backgroundColor: calendarTriggerMode === 'beforeEvent' ? 'var(--accent-bg)' : 'var(--glass-bg)',
                  color: calendarTriggerMode === 'beforeEvent' ? 'var(--accent-color)' : 'var(--text-secondary)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {t('reminder.calendarTriggerBeforeEvent')}
              </button>
            </div>
          </div>

          {calendarTriggerMode === 'beforeEvent' && (
            <div>
              <label className="text-xs font-medium opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.calendarBeforeMinutes')}
              </label>
              <div className="flex flex-wrap gap-2">
                {CALENDAR_BEFORE_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setCalendarTriggerOffsetMinutes(mins)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      calendarTriggerOffsetMinutes === mins ? 'ring-2 ring-[var(--accent-color)]' : ''
                    }`}
                    style={{
                      backgroundColor: calendarTriggerOffsetMinutes === mins ? 'var(--accent-bg)' : 'var(--glass-bg)',
                      color: calendarTriggerOffsetMinutes === mins ? 'var(--accent-color)' : 'var(--text-secondary)',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    {mins < 60 ? `${mins}m` : mins < 1440 ? `${mins / 60}h` : '1d'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCalendarPreview?.triggerAt && (
            <p className="text-[11px] opacity-60" style={{ color: 'var(--text-secondary)' }}>
              {t('reminder.nextEstimatedTrigger')}: {new Date(selectedCalendarPreview.triggerAt).toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Entity-state source fields */}
      {source === 'entityState' && (
        <div className="flex flex-col gap-3 popup-surface rounded-2xl p-3">
          <label className="text-xs font-medium uppercase tracking-widest opacity-60" style={{ color: 'var(--text-secondary)' }}>
            {t('reminder.selectEntity')}
          </label>
          {/* Entity search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder={t('reminder.searchEntities')}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs"
              style={{
                backgroundColor: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {/* Entity list */}
          <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
            {filteredEntities.map((id) => {
              const ent = entities?.[id];
              return (
                <button
                  key={id}
                  onClick={() => { setSelectedEntityForSource(id); setEntitySearch(''); }}
                  className={`text-left px-3 py-2 rounded-xl text-xs transition-all ${
                    selectedEntityForSource === id ? 'ring-2 ring-[var(--accent-color)]' : ''
                  }`}
                  style={{
                    backgroundColor: selectedEntityForSource === id ? 'var(--accent-bg)' : 'var(--glass-bg)',
                    color: selectedEntityForSource === id ? 'var(--accent-color)' : 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ent?.attributes?.friendly_name || id}</span>
                    <span className="opacity-50 ml-2">{ent?.state}</span>
                  </div>
                  <span className="block opacity-50 text-[10px]">{id}</span>
                </button>
              );
            })}
            {filteredEntities.length === 0 && (
              <p className="text-xs opacity-50 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.noEntitiesFound')}
              </p>
            )}
          </div>
          {/* Condition editor */}
          {sourceEntityId && (
            <div>
              <label className="text-xs font-medium opacity-60 mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.condition')}
              </label>
              <div className="flex gap-2">
                <select
                  value={triggerOperator}
                  onChange={(e) => setTriggerOperator(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {OPERATOR_OPTIONS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder={t('reminder.conditionValue')}
                  className="flex-1 px-3 py-2 rounded-xl text-xs"
                  style={{
                    backgroundColor: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <p className="mt-2 text-[10px] opacity-50" style={{ color: 'var(--text-secondary)' }}>
                {t('reminder.currentState')}: <strong>{entities?.[sourceEntityId]?.state ?? '—'}</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Due date/time (manual only) */}
      {source === 'manual' && (
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
      )}

      {/* Recurrence (manual only) */}
      {source === 'manual' && (
        <div>
          <label className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            {t('reminder.repeat')}
          </label>
          <RecurrenceEditor rule={recurrence} onChange={setRecurrence} t={t} />
        </div>
      )}

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
          disabled={!canSave}
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

function ReminderListItem({ reminder, onEdit, onDelete, onToggle, t, entities }) {
  const [expanded, setExpanded] = useState(false);
  const isPast = reminder.dueAt < Date.now() && reminder.enabled && reminder.recurrence?.type === 'none' && reminder.source === 'manual';
  const isSnoozed = reminder.snoozedUntil && reminder.snoozedUntil > Date.now();

  const dueDate = new Date(reminder.dueAt);
  const timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dueDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const SourceIcon = reminder.source === 'calendar' ? Calendar : reminder.source === 'entityState' ? Activity : Bell;
  const sourceLabel = reminder.source === 'calendar'
    ? t('reminder.source.calendar')
    : reminder.source === 'entityState'
    ? t('reminder.source.entityState')
    : null;
  const calendarNext = useMemo(
    () => getCalendarReminderNextTriggerFromEntity(reminder, entities),
    [reminder, entities],
  );
  const nextTriggerLabel = useMemo(() => {
    if (!reminder?.enabled) return null;

    if (reminder.source === 'calendar') {
      if (!calendarNext?.triggerAt) return t('reminder.nextWhenAvailable') || 'When available';
      return new Date(calendarNext.triggerAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (reminder.source === 'entityState') {
      return t('reminder.nextWhenCondition') || 'When condition matches';
    }

    if (!Number.isFinite(reminder.dueAt)) return null;
    return new Date(reminder.dueAt).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [reminder, calendarNext, t]);

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
          {reminder.enabled ? <SourceIcon className="w-4 h-4" /> : <SourceIcon className="w-4 h-4 opacity-40" />}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${isPast ? 'line-through opacity-60' : ''}`}
            style={{ color: 'var(--text-primary)' }}
          >
            {reminder.title || t('reminder.untitled')}
          </p>
          <p className="text-xs opacity-50 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            {reminder.source === 'manual' && (
              <>
                <Clock className="w-3 h-3" />
                {dateStr} {timeStr}
              </>
            )}
            {sourceLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-color)' }}>
                {sourceLabel}
              </span>
            )}
            {nextTriggerLabel && (
              <>
                <span>·</span>
                <Clock className="w-3 h-3" />
                {t('reminder.nextEstimatedTrigger')}: {nextTriggerLabel}
              </>
            )}
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
  entities,
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full sm:max-w-md max-h-[85vh] border rounded-t-3xl sm:rounded-3xl md:rounded-[2.5rem] backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col popup-anim"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
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
              entities={entities}
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
                  entities={entities}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
