import React, { useMemo } from 'react';

export default function BinaryTimeline({ events, startTime, endTime }) {
  const eventList = useMemo(() => (Array.isArray(events) ? events : []), [events]);

  const segments = useMemo(() => {
    const totalDuration = endTime.getTime() - startTime.getTime();
    if (totalDuration <= 0) return [];

    // Sort events by time ascending
    const sortedEvents = [...eventList].sort((a, b) => a.time - b.time);

    const segs = [];

    // If we only have one event, fill the whole window with that state
    if (sortedEvents.length === 1) {
      segs.push({
        state: sortedEvents[0].state,
        start: startTime,
        end: endTime,
        duration: endTime.getTime() - startTime.getTime(),
      });
      return segs;
    }

    // Fill initial gap if data starts late
    if (sortedEvents.length > 0 && sortedEvents[0].time > startTime) {
      segs.push({
        state: 'nodata',
        start: startTime,
        end: sortedEvents[0].time,
        duration: sortedEvents[0].time.getTime() - startTime.getTime(),
      });
    }

    // We iterate to fill the space from startTime to endTime
    // If the first event is after startTime, we need to handle the gap.
    // However, usually HA history returns the state at start time as the first entry.
    // If not, we have to assume the first available state was active before too, or 'unknown'.
    // For simplicity, we process what we have.

    // Add a virtual event at startTime if needed ensuring we cover the full range
    // by extending the first actual event backwards if reasonable, or simple gaps.
    // Better strategy: Iterating and clipping.

    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];

      // Start of this segment (clipped to window start)
      let segStart = currentEvent.time;
      if (segStart < startTime) segStart = startTime;

      // End of this segment (clipped to window end)
      let segEnd = nextEvent ? nextEvent.time : endTime;
      if (segEnd > endTime) segEnd = endTime;

      // Special case: If this is the first event and it starts AFTER startTime,
      // we might have a gap at the beginning.
      // If i===0 and currentEvent.time > startTime, we theoretically have an unknown state before.
      // But often the previous state is valid.
      // Let's just visualize what we have.

      // If effective segment has duration
      if (segEnd > segStart) {
        segs.push({
          state: currentEvent.state,
          start: segStart,
          end: segEnd,
          duration: segEnd.getTime() - segStart.getTime(),
        });
      }
    }

    return segs;
  }, [eventList, startTime, endTime]);

  if (eventList.length === 0) return null;

  const totalDuration = endTime.getTime() - startTime.getTime();

  const getStyle = (state) => {
    const s = String(state).toLowerCase();
    const isActive = [
      'on',
      'open',
      'detected',
      'unlocked',
      'wet',
      'home',
      'active',
      'cleaning',
      'occupied',
    ].includes(s);
    if (isActive) return 'bg-green-400 opacity-80';
    if (['unavailable', 'unknown'].includes(s))
      return 'bg-[var(--text-secondary)] opacity-15 pattern-diagonal-stripes';
    return 'bg-[var(--text-secondary)] opacity-25';
  };

  const getLabel = (state) => {
    // Optional: Map some common states to shorter text for tooltips
    return state;
  };

  return (
    <div className="mb-8 w-full">
      {/* The Bar */}
      <div
        className="relative flex h-12 w-full overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--glass-bg)' }}
      >
        {segments.map((seg, i) => {
          const widthPct = (seg.duration / totalDuration) * 100;
          // Only show border if width is substantial enough to not look like glitch
          const showBorder = widthPct > 0.5;

          return (
            <div
              key={`${seg.start.getTime()}-${i}`}
              style={{ width: `${widthPct}%` }}
              className={`h-full ${showBorder ? 'border-r border-[var(--card-bg)]' : ''} last:border-0 ${getStyle(seg.state)} transition-all`}
              title={`${getLabel(seg.state)}: ${seg.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${seg.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            />
          );
        })}
      </div>

      {/* Time Axis */}
      <div className="mt-2 flex justify-between px-1 font-mono text-[10px] text-[var(--text-secondary)] uppercase opacity-50">
        <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>
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
        <span>
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
