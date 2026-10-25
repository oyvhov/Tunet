import { useMemo } from 'react';

interface TimelineEvent {
  time: Date;
  state: unknown;
}

interface TimelineSegment {
  state: unknown;
  start: Date;
  end: Date;
  duration: number;
}

interface BinaryTimelineProps {
  events?: TimelineEvent[] | null;
  startTime: Date;
  endTime: Date;
  activeLabel?: string;
  eventLabel?: string;
}

const ACTIVE_STATES = new Set([
  'on',
  'open',
  'detected',
  'unlocked',
  'wet',
  'home',
  'active',
  'cleaning',
  'occupied',
]);

const isActiveState = (state: unknown) => ACTIVE_STATES.has(String(state).toLowerCase());

const formatDuration = (milliseconds: number) => {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

export default function BinaryTimeline({
  events,
  startTime,
  endTime,
  activeLabel = 'Active',
  eventLabel = 'Events',
}: BinaryTimelineProps) {
  const eventList = useMemo(() => (Array.isArray(events) ? events : []), [events]);
  const totalDuration = endTime.getTime() - startTime.getTime();

  const segments = useMemo(() => {
    if (totalDuration <= 0) return [];

    const sortedEvents = [...eventList]
      .filter((event) => event?.time instanceof Date && !Number.isNaN(event.time.getTime()))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    if (sortedEvents.length === 0) return [];

    if (sortedEvents.length === 1) {
      return [
        {
          state: sortedEvents[0].state,
          start: startTime,
          end: endTime,
          duration: totalDuration,
        },
      ];
    }

    const result: TimelineSegment[] = [];
    if (sortedEvents[0].time > startTime) {
      result.push({
        state: 'nodata',
        start: startTime,
        end: sortedEvents[0].time,
        duration: sortedEvents[0].time.getTime() - startTime.getTime(),
      });
    }

    for (let index = 0; index < sortedEvents.length; index += 1) {
      const currentEvent = sortedEvents[index];
      const nextEvent = sortedEvents[index + 1];
      const segmentStart = currentEvent.time < startTime ? startTime : currentEvent.time;
      const candidateEnd = nextEvent ? nextEvent.time : endTime;
      const segmentEnd = candidateEnd > endTime ? endTime : candidateEnd;
      if (segmentEnd <= segmentStart || segmentStart >= endTime) continue;

      result.push({
        state: currentEvent.state,
        start: segmentStart,
        end: segmentEnd,
        duration: segmentEnd.getTime() - segmentStart.getTime(),
      });
    }
    return result;
  }, [endTime, eventList, startTime, totalDuration]);

  const summary = useMemo(() => {
    const activeSegments = segments.filter((segment) => isActiveState(segment.state));
    return {
      activeDuration: activeSegments.reduce((sum, segment) => sum + segment.duration, 0),
      activeEvents: activeSegments.length,
    };
  }, [segments]);

  if (segments.length === 0 || totalDuration <= 0) return null;

  const getStyle = (state: unknown) => {
    const normalized = String(state).toLowerCase();
    if (isActiveState(normalized)) return 'bg-[var(--status-success-fg)] opacity-85';
    if (['unavailable', 'unknown', 'nodata'].includes(normalized)) {
      return 'bg-[var(--text-secondary)] opacity-15 pattern-diagonal-stripes';
    }
    return 'bg-[var(--text-secondary)] opacity-25';
  };
  const timelineLabel = `${activeLabel}: ${formatDuration(summary.activeDuration)}. ${eventLabel}: ${
    summary.activeEvents
  }.`;

  return (
    <div className="mb-8 w-full" style={{ containerType: 'inline-size' }}>
      <div
        className="relative flex h-10 w-full overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--glass-bg)' }}
        role="img"
        aria-label={timelineLabel}
      >
        {segments.map((segment, index) => {
          const widthPct = (segment.duration / totalDuration) * 100;
          const active = isActiveState(segment.state);

          return (
            <div
              key={`${segment.start.getTime()}-${index}`}
              style={{
                width: `${widthPct}%`,
                minWidth: active ? 4 : undefined,
              }}
              className={`h-full ${widthPct > 0.5 ? 'border-r border-[var(--card-bg)]' : ''} last:border-0 ${getStyle(segment.state)} transition-all`}
              title={`${segment.state}: ${segment.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${segment.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            />
          );
        })}
      </div>

      <div className="mt-2 flex justify-between px-1 font-mono text-[10px] text-[var(--text-secondary)] uppercase opacity-50">
        <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="binary-timeline__axis-intermediate">
          {new Date(startTime.getTime() + totalDuration * 0.25).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span>
          {new Date(startTime.getTime() + totalDuration * 0.5).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className="binary-timeline__axis-intermediate">
          {new Date(startTime.getTime() + totalDuration * 0.75).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
