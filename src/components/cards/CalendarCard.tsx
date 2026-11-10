import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, AlertCircle } from 'lucide-react';
import { getIconComponent } from '../../icons';
import { getCalendarEvents } from '../../services/haClient';
import { createCardKeyHandler } from '../../utils/keyboard';
import { useRefreshTick } from '../../hooks/useRefreshTick';
import { useRowsThatFit } from '../../hooks/useRowsThatFit';
import type {
  CSSProperties,
  ErrorInfo,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import type { CardBaseProps } from '../../types/dashboard';
import CardName from '../ui/CardName';

type CalendarEventDateObject = { dateTime?: string; date_time?: string; date?: string };
type CalendarEventDateValue = string | number | CalendarEventDateObject;

type CalendarCardEvent = {
  start?: CalendarEventDateValue;
  end?: CalendarEventDateValue;
  summary?: string;
  title?: string;
  description?: string;
  location?: string;
  uid?: string;
  id?: string;
};

const POLL_MS = 15 * 60 * 1000;
const DAYS_SHOWN = 7;

const dayKey = (date: Date) => date.toLocaleDateString('sv-SE');

const getEventDateValue = (value: CalendarEventDateValue | undefined) => {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return value.dateTime || value.date_time || value.date || null;
};

const isAllDayValue = (value: CalendarEventDateValue | undefined) => {
  if (!value) return false;
  if (typeof value === 'string') return value.length === 10;
  // Numbers have no date fields, so they return false here.
  const dateObject = value as CalendarEventDateObject;
  return !!dateObject.date && !dateObject.dateTime && !dateObject.date_time;
};

/** A date-only value is a day in local time, where new Date() would read it as UTC. */
const parseEventDate = (value: CalendarEventDateValue | undefined) => {
  const raw = getEventDateValue(value);
  if (raw === null) return null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** The last instant the event covers. An end is exclusive, so midnight belongs to the day before. */
const getLastMoment = (event: CalendarCardEvent, start: Date) => {
  const end = parseEventDate(event.end);
  return end && end > start ? new Date(end.getTime() - 1) : start;
};

/** Every shown day the event touches; one that is already running starts today. */
const getEventDayKeys = (event: CalendarCardEvent, today: Date) => {
  const start = parseEventDate(event.start);
  if (!start) return [];
  const last = getLastMoment(event, start);
  const first = start < today ? today : start;
  const day = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const keys: string[] = [];
  while (day <= last && keys.length < DAYS_SHOWN) {
    keys.push(dayKey(day));
    day.setDate(day.getDate() + 1);
  }
  return keys;
};

const spansSeveralDays = (event: CalendarCardEvent) => {
  const start = parseEventDate(event.start);
  return !!start && dayKey(getLastMoment(event, start)) !== dayKey(start);
};

/** A running appointment still counts as next; a running all-day event does not. */
const isComingUp = (event: CalendarCardEvent, now: Date) => {
  const start = parseEventDate(event.start);
  if (!start) return false;
  if (isAllDayValue(event.start)) return start > now;
  return (parseEventDate(event.end) || start) > now;
};

interface CalendarCardSettings {
  calendars?: string[];
  name?: string;
  largeCalendar?: boolean;
  [key: string]: unknown;
}

interface CalendarCardProps extends Pick<CardBaseProps, 'cardId' | 't'> {
  settings?: CalendarCardSettings;
  conn?: Connection | null;
  locale?: string;
  className?: string;
  style?: CSSProperties;
  dragProps?: Record<string, unknown>;
  getControls?: (cardId: string) => ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLDivElement> | ReactKeyboardEvent<Element>) => void;
  isEditMode?: boolean;
  size?: string;
  iconName?: string | null;
  customName?: string | null;
}

interface CalendarErrorBoundaryProps {
  children?: ReactNode;
}

interface CalendarErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class CalendarErrorBoundary extends React.Component<
  CalendarErrorBoundaryProps,
  CalendarErrorBoundaryState
> {
  constructor(props: CalendarErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: (error as Error | null | undefined)?.message || 'Calendar error',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('CalendarCard crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 text-[var(--status-error-fg)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">Calendar error</span>
          </div>
          <p className="mt-2 text-xs opacity-80">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const CalendarCard = memo(
  /** Upcoming events from one or more Home Assistant calendars. */ function CalendarCard({
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
    customName,
  }: CalendarCardProps) {
    const [events, setEvents] = useState<CalendarCardEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [visibleDays, setVisibleDays] = useState(7);
    const cardRef = useRef<HTMLDivElement>(null);
    const gridScrollRef = useRef<HTMLDivElement>(null);

    // Parse check status ("It should be checked when the card is selected")
    // So settings.calendars = ['calendar.personal', 'calendar.work']
    const selectedCalendars = useMemo(
      () => (Array.isArray(settings?.calendars) ? settings.calendars : []),
      [settings?.calendars]
    );
    const selectedCalendarsKey = useMemo(() => selectedCalendars.join('|'), [selectedCalendars]);
    const refreshTick = useRefreshTick(conn, {
      enabled: isVisible && selectedCalendars.length > 0,
      intervalMs: POLL_MS,
    });
    // Read on every render so a card left open moves to the new day at the next poll.
    const todayKey = dayKey(new Date());

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
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

    const getEventDate = (eventDate: CalendarEventDateValue | undefined) => {
      try {
        if (!eventDate) return new Date(0);
        // Strings and numbers have no dateTime/date, so they fall through to eventDate itself.
        const dateObject = eventDate as CalendarEventDateObject;
        const value = dateObject.dateTime || dateObject.date || eventDate;
        // A date object without dateTime/date gives an invalid Date, handled below.
        const date = new Date(value as string | number);
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

      let cancelled = false;
      const fetchEvents = async () => {
        setLoading(true);
        try {
          const start = new Date();
          const end = new Date();
          end.setDate(end.getDate() + DAYS_SHOWN); // Fetch next 7 days

          const result = await getCalendarEvents(conn, {
            start,
            end,
            entityIds: selectedCalendars,
          });
          if (cancelled) return;
          setError(null);

          if (!result) {
            setEvents([]);
            return;
          }

          // Merge all events from all calendars
          let allEvents: CalendarCardEvent[] = [];
          Object.values(result).forEach((calendarEvents) => {
            if (calendarEvents && Array.isArray(calendarEvents.events)) {
              // HA calendar events carry start/end/summary/...; the client types them loosely.
              allEvents = [...allEvents, ...(calendarEvents.events as CalendarCardEvent[])];
            }
          });

          // Remove events without start info
          allEvents = allEvents.filter((evt) => evt && evt.start);

          // Sort by start time
          allEvents.sort(
            (a, b) => getEventDate(a.start).getTime() - getEventDate(b.start).getTime()
          );
          setEvents(allEvents);
        } catch (err) {
          console.error('Failed to fetch calendar events', err);
          if (!cancelled) setError((err as Error).message || 'Failed to fetch events');
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      let idleId: number | undefined;
      let timerId: ReturnType<typeof setTimeout> | undefined;

      // Initial fetch with idle/stagger preference to avoid main thread blocking
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => fetchEvents(), { timeout: 4000 });
      } else {
        timerId = setTimeout(() => fetchEvents(), Math.random() * 500);
      }

      return () => {
        cancelled = true;
        if (idleId) window.cancelIdleCallback(idleId);
        if (timerId) clearTimeout(timerId);
      };
    }, [conn, selectedCalendars, selectedCalendarsKey, isVisible, refreshTick]);

    // Group events by day; a multi-day event appears on each day it covers
    const groupedEvents = useMemo(() => {
      const [year, month, day] = todayKey.split('-').map(Number);
      const today = new Date(year, month - 1, day);
      const groups: Record<string, CalendarCardEvent[]> = {};
      events.forEach((event) => {
        getEventDayKeys(event, today).forEach((key) => {
          if (!groups[key]) groups[key] = [];
          groups[key].push(event);
        });
      });
      return groups;
    }, [events, todayKey]);

    const formatDateHeader = (dateStr: string) => {
      // dateStr is YYYY-MM-DD from sv-SE locale (local time)
      // Create date as local time components to avoid UTC shift issues
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d); // Local time 00:00:00

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.getTime() === today.getTime()) return t('calendar.today');
      if (date.getTime() === tomorrow.getTime()) return t('calendar.tomorrow');

      // Format: "Monday 26. Jan"
      return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const formatEventTime = (date: Date | null) => {
      if (!date || Number.isNaN(date.getTime())) return '';
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale === 'en-US',
      });
    };

    const IconComp = iconName ? getIconComponent(iconName) || CalendarIcon : CalendarIcon;
    const displayName = customName || settings?.name || t('calendar.title');
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
      const days: string[] = [];
      const [year, month, day] = todayKey.split('-').map(Number);
      for (let i = 0; i < DAYS_SHOWN; i++) {
        days.push(dayKey(new Date(year, month - 1, day + i)));
      }
      return days;
    }, [todayKey]);

    const listRowCount = useMemo(
      () => Object.values(groupedEvents).reduce((total, dayEvents) => total + dayEvents.length, 0),
      [groupedEvents]
    );
    const {
      listRef,
      visibleRows,
      showMore: showMoreLine,
    } = useRowsThatFit(listRowCount, groupedEvents);

    const now = new Date();
    const nextEvent = events.find((event) => isComingUp(event, now)) ?? events[0] ?? null;
    const showError = !!error && events.length === 0;
    const nextEventTitle = nextEvent
      ? nextEvent.summary ||
        nextEvent.title ||
        nextEvent.description ||
        t('calendar.noEvents') ||
        'Event'
      : '';
    const nextEventStartRaw = nextEvent ? getEventDateValue(nextEvent.start) : null;
    const nextEventStart = nextEventStartRaw ? new Date(nextEventStartRaw) : null;
    const nextEventEndRaw = nextEvent ? getEventDateValue(nextEvent.end) : null;
    const nextEventEnd = nextEventEndRaw ? new Date(nextEventEndRaw) : null;
    const nextEventStartTime = formatEventTime(nextEventStart);
    const nextEventEndTime = formatEventTime(nextEventEnd);
    const nextIsAllDay = nextEvent ? isAllDayValue(nextEvent.start) : false;
    const nextTimeString = nextEvent
      ? nextIsAllDay
        ? nextEventStart
          ? formatDateHeader(nextEventStart.toLocaleDateString('sv-SE'))
          : t('calendar.allDay')
        : nextEventStartTime
          ? `${nextEventStartTime}${nextEventEndTime ? ` - ${nextEventEndTime}` : ''}`
          : ''
      : '';

    if (isSmall) {
      return (
        <div
          ref={cardRef}
          {...dragProps}
          data-haptic={isEditMode ? undefined : 'card'}
          onClick={onClick}
          role={!isEditMode ? 'button' : undefined}
          tabIndex={!isEditMode ? 0 : undefined}
          onKeyDown={!isEditMode ? createCardKeyHandler(onClick) : undefined}
          className={`glass-texture touch-feedback group relative flex h-full items-center gap-4 overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 pl-5 font-sans backdrop-blur-xl transition-all duration-300 ${className}`}
          style={style}
        >
          {getControls && getControls(cardId)}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg)] text-[var(--text-secondary)]">
            <IconComp className="h-6 w-6 stroke-[1.5px] transition-transform duration-300 group-hover:scale-110" />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            {!selectedCalendars.length ? (
              <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {t('calendar.selectCalendars')}
              </p>
            ) : showError ? (
              <p className="truncate text-xs font-bold text-[var(--status-error-fg)]">
                {t('calendar.loadFailed')}
              </p>
            ) : loading && events.length === 0 ? (
              <p className="truncate text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                {t('common.loading')}
              </p>
            ) : !nextEvent ? (
              <>
                <CardName
                  lines={1}
                  className="mb-1.5 text-xs leading-none font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60"
                >
                  {String(displayName)}
                </CardName>
                <p className="truncate text-sm leading-none font-bold text-[var(--text-primary)] opacity-80">
                  {t('calendar.noEvents')}
                </p>
              </>
            ) : (
              <>
                <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs leading-tight font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-60">
                  <span>{nextTimeString}</span>
                  {!nextIsAllDay && nextEventStart && (
                    <span>
                      {formatDateHeader(nextEventStart.toLocaleDateString('sv-SE')) !==
                        t('calendar.today') &&
                        `• ${formatDateHeader(nextEventStart.toLocaleDateString('sv-SE'))}`}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm leading-tight font-bold text-[var(--text-primary)]">
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

      const formatShortDay = (dateStr: string) => {
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

      const getTimePosition = (date: Date | null) => {
        if (!date) return 0;
        return (date.getHours() - START_HOUR + date.getMinutes() / 60) * HOUR_HEIGHT;
      };

      const getEventBlock = (evt: CalendarCardEvent) => {
        const startRaw = getEventDateValue(evt.start);
        const endRaw = getEventDateValue(evt.end);
        const start = startRaw ? new Date(startRaw) : null;
        const end = endRaw ? new Date(endRaw) : null;
        if (!start) return null;
        const top = Math.max(0, getTimePosition(start));
        const duration = end ? (end.getTime() - start.getTime()) / 3600000 : 1;
        const height = Math.max(20, duration * HOUR_HEIGHT);
        return { top, height, start, end };
      };

      const weekData = weekDays.slice(0, visibleDays).map((dateKey) => {
        const dayEvts = groupedEvents[dateKey] || [];
        const allDay: CalendarCardEvent[] = [];
        const timed: CalendarCardEvent[] = [];
        dayEvts.forEach((evt) => {
          if (isAllDayValue(evt.start) || spansSeveralDays(evt)) allDay.push(evt);
          else timed.push(evt);
        });
        return { dateKey, allDay, timed, ...formatShortDay(dateKey) };
      });

      const hasAnyAllDay = weekData.some((d) => d.allDay.length > 0);

      const nowDateKey = todayKey;
      const nowTop = getTimePosition(now);

      const hours: number[] = [];
      for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);

      return (
        <div
          ref={cardRef}
          {...dragProps}
          data-haptic={isEditMode ? undefined : 'card'}
          onClick={onClick}
          role={!isEditMode ? 'button' : undefined}
          tabIndex={!isEditMode ? 0 : undefined}
          onKeyDown={!isEditMode ? createCardKeyHandler(onClick) : undefined}
          className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] font-sans backdrop-blur-xl transition-all duration-300 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
          style={style}
        >
          {getControls && getControls(cardId)}

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 px-5 pt-4 pb-1">
            <div className="rounded-xl bg-[var(--accent-bg)] p-2 text-[var(--accent-color)]">
              <IconComp className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <CardName
              as="h3"
              className="text-base leading-tight font-medium tracking-tight text-[var(--text-primary)]"
            >
              {String(displayName)}
            </CardName>
          </div>

          {selectedCalendars.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
              <IconComp className="mb-2 h-8 w-8" />
              <p className="text-xs font-bold tracking-widest uppercase">
                {t('calendar.selectCalendars')}
              </p>
            </div>
          ) : showError ? (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--status-error-fg)]">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p className="px-4 text-center text-xs font-bold tracking-widest uppercase">
                {t('calendar.loadFailed')}
              </p>
            </div>
          ) : loading && events.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--accent-color)]" />
              <p className="text-xs font-bold tracking-widest uppercase">{t('common.loading')}</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Day column headers */}
              <div className="flex shrink-0 px-2 pb-1">
                <div className={GUTTER_W + ' shrink-0'} />
                {weekData.map(({ dateKey, dayName, dayNum, isToday }) => (
                  <div
                    key={dateKey}
                    className={`flex-1 rounded-lg py-1 text-center ${isToday ? 'bg-[var(--accent-bg)]' : ''}`}
                  >
                    <p
                      className={`text-xs leading-none font-bold tracking-widest uppercase ${isToday ? 'text-[var(--accent-color)]' : 'text-[var(--text-secondary)] opacity-50'}`}
                    >
                      {dayName}
                    </p>
                    <p
                      className={`mt-1 text-base leading-none font-semibold ${isToday ? 'text-[var(--accent-color)]' : 'text-[var(--text-primary)]'}`}
                    >
                      {dayNum}
                    </p>
                  </div>
                ))}
              </div>

              {/* All-day events banner */}
              {hasAnyAllDay && (
                <div className="flex shrink-0 border-b border-[var(--glass-border)]/30 px-2 pb-1">
                  <div className={GUTTER_W + ' flex shrink-0 items-center justify-end pr-1.5'}>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase opacity-40">
                      {t('calendar.allDay')}
                    </span>
                  </div>
                  {weekData.map(({ dateKey, allDay }) => (
                    <div key={dateKey} className="min-h-[1.25rem] flex-1 space-y-0.5 px-0.5">
                      {allDay.map((evt, idx) => (
                        <div
                          key={`ad-${idx}`}
                          className="truncate rounded border-l-2 border-[var(--accent-color)] bg-[var(--accent-bg)] px-1 py-0.5"
                        >
                          <p className="truncate text-xs leading-tight font-medium text-[var(--accent-color)]">
                            {evt.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Scrollable time grid */}
              <div
                ref={gridScrollRef}
                className="hide-scrollbar flex-1 [scrollbar-width:'none'] overflow-x-hidden overflow-y-auto px-2 [-ms-overflow-style:'none'] [&::-webkit-scrollbar]:hidden"
              >
                <div className="relative flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                  {/* Time gutter with hour labels */}
                  <div className={GUTTER_W + ' relative shrink-0'}>
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute right-0 flex items-start pr-1.5"
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      >
                        <span className="-mt-[5px] text-xs leading-none font-bold text-[var(--text-secondary)] opacity-40">
                          {h === 0 ? '' : `${h.toString().padStart(2, '0')}:00`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekData.map(({ dateKey, timed }) => (
                    <div
                      key={dateKey}
                      className="relative flex-1 border-l border-[var(--glass-border)]/20"
                    >
                      {/* Hour grid lines */}
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="absolute right-0 left-0 border-t border-[var(--glass-border)]/15"
                          style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                        />
                      ))}

                      {/* Now indicator */}
                      {dateKey === nowDateKey && (
                        <div
                          className="absolute right-0 left-0 z-20 flex items-center"
                          style={{ top: nowTop }}
                        >
                          <div className="-ml-[3px] h-1.5 w-1.5 rounded-full bg-[var(--status-error-fg)]" />
                          <div className="h-[1.5px] flex-1 bg-[var(--status-error-fg)]/70" />
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
                            className="absolute right-0.5 left-0.5 z-10 overflow-hidden rounded-md border-l-2 border-[var(--accent-color)] bg-[var(--accent-bg)] transition-colors hover:bg-[var(--accent-bg)]"
                            style={{ top: block.top, height: Math.max(block.height, 18) }}
                          >
                            <div className="h-full px-1 py-0.5">
                              {block.height >= 28 && timeStr && (
                                <p className="truncate text-[11px] leading-none font-bold text-[var(--accent-color)]">
                                  {timeStr}
                                </p>
                              )}
                              <p className="mt-px line-clamp-2 text-xs leading-tight font-medium text-[var(--text-primary)]">
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

    // The days and events that fit, in order; the rest are counted on the "+N more" line.
    const shownDays: [string, CalendarCardEvent[]][] = [];
    let rowsLeft = visibleRows;
    for (const [dateKey, dayEvents] of Object.entries(groupedEvents)) {
      if (rowsLeft <= 0) break;
      shownDays.push([dateKey, dayEvents.slice(0, rowsLeft)]);
      rowsLeft -= dayEvents.length;
    }
    const hiddenRows = Math.max(0, listRowCount - visibleRows);

    return (
      <div
        ref={cardRef}
        {...dragProps}
        data-haptic={isEditMode ? undefined : 'card'}
        onClick={onClick}
        role={!isEditMode ? 'button' : undefined}
        tabIndex={!isEditMode ? 0 : undefined}
        onKeyDown={!isEditMode ? createCardKeyHandler(onClick) : undefined}
        className={`glass-texture touch-feedback group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] font-sans backdrop-blur-xl transition-all duration-300 ${isEditMode ? 'cursor-move' : 'cursor-pointer'} ${className}`}
        style={style}
      >
        {getControls && getControls(cardId)}

        {/* Header */}
        <div className="z-10 flex items-center justify-between p-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl bg-[var(--accent-bg)] p-2 text-[var(--accent-color)]`}>
              <IconComp className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <CardName
              as="h3"
              className="text-lg leading-tight font-medium tracking-tight text-[var(--text-primary)]"
            >
              {String(displayName)}
            </CardName>
          </div>
        </div>

        {/* Content */}
        <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-hidden p-5 pt-0">
          {selectedCalendars.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
              <IconComp className="mb-2 h-8 w-8" />
              <p className="text-xs font-bold tracking-widest uppercase">
                {t('calendar.selectCalendars')}
              </p>
            </div>
          ) : showError ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--status-error-fg)]">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p className="px-4 text-center text-xs font-bold tracking-widest uppercase">
                {t('calendar.loadFailed')}
              </p>
            </div>
          ) : loading && events.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--accent-color)]"></div>
              <p className="text-xs font-bold tracking-widest uppercase">{t('common.loading')}</p>
            </div>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-[var(--text-secondary)] opacity-60">
              <Clock className="mb-2 h-8 w-8" />
              <p className="px-3 text-center text-xs leading-relaxed font-bold tracking-widest uppercase">
                {t('calendar.noEvents')}
              </p>
            </div>
          ) : (
            <>
              {shownDays.map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="space-y-1">
                  <h4 className="mb-1 py-1 text-[10px] font-bold tracking-widest text-[var(--accent-color)] uppercase">
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
                      const timeString = isAllDay
                        ? t('calendar.allDay')
                        : startTime
                          ? `${startTime}${endTime ? ` - ${endTime}` : ''}`
                          : '';

                      return (
                        <div
                          key={`${evt.uid || evt.id || evt.summary || 'event'}-${idx}`}
                          data-fit-row=""
                          className="group flex items-start gap-4"
                        >
                          <div className="flex flex-col items-center pt-1.5">
                            <div
                              className={`h-2 w-2 rounded-full ${isAllDay ? 'bg-[var(--accent-color)]' : 'bg-[var(--glass-border)] transition-colors group-hover:bg-[var(--accent-color)]'}`}
                            />
                            <div className="my-1 -mb-4 h-full w-0.5 bg-[var(--glass-border)]/50 group-last:hidden" />
                          </div>
                          <div className="flex-1 pb-1">
                            {timeString && (
                              <p className="mb-0.5 text-[11px] font-bold tracking-wide text-[var(--text-secondary)] uppercase">
                                {timeString}
                              </p>
                            )}
                            <div className="relative rounded-xl border border-transparent bg-transparent py-2.5 pr-3 pl-4 transition-colors hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)]">
                              <span
                                className={`absolute top-2 bottom-2 left-0 w-1 rounded-full ${isAllDay ? 'bg-[var(--accent-bg)]' : 'bg-[var(--glass-border)] transition-colors group-hover:bg-[var(--accent-bg)]'}`}
                              />
                              <p className="text-sm leading-snug font-medium break-words whitespace-normal text-[var(--text-primary)]">
                                {evt.summary}
                              </p>
                              {evt.location && (
                                <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-[var(--text-secondary)]">
                                  <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                                  <span className="break-words whitespace-normal opacity-80">
                                    {evt.location}
                                  </span>
                                </div>
                              )}
                              {evt.description && (
                                <p className="mt-1.5 text-[10px] break-words whitespace-normal text-[var(--text-secondary)] opacity-60">
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
              ))}
              {showMoreLine && (
                <p
                  data-fit-more=""
                  className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase"
                >
                  {t('common.moreCount').replace('{count}', String(hiddenRows))}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
);

export default function CalendarCardWithBoundary(props: CalendarCardProps) {
  return (
    <CalendarErrorBoundary>
      <CalendarCard {...props} />
    </CalendarErrorBoundary>
  );
}
