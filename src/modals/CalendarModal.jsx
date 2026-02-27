import { useState, useEffect } from 'react';
import { X, Calendar, Check } from '../icons';
import { getCalendarEvents } from '../services';
import { getLocaleForLanguage } from '../i18n';

/**
 * CalendarModal - Modal for displaying calendar with selectable calendars
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether modal is visible
 * @param {Function} props.onClose - Function to close modal
 * @param {Object} props.conn - Home Assistant connection
 * @param {Object} props.entities - All HA entities
 * @param {Function} props.t - Translation function
 */
export default function CalendarModal({ show, onClose, conn, entities, language, t }) {
  const translate = t || ((key) => key);
  const locale = getLocaleForLanguage(language);

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
    return new Date(dateA) - new Date(dateB);
  });

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="popup-anim relative flex max-h-[70vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border p-6 font-sans backdrop-blur-xl md:rounded-[3rem] md:p-12"
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
          borderColor: 'var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="modal-close absolute top-6 right-6 z-20 md:top-10 md:right-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4 font-sans">
          <div className="rounded-2xl bg-[var(--accent-bg)] p-4 text-[var(--accent-color)] transition-all duration-500">
            <Calendar className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic">
              {translate('calendar.title')}
            </h3>
            <div
              className="mt-2 inline-block rounded-full border px-3 py-1 transition-all duration-500"
              style={{
                backgroundColor: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <p className="text-[10px] font-bold tracking-widest uppercase italic">
                {translate('calendar.selectedCount').replace(
                  '{count}',
                  String(selectedCalendars.length)
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid flex-1 grid-cols-1 gap-8 overflow-hidden lg:grid-cols-4">
          {/* Left Column - Calendar Events (Span 3) */}
          <div className="scrollbar-hide overflow-y-auto pr-4 lg:col-span-3">
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
                        .sort((a, b) => new Date(a.start) - new Date(b.start))
                        .map((event, idx) => {
                          const startTime = new Date(event.start);
                          const isAllDay = event.start.length === 10; // Date only, no time

                          return (
                            <div
                              key={`${event.calendarId}-${idx}`}
                              className="flex items-start gap-4 border-b border-[var(--glass-border)] py-3 pr-2 transition-opacity last:border-0 hover:opacity-80"
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
                                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
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
                                      <span className="mr-3 font-medium">📍 {event.location}</span>
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

          {/* Right Column - Calendar Selection (Span 1) */}
          <div className="scrollbar-hide overflow-y-auto lg:col-span-1">
            <div className="space-y-3">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                  {translate('calendar.selectCalendars')}
                </h4>
                <button
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
                      onClick={() => toggleCalendar(calendar.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-4 transition-all ${
                        isSelected
                          ? 'popup-surface-hover border border-[var(--glass-border)]'
                          : 'popup-surface hover:bg-[var(--glass-bg-hover)]'
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
          </div>
        </div>
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
    </div>
  );
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
