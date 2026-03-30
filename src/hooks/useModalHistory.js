import { useState, useEffect, useRef } from 'react';
import { getHistory, getHistoryRest, getStatistics } from '../services/haClient';
import { logger } from '../utils/logger';
import {
  mapRawHistoryToPoints,
  mapRawHistoryToEvents,
  mapStatisticsToPoints,
  makeFallbackPoints,
} from '../utils/historyUtils';

/**
 * useModalHistory — shared history-fetching lifecycle for modals.
 *
 * Encapsulates the common pattern of:
 *   1. Compute time window from `hours`
 *   2. Fetch history via REST / WS / Statistics (configurable order)
 *   3. Fall back through sources when data is sparse
 *   4. Manage loading / error / cancellation lifecycle
 *
 * @param {Object} options
 * @param {boolean}  options.enabled   - Gate: only fetch when true
 * @param {string}   options.entityId  - Entity to fetch for
 * @param {object}   options.conn      - HA WebSocket connection
 * @param {string}   [options.haUrl]   - HA base URL (needed for REST strategy)
 * @param {string}   [options.haToken] - HA auth token (needed for REST strategy)
 * @param {number}   [options.hours=24]          - Time window in hours
 * @param {'rest'|'ws'|'stats'} [options.strategy='ws'] - Primary fetch method
 * @param {boolean}  [options.includeEvents=false] - Also parse state-change events
 * @param {boolean}  [options.skipHistoryFetch=false] - Skip REST/WS, go straight to stats
 * @param {string}   [options.statsPeriod='hour'] - Period for statistics queries
 * @param {string}   [options.currentState]       - Current entity state (for synthetic fallback)
 * @param {Object}   [options.wsOptions]          - Extra options for WS getHistory call
 *
 * @returns {{
 *   points: Array<{value: number, time: Date}>,
 *   events: Array<{state: string, time: Date, lastChanged: string}>,
 *   loading: boolean,
 *   error: string | null,
 *   meta: {source: string|null, rawCount: number},
 *   timeWindow: {start: Date, end: Date},
 * }}
 */
export default function useModalHistory({
  enabled = false,
  entityId,
  conn,
  haUrl,
  haToken,
  hours = 24,
  strategy = 'ws',
  includeEvents = false,
  skipHistoryFetch = false,
  statsPeriod = 'hour',
  currentState,
  wsOptions,
}) {
  const [points, setPoints] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ source: null, rawCount: 0 });
  const [timeWindow, setTimeWindow] = useState({
    start: new Date(Date.now() - hours * 60 * 60 * 1000),
    end: new Date(),
  });

  // Keep currentState in a ref so it doesn't trigger refetches on every entity update
  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  useEffect(() => {
    if (!enabled || !entityId || !conn) {
      setPoints([]);
      setEvents([]);
      setError(null);
      setMeta({ source: null, rawCount: 0 });
      return;
    }

    let cancelled = false;
    const isActive = () => !cancelled;

    const run = async () => {
      setLoading(true);
      setError(null);
      setMeta({ source: null, rawCount: 0 });

      const end = new Date();
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      setTimeWindow({ start, end });

      let pts = [];
      let evts = [];

      try {
        // ---- Strategy: stats-first (WeatherModal pattern) ----
        if (strategy === 'stats') {
          try {
            const stats = await getStatistics(conn, {
              statisticId: entityId,
              start,
              end,
              period: statsPeriod,
            });
            if (isActive() && Array.isArray(stats) && stats.length > 0) {
              pts = mapStatisticsToPoints(stats);
              if (isActive()) setMeta({ source: 'stats', rawCount: stats.length });
            }
          } catch {
            // fall through to WS
          }

          // Fall back to WS if stats are sparse
          if (isActive() && pts.length === 0) {
            try {
              const wsData = await getHistory(conn, {
                entityId,
                start,
                end,
                minimal_response: false,
                no_attributes: true,
                ...wsOptions,
              });
              if (isActive()) {
                pts = mapRawHistoryToPoints(
                  Array.isArray(wsData) ? wsData : []
                );
                pts.sort((a, b) => a.time - b.time);
                if (isActive()) setMeta({ source: 'ws', rawCount: pts.length });
              }
            } catch {
              // no data available
            }
          }
        }

        // ---- Strategy: rest-first (SensorModal pattern) ----
        else if (strategy === 'rest' && !skipHistoryFetch) {
          let restFailed = false;
          try {
            const data = await getHistoryRest(haUrl, haToken, {
              entityId,
              start,
              end,
              minimal_response: false,
              no_attributes: false,
              significant_changes_only: false,
            });
            if (isActive() && data && Array.isArray(data)) {
              const raw = Array.isArray(data[0]) ? data[0] : data;
              if (isActive()) setMeta({ source: 'rest', rawCount: raw.length });
              pts = mapRawHistoryToPoints(raw);
              if (includeEvents) evts = mapRawHistoryToEvents(raw);
            }
          } catch (restErr) {
            restFailed = true;
            // Fall back to WS
            if (isActive()) {
              try {
                const wsData = await getHistory(conn, {
                  entityId,
                  start,
                  end,
                  minimal_response: false,
                  no_attributes: false,
                  ...wsOptions,
                });
                if (isActive() && wsData && Array.isArray(wsData)) {
                  const raw = Array.isArray(wsData[0]) ? wsData[0] : wsData;
                  if (isActive()) setMeta({ source: 'ws', rawCount: raw.length });
                  pts = mapRawHistoryToPoints(raw);
                  if (includeEvents) evts = mapRawHistoryToEvents(raw);
                  if (isActive()) setError(null);
                } else if (isActive()) {
                  setError(restErr?.message || 'History fetch failed');
                }
              } catch {
                if (isActive()) setError(restErr?.message || 'History fetch failed');
              }
            }
          }

          // Statistics fallback when history is sparse
          if (isActive() && pts.length < 2) {
            try {
              const stats = await getStatistics(conn, {
                statisticId: entityId,
                start,
                end,
                period: statsPeriod,
              });
              if (isActive() && stats && Array.isArray(stats)) {
                const statPts = mapStatisticsToPoints(stats);
                if (statPts.length >= 2) {
                  pts = statPts;
                  if (restFailed && isActive()) setError(null);
                }
              }
            } catch (statErr) {
              logger.warn('Stats fetch failed', statErr);
            }
          }

          // Synthetic fallback
          if (isActive() && pts.length < 2) {
            const fallback = makeFallbackPoints(currentStateRef.current, hours);
            if (fallback.length) pts = fallback;
          }
        }

        // ---- Strategy: ws-first (CostModal pattern) or rest with skipHistoryFetch ----
        else {
          if (!skipHistoryFetch) {
            try {
              const raw = await getHistory(conn, {
                entityId,
                start,
                end,
                minimal_response: true,
                no_attributes: true,
                ...wsOptions,
              });
              if (isActive() && raw) {
                pts = mapRawHistoryToPoints(Array.isArray(raw) ? raw : []);
                if (includeEvents) evts = mapRawHistoryToEvents(Array.isArray(raw) ? raw : []);
                if (isActive()) setMeta({ source: 'ws', rawCount: pts.length });
              }
            } catch {
              // fall through to stats
            }
          }

          // Statistics fallback
          if (isActive() && pts.length < 2) {
            try {
              const stats = await getStatistics(conn, {
                statisticId: entityId,
                start,
                end,
                period: statsPeriod,
              });
              if (isActive()) {
                const statPts = mapStatisticsToPoints(stats);
                if (statPts.length >= 2) pts = statPts;
              }
            } catch {
              // no stats available
            }
          }

          // Synthetic fallback
          if (isActive() && pts.length < 2) {
            const fallback = makeFallbackPoints(currentStateRef.current, hours);
            if (fallback.length) pts = fallback;
          }
        }
      } catch (err) {
        if (isActive()) {
          setError(err?.message || 'History fetch failed');
          logger.warn('History fetch error', err);
        }
      }

      if (isActive()) {
        setPoints(pts);
        setEvents(evts);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, entityId, conn, haUrl, haToken, hours, strategy, includeEvents, skipHistoryFetch, statsPeriod]);

  return { points, events, loading, error, meta, timeWindow };
}
