import { useState, useEffect } from 'react';
import { X, Calendar, Check, ChevronDown, ChevronUp } from '../icons';
import { getCalendarEvents } from '../services';
import { getLocaleForLanguage } from '../i18n';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';

/**
 * CalendarModal - Modal for displaying calendar with selectable calendars
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {(e?: any) => void} props.onClose - Function to close modal
 * @param {Object} props.conn - Home Assistant connection
 * @param {Object} props.entities - All HA entities
 * @param {string} [props.language] - Language code
 * @param {Function} props.t - Translation function
 */
export default function CalendarModal({ show, onClose, conn, entities, language, t }) {
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

  const [selectedCalendars, setSelectedCalendars] = useState(() => {
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
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  useEffect(() => {
    if (show) setShowCalendarPicker(false);
  }, [show]);

  // Fetch events for selected calendars
  useEffect(() => {
    if (!show || !conn || selectedCalendars.length === 0) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setDate(end.getDate() + 30);

        const result = await getCalendarEvents(conn, {
          start,
          end,
          entityIds: selectedCalendars,
        });

        setEvents(result || {});
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [show, conn, selectedCalendars]);

  // Save selection to localStorage
  useEffect(() => {
    if (!show) return;
    try {
      localStorage.setItem('tunet_calendar_modal_selection', JSON.stringify(selectedCalendars));
    } catch (error) {
      console.error('Failed to save calendar selection:', error);
    }
  }, [show, selectedCalendars]);

  const toggleCalendar = (calendarId) => {
    setSelectedCalendars((prev) =>
      prev.includes(calendarId) ? prev.filter((id) => id !== calendarId) : [...prev, calendarId]
    );
  };

  // Group events by date
  const groupedEvents = {};
  Object.entries(events).forEach(([calendarId, data]) => {
    if (!selectedCalendars.includes(calendarId)) return;
    const calendarEvents = data?.events || [];

    calendarEvents.forEach((event) => {
      const startDate = new Date(event.start);
      const dateKey = startDate.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }

      groupedEvents[dateKey].push({
        ...event,
        calendarId,
        calendarName: allCalendars.find((c) => c.id === calendarId)?.name || calendarId,
        calendarColor: getCalendarColor(calendarId),
      });
    });
  });

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => {
    const dateA = groupedEvents[a][0]?.start;
    const dateB = groupedEvents[b][0]?.start;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  if (!show) return null;

  return (
    <AccessibleModalShell
      open={show}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border p-4 font-sans backdrop-blur-xl sm:max-h-[88vh] sm:p-6 md:rounded-[3rem] md:p-10"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
          <button
            onClick={onClose}
            className="modal-close absolute top-6 right-6 z-20 md:top-10 md:right-10"
            aria-label={translate('common.close')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 pr-12 font-sans sm:mb-7">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="rounded-2xl bg-[var(--accent-bg)] p-3 text-[var(--accent-color)] transition-all duration-500 sm:p-4">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0">
                <h3
                  id={modalTitleId}
                  className="truncate text-xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic sm:text-2xl"
                >
                  {translate('calendar.title')}
                </h3>
                <p className="mt-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase italic">
                  {translate('calendar.selectedCount').replace(
                    '{count}',
                    String(selectedCalendars.length)
                  )}
                </p>
              </div>
            </div>
            {allCalendars.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCalendarPicker((current) => !current)}
                aria-expanded={showCalendarPicker}
                aria-controls="calendar-picker-panel"
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors ${showCalendarPicker ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                {showCalendarPicker
                  ? translate('common.hide')
                  : translate('calendar.selectCalendars')}
                {showCalendarPicker ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Main Content */}
          <div
            className={`grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden transition-[grid-template-columns] duration-300 ${showCalendarPicker ? 'grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_17rem] lg:grid-rows-1' : 'grid-rows-1 lg:grid-cols-1'}`}
          >
            {/* Calendar Events */}
            <div className="scrollbar-hide min-h-0 overflow-y-auto pr-1 sm:pr-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <p className="text-sm tracking-widest text-[var(--text-secondary)] uppercase">
                    {translate('common.loading')}
                  </p>
                </div>
              ) : sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Calendar className="mb-4 h-16 w-16 text-[var(--text-muted)] opacity-30" />
                  <p className="text-sm tracking-widest text-[var(--text-secondary)] uppercase">
                    {translate('calendar.noEvents')}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {sortedDates.map((dateKey) => (
                    <div key={dateKey}>
                      <h4 className="sticky top-0 z-10 mb-4 bg-[var(--modal-bg)] py-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                        {dateKey}
                      </h4>
                      <div className="space-y-3">
                        {groupedEvents[dateKey]
                          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                          .map((event, idx) => {
                            const startTime = new Date(event.start);
                            const isAllDay = isAllDayEvent(event);
                            const isPast = isEventFinishedToday(event);

                            return (
                              <div
                                key={`${event.calendarId}-${idx}`}
                                data-past-event={isPast ? 'true' : 'false'}
                                className={`group flex items-start gap-3 rounded-2xl px-2 py-3 transition-all sm:gap-4 sm:px-3 ${isPast ? 'opacity-40 saturate-50 hover:opacity-60' : 'hover:bg-[var(--glass-bg)]'}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-baseline justify-between gap-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <div className="min-w-[3rem] flex-shrink-0 text-right">
                                        {isAllDay ? (
                                          <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                                            {translate('calendar.allDayShort')}
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
                                      <h5 className="truncate leading-tight font-medium text-[var(--text-primary)]">
                                        {event.summary}
                                      </h5>
                                    </div>
                                  </div>
                                  {(event.description || event.location) && (
                                    <div className="mt-1 pl-[4.5rem] text-xs text-[var(--text-secondary)] opacity-70">
                                      {event.location && (
                                        <span className="mr-3 font-medium">
                                          📍 {event.location}
                                        </span>
                                      )}
                                      {event.description && (
                                        <span className="line-clamp-1">{event.description}</span>
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
                className="popup-surface scrollbar-hide order-first max-h-64 min-h-0 overflow-y-auto rounded-3xl border border-[var(--glass-border)] p-4 lg:order-last lg:max-h-none"
              >
                <div className="space-y-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-70">
                      {translate('calendar.selectCalendars')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCalendars.length === allCalendars.length) {
                          setSelectedCalendars([]);
                        } else {
                          setSelectedCalendars(allCalendars.map((c) => c.id));
                        }
                      }}
                      className="text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase transition-colors hover:text-[var(--accent-color)]"
                    >
                      {selectedCalendars.length === allCalendars.length
                        ? translate('calendar.removeAll')
                        : translate('calendar.selectAll')}
                    </button>
                  </div>

                  {allCalendars.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[var(--text-muted)] italic">
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
          </div>
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </>
      )}
    </AccessibleModalShell>
  );
}

function isAllDayEvent(event) {
  return typeof event?.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.start);
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
