import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, AlertCircle } from 'lucide-react';
import { getCalendarEvents } from '../services/haClient';

class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Calendar error' };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('CalendarCard crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] p-5 text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Calendar error</span>
          </div>
          <p className="text-xs mt-2 opacity-80">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function CalendarCard({ 
  cardId, 
  settings, 
  conn, 
  t, 
  className,
  style,
  dragProps,
  getControls,
  onClick,
  isEditMode
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Parse check status (user said "Det skal hukast av når kortet blir valgt")
  // So settings.calendars = ['calendar.personal', 'calendar.work']
  const selectedCalendars = settings?.calendars || [];

  const getEventDate = (eventDate) => {
      try {
        if (!eventDate) return new Date(0);
        const value = eventDate.dateTime || eventDate.date || eventDate;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? new Date(0) : date;
      } catch (e) {
        return new Date(0);
      }
  };

  useEffect(() => {
    if (!conn) return;
    
    if (selectedCalendars.length === 0) {
      setEvents([]);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 7); // Fetch next 7 days

        const result = await getCalendarEvents(conn, {
          start,
          end,
          entityIds: selectedCalendars
        });

        if (!result) {
            setEvents([]);
            return;
        }

        // Merge all events from all calendars
        let allEvents = [];
        Object.values(result).forEach(calendarEvents => {
          if (calendarEvents && Array.isArray(calendarEvents.events)) {
            allEvents = [...allEvents, ...calendarEvents.events];
          }
        });

        // Remove events without start info
        allEvents = allEvents.filter(evt => evt && evt.start);

        // Sort by start time
        allEvents.sort((a, b) => getEventDate(a.start) - getEventDate(b.start));
        setEvents(allEvents);
      } catch (err) {
        console.error("Failed to fetch calendar events", err);
        setError(err.message || "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // Refresh every 15 minutes
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [conn, JSON.stringify(selectedCalendars)]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups = {};
    events.forEach(event => {
      const date = getEventDate(event.start);
      // Format: YYYY-MM-DD for grouping
      const key = date.toLocaleDateString('sv-SE'); // ISO-like date part
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    });
    return groups;
  }, [events]);

  const formatDateHeader = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return t('calendar.today') || 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return t('calendar.tomorrow') || 'Tomorrow';
    
    // Format: "Monday 26. Jan"
    return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const formatEventTime = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('nb-NO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  const getEventDateValue = (value) => {
    if (!value) return null;
    if (typeof value === 'string' || typeof value === 'number') return value;
    return value.dateTime || value.date_time || value.date || null;
  };

  const isAllDayValue = (value) => {
    if (!value) return false;
    if (typeof value === 'string') return value.length === 10;
    return !!value.date && !value.dateTime && !value.date_time;
  };

  return (
    <div 
      {...dragProps} 
      data-haptic={isEditMode ? undefined : 'card'}
      onClick={onClick}
      className={`touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 ${className}`}
      style={style}
    >
      {getControls && getControls(cardId)}
      
      {/* Header */}
      <div className="p-5 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-blue-500/10 text-blue-400`}>
                <CalendarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                {settings?.name || t('calendar.title') || 'Calendar'}
            </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 pt-0 hide-scrollbar space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {selectedCalendars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
                <CalendarIcon className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest">{t('calendar.selectCalendars') || 'Select Calendars'}</p>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest text-center px-4">{error}</p>
            </div>
        ) : loading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-xs uppercase font-bold tracking-widest">{t('common.loading') || 'Loading...'}</p>
            </div>
        ) : events.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
                <Clock className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest">{t('calendar.noEvents') || 'No upcoming events'}</p>
            </div>
        ) : (
            Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-1">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest py-1 mb-1">
                        {formatDateHeader(dateKey)}
                    </h4>
                    <div className="space-y-3">
                        {dayEvents.map((evt, idx) => {
                          if (!evt || !evt.start) return null;
                          const startRaw = getEventDateValue(evt.start);
                          const start = startRaw ? new Date(startRaw) : null; 
                          const endRaw = getEventDateValue(evt.end);
                          const end = endRaw ? new Date(endRaw) : null;
                          
                          const startTime = formatEventTime(start);
                          const endTime = formatEventTime(end);

                          const isAllDay = isAllDayValue(evt.start);
                          const timeString = isAllDay ? 'Heile dagen' : (startTime ? `${startTime}${endTime ? ` - ${endTime}` : ''}` : '');
                           
                           return (
                           <div key={`${evt.uid || evt.id || evt.summary || 'event'}-${idx}`} className="flex gap-4 group items-start">
                                <div className="flex flex-col items-center pt-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isAllDay ? 'bg-blue-400' : 'bg-[var(--glass-border)] group-hover:bg-blue-400 transition-colors'}`} />
                                    <div className="w-0.5 h-full bg-[var(--glass-border)]/50 my-1 -mb-4 group-last:hidden" />
                                </div>
                                <div className="flex-1 pb-1">
                                    {timeString && (
                                        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5">
                                        {timeString}
                                        </p>
                                    )}
                                    <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-transparent bg-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors">
                                      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isAllDay ? 'bg-blue-400/70' : 'bg-[var(--glass-border)] group-hover:bg-blue-400/70 transition-colors'}`} />
                                      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                                        {evt.summary}
                                      </p>
                                      {evt.location && (
                                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[var(--text-secondary)]">
                                          <MapPin className="w-3 h-3" />
                                          <span className="truncate opacity-80">{evt.location}</span>
                                        </div>
                                      )}
                                      {evt.description && (
                                        <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 line-clamp-1 opacity-60">
                                          {evt.description}
                                        </p>
                                      )}
                                    </div>
                                </div>
                            </div>
                           );
                        })}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default function CalendarCardWithBoundary(props) {
  return (
    <CalendarErrorBoundary>
      <CalendarCard {...props} />
    </CalendarErrorBoundary>
  );
}
