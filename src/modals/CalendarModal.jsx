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
export default function CalendarModal({
  show,
  onClose,
  conn,
  entities,
  language,
  t
}) {
  const translate = t || ((key) => key);
  const locale = getLocaleForLanguage(language);
  
  // Get all calendar entities
  const allCalendars = Object.keys(entities || {})
    .filter(id => id.startsWith('calendar.'))
    .map(id => ({
      id,
      name: entities[id]?.attributes?.friendly_name || id,
      color: getCalendarColor(id)
    }));

  const [selectedCalendars, setSelectedCalendars] = useState(() => {
    const stored = localStorage.getItem('tunet_calendar_modal_selection');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return allCalendars.map(c => c.id);
      }
    }
    return allCalendars.map(c => c.id);
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
          entityIds: selectedCalendars
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
    setSelectedCalendars(prev => 
      prev.includes(calendarId) 
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  // Group events by date
  const groupedEvents = {};
  Object.entries(events).forEach(([calendarId, data]) => {
    if (!selectedCalendars.includes(calendarId)) return;
    const calendarEvents = data?.events || [];
    
    calendarEvents.forEach(event => {
      const startDate = new Date(event.start);
      const dateKey = startDate.toLocaleDateString(locale, {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      
      groupedEvents[dateKey].push({
        ...event,
        calendarId,
        calendarName: allCalendars.find(c => c.id === calendarId)?.name || calendarId,
        calendarColor: getCalendarColor(calendarId)
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
      style={{backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)'}} 
      onClick={onClose}
    >
      <div 
        className="border w-full max-w-5xl rounded-3xl md:rounded-[3rem] p-6 md:p-12 font-sans relative max-h-[70vh] overflow-hidden backdrop-blur-xl popup-anim flex flex-col" 
        style={{
          background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)', 
          borderColor: 'var(--glass-border)', 
          color: 'var(--text-primary)'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 md:top-10 md:right-10 z-20 modal-close">
          <X className="w-4 h-4" />
        </button>
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 font-sans">
          <div className="p-4 rounded-2xl transition-all duration-500 bg-[var(--accent-bg)] text-[var(--accent-color)]">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-light tracking-tight text-[var(--text-primary)] uppercase italic leading-none">
              {translate('calendar.title')}
            </h3>
            <div className="mt-2 px-3 py-1 rounded-full border inline-block transition-all duration-500" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
              <p className="text-[10px] uppercase font-bold italic tracking-widest">
                {translate('calendar.selectedCount').replace('{count}', String(selectedCalendars.length))}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
          
          {/* Left Column - Calendar Events (Span 3) */}
          <div className="lg:col-span-3 overflow-y-auto pr-4 scrollbar-hide">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest">
                  {translate('common.loading')}
                </p>
              </div>
            ) : sortedDates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Calendar className="w-16 h-16 text-[var(--text-muted)] mb-4 opacity-30" />
                <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest">
                  {translate('calendar.noEvents')}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {sortedDates.map(dateKey => (
                  <div key={dateKey}>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4 opacity-60 sticky top-0 bg-[var(--modal-bg)] py-2 z-10">
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
                              className="py-3 pr-2 border-b border-[var(--glass-border)] last:border-0 transition-opacity hover:opacity-80 flex items-start gap-4"
                            >
                              <div className="flex-1">
                                <div className="flex items-baseline justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                     <div className="flex-shrink-0 text-right min-w-[3rem]">
                                    {isAllDay ? (
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                                        {translate('calendar.allDayShort')}
                                      </span>
                                    ) : (
                                        <p className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                                          {startTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                     </div>
                                      <div 
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                                        style={{backgroundColor: event.calendarColor}}
                                      />
                                    <h5 className="font-medium text-[var(--text-primary)] leading-tight truncate">
                                      {event.summary}
                                    </h5>
                                  </div>
                                </div>
                                {(event.description || event.location) && (
                                   <div className="pl-[4.5rem] mt-1 text-xs text-[var(--text-secondary)] opacity-70">
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
          <div className="lg:col-span-1 overflow-y-auto scrollbar-hide">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                  {translate('calendar.selectCalendars')}
                </h4>
                <button
                  onClick={() => {
                    if (selectedCalendars.length === allCalendars.length) {
                      setSelectedCalendars([]);
                    } else {
                      setSelectedCalendars(allCalendars.map(c => c.id));
                    }
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors"
                >
                  {selectedCalendars.length === allCalendars.length ? translate('calendar.removeAll') : translate('calendar.selectAll')}
                </button>
              </div>
              
              {allCalendars.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-8 italic">
                  {translate('calendar.noCalendarsFound')}
                </p>
              ) : (
                allCalendars.map(calendar => {
                  const isSelected = selectedCalendars.includes(calendar.id);
                  return (
                    <button
                      key={calendar.id}
                      onClick={() => toggleCalendar(calendar.id)}
                      className={`w-full p-4 rounded-2xl transition-all flex items-center gap-3 ${
                        isSelected 
                          ? 'popup-surface-hover border border-[var(--glass-border)]' 
                          : 'popup-surface hover:bg-[var(--glass-bg-hover)]'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{backgroundColor: calendar.color}}
                      />
                      <span className="text-sm font-medium text-[var(--text-primary)] flex-1 text-left truncate">
                        {calendar.name}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
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
