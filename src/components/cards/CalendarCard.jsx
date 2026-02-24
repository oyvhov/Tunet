import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, AlertCircle } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { getCalendarEvents } from '../../services/haClient';

class CalendarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Calendar error' };
  }

  componentDidCatch(error, info) {
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
  locale = 'nb-NO',
  className,
  style,
  dragProps,
  getControls,
  onClick,
  isEditMode,
  size,
  iconName,
  customName
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleDays, setVisibleDays] = useState(7);
  const cardRef = useRef(null);
  const gridScrollRef = useRef(null);

  // Parse check status ("It should be checked when the card is selected")
  // So settings.calendars = ['calendar.personal', 'calendar.work']
  const selectedCalendars = useMemo(() => (Array.isArray(settings?.calendars) ? settings.calendars : []), [settings?.calendars]);
  const selectedCalendarsKey = useMemo(() => selectedCalendars.join('|'), [selectedCalendars]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Adapt visible day count based on card width
  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || 0;
      if (w < 300) setVisibleDays(2);
      else if (w < 500) setVisibleDays(4);
      else setVisibleDays(7);
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, []);

  const getEventDate = (eventDate) => {
      try {
        if (!eventDate) return new Date(0);
        const value = eventDate.dateTime || eventDate.date || eventDate;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? new Date(0) : date;
      } catch {
        return new Date(0);
      }
  };

  useEffect(() => {
    if (!conn) return;
    
    if (selectedCalendars.length === 0 || !isVisible) {
      if (!isVisible && selectedCalendars.length > 0) return;
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

    let idleId;
    let timerId;

    // Initial fetch with idle/stagger preference to avoid main thread blocking
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => fetchEvents(), { timeout: 4000 });
    } else {
      timerId = setTimeout(() => fetchEvents(), Math.random() * 500);
    }

    // Refresh every 15 minutes
    const interval = setInterval(() => fetchEvents(), 15 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [conn, selectedCalendars, selectedCalendarsKey, isVisible]);

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
    // dateStr is YYYY-MM-DD from sv-SE locale (local time)
    // Create date as local time components to avoid UTC shift issues
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d); // Local time 00:00:00
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return t('calendar.today') || 'Today';
    if (date.getTime() === tomorrow.getTime()) return t('calendar.tomorrow') || 'Tomorrow';
    
    // Format: "Monday 26. Jan"
    return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const formatEventTime = (date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(locale, { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: locale === 'en-US' 
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

  const IconComp = iconName ? (getIconComponent(iconName) || CalendarIcon) : CalendarIcon;
  const displayName = customName || settings?.name || t('calendar.title') || 'Calendar';
  const isSmall = size === 'small';
  const isLarge = !!settings?.largeCalendar;

  const HOUR_HEIGHT = 48;
  const START_HOUR = 0;

  // Auto-scroll week grid to current hour on mount
  useEffect(() => {
    if (isLarge && gridScrollRef.current && events.length > 0) {
      const now = new Date();
      const scrollTo = Math.max(0, (now.getHours() - 1 - START_HOUR) * HOUR_HEIGHT);
      gridScrollRef.current.scrollTop = scrollTo;
    }
  }, [isLarge, events.length]);

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d.toLocaleDateString('sv-SE'));
    }
    return days;
  }, []);

  const nextEvent = events.length > 0 ? events[0] : null;
  const nextEventTitle = nextEvent
    ? (nextEvent.summary || nextEvent.title || nextEvent.description || t('calendar.noEvents') || 'Event')
    : '';
  const nextEventStartRaw = nextEvent ? getEventDateValue(nextEvent.start) : null;
  const nextEventStart = nextEventStartRaw ? new Date(nextEventStartRaw) : null;
  const nextEventEndRaw = nextEvent ? getEventDateValue(nextEvent.end) : null;
  const nextEventEnd = nextEventEndRaw ? new Date(nextEventEndRaw) : null;
  const nextEventStartTime = formatEventTime(nextEventStart);
  const nextEventEndTime = formatEventTime(nextEventEnd);
  const nextIsAllDay = nextEvent ? isAllDayValue(nextEvent.start) : false;
  const nextTimeString = nextEvent
    ? (nextIsAllDay
        ? (nextEventStart ? formatDateHeader(nextEventStart.toLocaleDateString('sv-SE')) : t('calendar.allDay'))
        : (nextEventStartTime ? `${nextEventStartTime}${nextEventEndTime ? ` - ${nextEventEndTime}` : ''}` : ''))
    : '';

  if (isSmall) {
    return (
      <div 
        ref={cardRef}
        {...dragProps} 
        data-haptic={isEditMode ? undefined : 'card'}
        onClick={onClick}
        className={`glass-texture touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex items-center p-4 pl-5 gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 group ${className}`}
        style={style}
      >
        {getControls && getControls(cardId)}
        <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[var(--glass-bg)] text-[var(--text-secondary)]">
          <IconComp className="w-6 h-6 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
        </div>
        
        <div className="flex flex-col min-w-0 justify-center">
             {!selectedCalendars.length ? (
                <p className="text-xs uppercase font-bold tracking-widest opacity-60 text-[var(--text-secondary)] truncate">{t('calendar.selectCalendars') || 'Select Calendars'}</p>
            ) : loading && events.length === 0 ? (
                <p className="text-xs uppercase font-bold tracking-widest opacity-60 text-[var(--text-secondary)] truncate">{t('common.loading') || 'Loading...'}</p>
            ) : !nextEvent ? (
                <>
                <p className="text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 truncate leading-none mb-1.5">{displayName}</p>
                <p className="text-sm font-bold text-[var(--text-primary)] leading-none opacity-80 truncate">{t('calendar.noEvents') || 'No events'}</p>
                </>
            ) : (
                <>
                   <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs tracking-widest uppercase font-bold opacity-60 leading-tight mb-1.5 min-w-0 flex-wrap">
                     <span>{nextTimeString}</span>
                     {!nextIsAllDay && nextEventStart && (
                        <span>
                          {formatDateHeader(nextEventStart.toLocaleDateString('sv-SE')) !== (t('calendar.today') || 'Today') && 
                           `• ${formatDateHeader(nextEventStart.toLocaleDateString('sv-SE'))}`}
                        </span>
                     )}
                   </div>
                   <p className="text-sm font-bold text-[var(--text-primary)] leading-tight line-clamp-2">
                     {nextEventTitle}
                   </p>
                </>
            )}
        </div>
      </div>
    );
  }

  if (isLarge) {
    const END_HOUR = 24;
    const TOTAL_HOURS = END_HOUR - START_HOUR;
    const GUTTER_W = 'w-12';

    const formatShortDay = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        dayName: date.toLocaleDateString(locale, { weekday: 'short' }),
        dayNum: d,
        isToday: date.getTime() === today.getTime(),
      };
    };

    const getTimePosition = (date) => {
      if (!date) return 0;
      return ((date.getHours() - START_HOUR) + date.getMinutes() / 60) * HOUR_HEIGHT;
    };

    const getEventBlock = (evt) => {
      const startRaw = getEventDateValue(evt.start);
      const endRaw = getEventDateValue(evt.end);
      const start = startRaw ? new Date(startRaw) : null;
      const end = endRaw ? new Date(endRaw) : null;
      if (!start) return null;
      const top = Math.max(0, getTimePosition(start));
      const duration = end ? (end - start) / 3600000 : 1;
      const height = Math.max(20, duration * HOUR_HEIGHT);
      return { top, height, start, end };
    };

    const weekData = weekDays.slice(0, visibleDays).map((dateKey) => {
      const dayEvts = groupedEvents[dateKey] || [];
      const allDay = [];
      const timed = [];
      dayEvts.forEach(evt => {
        if (isAllDayValue(evt.start)) allDay.push(evt);
        else timed.push(evt);
      });
      return { dateKey, allDay, timed, ...formatShortDay(dateKey) };
    });

    const hasAnyAllDay = weekData.some(d => d.allDay.length > 0);

    const now = new Date();
    const nowDateKey = now.toLocaleDateString('sv-SE');
    const nowTop = getTimePosition(now);

    const hours = [];
    for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);

    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={isEditMode ? undefined : 'card'}
        onClick={onClick}
        className={`glass-texture touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 group ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
        style={style}
      >
        {getControls && getControls(cardId)}

        {/* Header */}
        <div className="px-5 pt-4 pb-1 flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-[var(--accent-bg)] text-[var(--accent-color)]">
            <IconComp className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <h3 className="text-base font-medium text-[var(--text-primary)] tracking-tight">
            {displayName}
          </h3>
        </div>

        {selectedCalendars.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
            <IconComp className="w-8 h-8 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest">{t('calendar.selectCalendars') || 'Select Calendars'}</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-400">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest text-center px-4">{error}</p>
          </div>
        ) : loading && events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-color)] mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest">{t('common.loading') || 'Loading...'}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Day column headers */}
            <div className="flex shrink-0 px-2 pb-1">
              <div className={GUTTER_W + ' shrink-0'} />
              {weekData.map(({ dateKey, dayName, dayNum, isToday }) => (
                <div key={dateKey} className={`flex-1 text-center py-1 rounded-lg ${isToday ? 'bg-[var(--accent-bg)]' : ''}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest leading-none ${isToday ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)] opacity-50'}`}>
                    {dayName}
                  </p>
                  <p className={`text-base font-semibold leading-none mt-1 ${isToday ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}>
                    {dayNum}
                  </p>
                </div>
              ))}
            </div>

            {/* All-day events banner */}
            {hasAnyAllDay && (
              <div className="flex shrink-0 px-2 pb-1 border-b border-[var(--glass-border)]/30">
                <div className={GUTTER_W + ' shrink-0 flex items-center justify-end pr-1.5'}>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-40 uppercase">{t('calendar.allDay') || 'All day'}</span>
                </div>
                {weekData.map(({ dateKey, allDay }) => (
                  <div key={dateKey} className="flex-1 px-0.5 space-y-0.5 min-h-[1.25rem]">
                    {allDay.map((evt, idx) => (
                      <div key={`ad-${idx}`} className="px-1 py-0.5 rounded bg-[var(--accent-bg)] border-l-2 border-[var(--accent-color)] truncate">
                        <p className="text-xs font-medium text-[var(--accent-color)] leading-tight truncate">{evt.summary}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Scrollable time grid */}
            <div
              ref={gridScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-2 hide-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
              <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                {/* Time gutter with hour labels */}
                <div className={GUTTER_W + ' shrink-0 relative'}>
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute right-0 pr-1.5 flex items-start"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <span className="text-xs font-bold text-[var(--text-secondary)] opacity-40 leading-none -mt-[5px]">
                        {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekData.map(({ dateKey, timed }) => (
                  <div key={dateKey} className="flex-1 relative border-l border-[var(--glass-border)]/20">
                    {/* Hour grid lines */}
                    {hours.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-[var(--glass-border)]/15"
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Now indicator */}
                    {dateKey === nowDateKey && (
                      <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: nowTop }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-[3px]" />
                        <div className="flex-1 h-[1.5px] bg-red-500/70" />
                      </div>
                    )}

                    {/* Event blocks */}
                    {timed.map((evt, idx) => {
                      const block = getEventBlock(evt);
                      if (!block) return null;
                      const timeStr = formatEventTime(block.start);
                      return (
                        <div
                          key={`${evt.uid || evt.id || evt.summary || 'evt'}-${idx}`}
                          className="absolute left-0.5 right-0.5 rounded-md bg-[var(--accent-bg)] border-l-2 border-[var(--accent-color)] overflow-hidden z-10 hover:bg-[var(--accent-bg)] transition-colors"
                          style={{ top: block.top, height: Math.max(block.height, 18) }}
                        >
                          <div className="px-1 py-0.5 h-full">
                            {block.height >= 28 && timeStr && (
                              <p className="text-[11px] font-bold text-[var(--accent-color)] leading-none truncate">
                                {timeStr}
                              </p>
                            )}
                            <p className="text-xs font-medium text-[var(--text-primary)] leading-tight line-clamp-2 mt-px">
                              {evt.summary}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      {...dragProps} 
      data-haptic={isEditMode ? undefined : 'card'}
      onClick={onClick}
      className={`glass-texture touch-feedback relative overflow-hidden font-sans h-full rounded-3xl flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl transition-all duration-300 group ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
      style={style}
    >
      {getControls && getControls(cardId)}
      
        {/* Header */}
        <div className="p-5 pb-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-[var(--accent-bg)] text-[var(--accent-color)]`}>
                  <IconComp className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                {displayName}
              </h3>
          </div>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 pt-0 hide-scrollbar space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {selectedCalendars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
                <IconComp className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest">{t('calendar.selectCalendars') || 'Select Calendars'}</p>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-xs uppercase font-bold tracking-widest text-center px-4">{error}</p>
            </div>
        ) : loading && events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-color)] mb-2"></div>
                <p className="text-xs uppercase font-bold tracking-widest">{t('common.loading') || 'Loading...'}</p>
            </div>
        ) : events.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-60">
                <Clock className="w-8 h-8 mb-2" />
            <p className="text-xs uppercase font-bold tracking-widest text-center px-3 leading-relaxed">{t('calendar.noEvents') || 'No upcoming events'}</p>
            </div>
        ) : (
            Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-1">
                    <h4 className="text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-widest py-1 mb-1">
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
                          const timeString = isAllDay ? t('calendar.allDay') : (startTime ? `${startTime}${endTime ? ` - ${endTime}` : ''}` : '');
                           
                           return (
                           <div key={`${evt.uid || evt.id || evt.summary || 'event'}-${idx}`} className="flex gap-4 group items-start">
                                <div className="flex flex-col items-center pt-1.5">
                                    <div className={`w-2 h-2 rounded-full ${isAllDay ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-border)] group-hover:bg-[var(--accent-color)] transition-colors'}`} />
                                    <div className="w-0.5 h-full bg-[var(--glass-border)]/50 my-1 -mb-4 group-last:hidden" />
                                </div>
                                <div className="flex-1 pb-1">
                                    {timeString && (
                                        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wide mb-0.5">
                                        {timeString}
                                        </p>
                                    )}
                                    <div className="relative pl-4 pr-3 py-2.5 rounded-xl border border-transparent bg-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors">
                                      <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${isAllDay ? 'bg-[var(--accent-bg)]' : 'bg-[var(--glass-border)] group-hover:bg-[var(--accent-bg)] transition-colors'}`} />
                                      <p className="text-sm font-medium text-[var(--text-primary)] leading-snug break-words whitespace-normal">
                                        {evt.summary}
                                      </p>
                                      {evt.location && (
                                        <div className="flex items-start gap-1.5 mt-1.5 text-[10px] text-[var(--text-secondary)]">
                                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                          <span className="opacity-80 break-words whitespace-normal">{evt.location}</span>
                                        </div>
                                      )}
                                      {evt.description && (
                                        <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 opacity-60 break-words whitespace-normal">
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
