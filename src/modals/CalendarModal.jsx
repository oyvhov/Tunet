import { useState, useEffect } from 'react';
import { Calendar, Check, ChevronDown, ChevronUp } from '../icons';
import { getCalendarEvents } from '../services';
import { getLocaleForLanguage } from '../i18n';
import { useRefreshTick } from '../hooks/useRefreshTick';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader } from '../components/ui/ModalParts';
import Button from '../components/ui/Button';

const DAYS_FETCHED = 30;
const MAX_LISTED_DAYS = DAYS_FETCHED + 1;

/**
 * CalendarModal - Modal for displaying calendar with selectable calendars
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {(e?: any) => void} props.onClose - Function to close modal
 * @param {Object} props.conn - Home Assistant connection
 * @param {Object} props.entities - All HA entities
 * @param {string} [props.language] - Language code
 * @param {string[]} [props.cardCalendars] - Calendars of the card the popup was opened from
 * @param {Function} props.t - Translation function
 */
export default function CalendarModal({
  show,
  onClose,
  conn,
  entities,
  language,
  cardCalendars,
  t,
}) {
  const translate = t || ((key) => key);
  const locale = getLocaleForLanguage(language);
  const modalTitleId = 'calendar-modal-title';

  // Get all calendar entities
  const allCalendars = Object.keys(entities || {})
    .filter((id) => id.startsWith('calendar.'))
    .map((id) => ({
      id,
      name: entities[id]?.attributes?.friendly_name || id,
      color: getCalendarColor(id),
    }));

  const fromCard = Array.isArray(cardCalendars) && cardCalendars.length > 0;

  const [selectedCalendars, setSelectedCalendars] = useState(() => {
    if (fromCard) return cardCalendars;
    const stored = localStorage.getItem('tunet_calendar_modal_selection');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return allCalendars.map((c) => c.id);
      }
    }
    return allCalendars.map((c) => c.id);
  });

  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const refreshTick = useRefreshTick(conn, { enabled: Boolean(show) });

  useEffect(() => {
    if (show) setShowCalendarPicker(false);
  }, [show]);

  // Fetch events for selected calendars
  useEffect(() => {
    if (selectedCalendars.length === 0) setLoadFailed(false);
    if (!show || !conn || selectedCalendars.length === 0) return;

    let cancelled = false;
    const fetchEvents = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(end.getDate() + DAYS_FETCHED);

        const result = await getCalendarEvents(conn, {
          start,
          end,
          entityIds: selectedCalendars,
        });

        if (!cancelled) setEvents(result || {});
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [show, conn, selectedCalendars, refreshTick]);

  // Save selection to localStorage; a card keeps its calendars in its own settings
  useEffect(() => {
    if (!show || fromCard) return;
    try {
      localStorage.setItem('tunet_calendar_modal_selection', JSON.stringify(selectedCalendars));
    } catch (error) {
      console.error('Failed to save calendar selection:', error);
    }
  }, [show, fromCard, selectedCalendars]);

  const toggleCalendar = (calendarId) => {
    setSelectedCalendars((prev) =>
      prev.includes(calendarId) ? prev.filter((id) => id !== calendarId) : [...prev, calendarId]
    );
  };

  // Group events under every day they cover
  const groupedEvents = {};
  const dayTimes = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  Object.entries(events).forEach(([calendarId, data]) => {
    if (!selectedCalendars.includes(calendarId)) return;
    const calendarEvents = data?.events || [];

    calendarEvents.forEach((event) => {
      getEventDays(event, today).forEach((day) => {
        const dateKey = day.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        if (!groupedEvents[dateKey]) {
          groupedEvents[dateKey] = [];
          dayTimes[dateKey] = day.getTime();
        }

        groupedEvents[dateKey].push({
          ...event,
          calendarId,
          calendarName: allCalendars.find((c) => c.id === calendarId)?.name || calendarId,
          calendarColor: getCalendarColor(calendarId),
        });
      });
    });
  });

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => dayTimes[a] - dayTimes[b]);

  if (!show) return null;

  return (
    <AccessibleModalShell open={show} onClose={onClose} titleId={modalTitleId} size="l">
      {() => (
        <>
          <ModalHeader
            title={translate('calendar.title')}
            closeLabel={translate('common.close')}
            onClose={onClose}
            icon={<Calendar />}
            iconClassName="bg-[var(--accent-bg)] text-[var(--accent-color)]"
            subtitle={translate('calendar.selectedCount').replace(
              '{count}',
              String(selectedCalendars.length)
            )}
            actions={
              allCalendars.length > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCalendarPicker((current) => !current)}
                  aria-expanded={showCalendarPicker}
                  aria-controls="calendar-picker-panel"
                  aria-label={
                    showCalendarPicker
                      ? translate('common.hide')
                      : translate('calendar.selectCalendars')
                  }
                >
                  {/* Phones get the icon only, so a long label never pushes out the close button. */}
                  <Calendar className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {showCalendarPicker
                      ? translate('common.hide')
                      : translate('calendar.selectCalendars')}
                  </span>
                  {showCalendarPicker ? <ChevronUp /> : <ChevronDown />}
                </Button>
              ) : null
            }
          />

          <ModalBody
            className={
              showCalendarPicker
                ? 'grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start'
                : ''
            }
          >
            {/* Calendar Events */}
            <div className="min-w-0">
              {loadFailed && !loading && (
                <p role="alert" className="mb-4 text-center text-sm text-[var(--status-error-fg)]">
                  {translate('calendar.loadFailed')}
                </p>
              )}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm tracking-widest text-[var(--text-secondary)] uppercase">
                    {translate('common.loading')}
                  </p>
                </div>
              ) : sortedDates.length === 0 ? (
                !loadFailed && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Calendar className="mb-4 h-16 w-16 text-[var(--text-muted)] opacity-30" />
                    <p className="text-sm tracking-widest text-[var(--text-secondary)] uppercase">
                      {translate('calendar.noEvents')}
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {sortedDates.map((dateKey) => (
                    <div key={dateKey} className="flex flex-col gap-2">
                      <h4 className="modal-section-label sticky top-0 z-10 block w-full rounded-xl bg-[var(--modal-bg)] px-2 py-2 sm:px-3">
                        {dateKey}
                      </h4>
                      <div className="space-y-1">
                        {groupedEvents[dateKey]
                          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                          .map((event, idx) => {
                            const startTime = new Date(event.start);
                            const isAllDay = isAllDayEvent(event) || spansSeveralDays(event);
                            const isPast = isEventFinishedToday(event);

                            return (
                              <div
                                key={`${event.calendarId}-${idx}`}
                                data-past-event={isPast ? 'true' : 'false'}
                                className={`group flex items-start gap-3 rounded-2xl px-2 py-3 transition-all sm:gap-4 sm:px-3 ${isPast ? 'opacity-40 saturate-50 hover:opacity-60' : 'hover:bg-[var(--glass-bg)]'}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="min-w-14 flex-shrink-0 text-right whitespace-nowrap">
                                      {isAllDay ? (
                                        <span className="text-[11px] leading-tight font-bold tracking-[0.08em] text-[var(--text-secondary)] uppercase">
                                          {translate('calendar.allDay')}
                                        </span>
                                      ) : (
                                        <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                                          {startTime.toLocaleTimeString(locale, {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </p>
                                      )}
                                    </div>
                                    <div
                                      className="h-8 w-1 flex-shrink-0 rounded-full opacity-80"
                                      style={{ backgroundColor: event.calendarColor }}
                                    />
                                    <h5 className="min-w-0 truncate leading-tight font-medium text-[var(--text-primary)]">
                                      {event.summary}
                                    </h5>
                                  </div>
                                  {(event.description || event.location) && (
                                    <div className="mt-1 pl-[5.25rem] text-xs text-[var(--text-secondary)]">
                                      {event.location && (
                                        <span className="block font-medium break-words">
                                          📍 {event.location}
                                        </span>
                                      )}
                                      {event.description && (
                                        <span className="line-clamp-2 [overflow-wrap:anywhere]">
                                          {event.description}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calendar Selection */}
            {showCalendarPicker && (
              <aside
                id="calendar-picker-panel"
                className="popup-surface order-first rounded-[var(--modal-surface-radius)] p-4 lg:sticky lg:top-0 lg:order-last"
              >
                <div className="space-y-2">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="modal-section-label">{translate('calendar.selectCalendars')}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCalendars.length === allCalendars.length) {
                          setSelectedCalendars([]);
                        } else {
                          setSelectedCalendars(allCalendars.map((c) => c.id));
                        }
                      }}
                      className="text-[11px] font-bold tracking-[0.08em] text-[var(--accent-color)] uppercase transition-colors hover:text-[var(--accent-color)]"
                    >
                      {selectedCalendars.length === allCalendars.length
                        ? translate('calendar.removeAll')
                        : translate('calendar.selectAll')}
                    </button>
                  </div>

                  {allCalendars.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                      {translate('calendar.noCalendarsFound')}
                    </p>
                  ) : (
                    allCalendars.map((calendar) => {
                      const isSelected = selectedCalendars.includes(calendar.id);
                      return (
                        <button
                          key={calendar.id}
                          type="button"
                          onClick={() => toggleCalendar(calendar.id)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 transition-all ${
                            isSelected
                              ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)]'
                              : 'border-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)]'
                          }`}
                        >
                          <div
                            className="h-4 w-4 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                          />
                          <span className="flex-1 truncate text-left text-sm font-medium text-[var(--text-primary)]">
                            {calendar.name}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 flex-shrink-0 text-[var(--accent-color)]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
            )}
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}

function isAllDayEvent(event) {
  return typeof event?.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.start);
}

/** A date-only value is a day in local time, where new Date() would read it as UTC. */
function parseEventDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The last instant the event covers. An end is exclusive, so midnight belongs to the day before. */
function getLastMoment(event, start) {
  const end = parseEventDate(event.end);
  return end && end > start ? new Date(end.getTime() - 1) : start;
}

/** Every listed day the event touches; one that is already running starts today. */
function getEventDays(event, today) {
  const start = parseEventDate(event.start);
  if (!start) return [];
  const last = getLastMoment(event, start);
  const first = start < today ? today : start;
  const day = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const days = [];
  while (day <= last && days.length < MAX_LISTED_DAYS) {
    days.push(new Date(day));
    day.setDate(day.getDate() + 1);
  }
  return days;
}

function spansSeveralDays(event) {
  const start = parseEventDate(event.start);
  return !!start && getLastMoment(event, start).toDateString() !== start.toDateString();
}

function isEventFinishedToday(event, now = new Date()) {
  if (!event?.start || isAllDayEvent(event)) return false;

  const start = new Date(event.start);
  const end = new Date(event.end || event.start);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  const startsToday =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();

  return startsToday && end.getTime() <= now.getTime();
}

// Generate consistent colors for calendars
function getCalendarColor(calendarId) {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
  ];

  let hash = 0;
  for (let i = 0; i < calendarId.length; i++) {
    hash = calendarId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
