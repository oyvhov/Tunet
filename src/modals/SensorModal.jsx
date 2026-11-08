import { useState, useEffect, useRef } from 'react';
import { Activity, ChevronDown, List } from 'lucide-react';
import { logger } from '../utils/logger';
import { canUseHistoryRest, getHistory, getHistoryRest, getStatistics } from '../services/haClient';
import { historyRowsToPoints, parseHistoryTime } from '../utils/sensorHistory';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import BinaryTimeline from '../components/charts/BinaryTimeline';
import { formatDateTime, formatRelativeTime } from '../utils';
import { getIconComponent } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import { ModalBody, ModalHeader, StatusChip } from '../components/ui/ModalParts';
import Segmented from '../components/ui/Segmented';
import ModernDropdown from '../components/ui/ModernDropdown';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
} from '../utils';

const TECHNICAL_ATTRIBUTES = new Set([
  'state_class',
  'device_class',
  'platform',
  'integration',
  'manufacturer',
  'model',
  'model_id',
  'area_id',
  'device_id',
  'unique_id',
  'config_entry_id',
  'sw_version',
  'hw_version',
  'supported_features',
  'attribution',
]);

const HISTORY_HOURS = [6, 12, 24, 48, 72];
const ACTIVE_STATES = ['on', 'open', 'unlocked', 'playing', 'active', 'home'];

function isEntityNumeric(domain, entityId, state) {
  return (
    !['script', 'scene'].includes(domain) &&
    !Number.isNaN(parseFloat(state)) &&
    !String(state).match(/^unavailable|unknown$/) &&
    !String(entityId || '').startsWith('binary_sensor.')
  );
}

function shouldShowEntityActivity(domain, state, numericState) {
  const activityDomains = [
    'binary_sensor',
    'automation',
    'switch',
    'input_boolean',
    'cover',
    'light',
    'fan',
    'lock',
    'climate',
    'media_player',
    'scene',
    'script',
    'select',
    'input_select',
  ];

  if (!activityDomains.includes(domain)) return false;
  if (state === 'unavailable' || state === 'unknown') return false;
  if (numericState && domain !== 'light' && domain !== 'climate') return false;
  return true;
}

export default function SensorModal({
  isOpen,
  onClose,
  entityId,
  entity,
  customName,
  conn,
  haUrl,
  haToken,
  callService,
  t = (key) => key,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const [history, setHistory] = useState([]);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [_historyError, setHistoryError] = useState(null);
  const [_historyMeta, setHistoryMeta] = useState({ source: null, rawCount: 0 });
  const [historyHours, setHistoryHours] = useState(24);

  // Keep track of window for the timeline
  const [timeWindow, setTimeWindow] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const attrs = entity?.attributes || {};
  const state = entity?.state;
  const domain = entityId?.split('.')?.[0];
  const isNumeric = isEntityNumeric(domain, entityId, state);
  const entityRef = useRef(entity);
  entityRef.current = entity;

  useEffect(() => {
    let cancelled = false;

    if (isOpen && entityId && conn) {
      const fetchHistory = async () => {
        setLoading(true);
        setHistoryError(null);
        setHistoryMeta({ source: null, rawCount: 0 });
        try {
          const activeEntity = entityRef.current;
          if (!activeEntity?.entity_id) {
            if (!cancelled) {
              setHistory([]);
              setHistoryEvents([]);
            }
            return;
          }

          const end = new Date();
          const start = new Date(end.getTime() - historyHours * 60 * 60 * 1000);
          if (!cancelled) setTimeWindow({ start, end });

          let points = [];
          let events = [];
          const currentDomain = activeEntity.entity_id?.split('.')?.[0];
          const currentState = activeEntity.state;
          const numericHistory = isEntityNumeric(
            currentDomain,
            activeEntity.entity_id,
            currentState
          );

          // Determine if we need history data for activity/events display
          const needsActivityData = shouldShowEntityActivity(
            currentDomain,
            currentState,
            numericHistory
          );
          const shouldFetch = needsActivityData || numericHistory;
          const loadWsHistory = async (errorMessage = null) => {
            try {
              const wsData = await getHistory(conn, {
                entityId: activeEntity.entity_id,
                start,
                end,
                minimal_response: false,
                no_attributes: false,
              });
              if (wsData && Array.isArray(wsData)) {
                const raw = Array.isArray(wsData[0]) ? wsData[0] : wsData;
                if (!cancelled) setHistoryMeta({ source: 'ws', rawCount: raw.length });
                points = historyRowsToPoints(raw);
                events = raw
                  .map((d) => {
                    if (!d) return null;
                    const stateValue = d.state ?? d.s;
                    const changed =
                      d.last_changed ||
                      d.last_updated ||
                      d.last_reported ||
                      d.timestamp ||
                      d.l ||
                      d.lc ||
                      d.lu;
                    const time = parseHistoryTime(changed);
                    if (stateValue === undefined || !time) return null;
                    return {
                      state: stateValue,
                      time,
                      lastChanged: changed,
                    };
                  })
                  .filter(Boolean);
                if (!cancelled) setHistoryError(null);
              } else if (errorMessage && !cancelled) {
                setHistoryError(errorMessage);
              }
            } catch (_wsErr) {
              if (errorMessage && !cancelled) setHistoryError(errorMessage);
            }
          };

          // Try fetching history via REST first (recommended for full data)
          if (shouldFetch) {
            const canUseRest = canUseHistoryRest(haUrl);

            if (canUseRest) {
              try {
                const data = await getHistoryRest(haUrl, haToken, {
                  entityId: activeEntity.entity_id,
                  start,
                  end,
                  minimal_response: false,
                  no_attributes: false,
                  significant_changes_only: false,
                });

                if (data && Array.isArray(data)) {
                  const raw = Array.isArray(data[0]) ? data[0] : data;
                  if (!cancelled) setHistoryMeta({ source: 'rest', rawCount: raw.length });
                  points = historyRowsToPoints(raw);
                  events = raw
                    .map((d) => {
                      if (!d) return null;
                      const stateValue = d.state ?? d.s;
                      const changed =
                        d.last_changed ||
                        d.last_updated ||
                        d.last_reported ||
                        d.timestamp ||
                        d.l ||
                        d.lc ||
                        d.lu;
                      const time = parseHistoryTime(changed);
                      if (stateValue === undefined || !time) return null;
                      return {
                        state: stateValue,
                        time,
                        lastChanged: changed,
                      };
                    })
                    .filter(Boolean);
                }
              } catch (err) {
                await loadWsHistory(err?.message || 'History REST failed');
              }
            } else {
              await loadWsHistory();
            }
          }

          if (!shouldFetch) {
            if (!cancelled) {
              setHistory([]);
              setHistoryEvents([]);
            }
            return;
          }

          // A sensor that never changed has one row: it held that value until now.
          if (points.length === 1 && !isNaN(parseFloat(currentState))) {
            points = [points[0], { value: parseFloat(currentState), time: end }];
          }

          // Fallback to statistics if history is empty
          if (points.length < 2) {
            try {
              const stats = await getStatistics(conn, {
                statisticId: activeEntity.entity_id,
                start,
                end,
                period: 'hour',
              });

              if (stats && Array.isArray(stats)) {
                points = stats
                  .map((d) => ({
                    value:
                      typeof d.mean === 'number'
                        ? d.mean
                        : typeof d.state === 'number'
                          ? d.state
                          : d.sum,
                    time: new Date(d.start),
                  }))
                  .filter((d) => !isNaN(parseFloat(d.value)));
              }
            } catch (statErr) {
              logger.warn('Stats fetch failed', statErr);
            }
          }

          // Fallback for events (Binary Timeline) if no history found
          // Even if unavailable, we want to show that state
          if (events.length === 0 && currentState) {
            events = [
              {
                state: currentState,
                time: start,
                lastChanged: start.toISOString(),
              },
            ];
          }
          if (!cancelled) {
            setHistory(points);
            setHistoryEvents(events);
          }
        } catch (_e) {
          console.error('Failed to load history', _e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      fetchHistory();
    } else {
      setHistory([]);
      setHistoryEvents([]);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, entityId, conn, haUrl, haToken, historyHours]);

  if (!isOpen || !entity) return null;

  const name = customName || attrs.friendly_name || entityId;
  const unit = attrs.unit_of_measurement ? `${attrs.unit_of_measurement}` : '';
  const deviceClass = attrs.device_class;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const inferredUnitKind = inferUnitKind(deviceClass, unit);
  // Determine if entity should show activity timeline and log
  const hasActivity = shouldShowEntityActivity(domain, state, isNumeric);

  const attributeEntries = Object.entries(attrs).filter(
    ([key]) => !['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'].includes(key)
  );
  const visibleAttributes = attributeEntries.filter(([key]) => !TECHNICAL_ATTRIBUTES.has(key));
  const technicalAttributes = attributeEntries.filter(([key]) => TECHNICAL_ATTRIBUTES.has(key));
  const timestamps = [
    { key: 'changed', label: t('sensorInfo.lastChanged'), value: entity.last_changed },
    { key: 'updated', label: t('sensorInfo.lastUpdated'), value: entity.last_updated },
  ];

  const formatStateLabel = (value, dc = deviceClass) => {
    if (value === null || value === undefined) return '--';
    const normalized = String(value).toLowerCase();

    // Check for ISO Date (e.g. Scenes/Scripts)
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return formatDateTime(d);
        }
      } catch (_e) {
        // Silently ignore parse errors for non-date values
      }
    }

    // Base state mappings
    const stateMap = {
      on: t('common.on'),
      off: t('common.off'),
      unavailable: t('status.unavailable'),
      unknown: t('common.unknown'),
      open: t('state.open'),
      closed: t('state.closed'),
      opening: t('state.open'),
      closing: t('state.closed'),
      locked: t('state.locked'),
      unlocked: t('state.unlocked'),
      active: t('state.active'),
      inactive: t('state.inactive'),
      idle: t('state.idle'),
      charging: t('state.charging'),
      playing: t('state.playing'),
      paused: t('state.paused'),
      standby: t('state.standby'),
      home: t('status.home'),
      away: t('status.notHome'),
      not_home: t('status.notHome'),
      online: t('state.online'),
      offline: t('state.offline'),
      heat: t('climate.hvac.heat'),
      cool: t('climate.hvac.cool'),
      auto: t('climate.hvac.auto'),
      fan_only: t('climate.hvac.fanOnly'),
      dry: t('climate.hvac.dry'),
    };

    // Check if it's an on/off state and apply device_class specific mapping
    const isOnOff = normalized === 'on' || normalized === 'off';
    if (isOnOff && dc) {
      const deviceClassMap = {
        door: { on: 'binary.door.open', off: 'binary.door.closed' },
        window: { on: 'binary.window.open', off: 'binary.window.closed' },
        garage_door: { on: 'binary.garageDoor.open', off: 'binary.garageDoor.closed' },
        motion: { on: 'binary.motion.detected', off: 'binary.motion.clear' },
        moisture: { on: 'binary.moisture.wet', off: 'binary.moisture.dry' },
        occupancy: { on: 'binary.occupancy.occupied', off: 'binary.occupancy.clear' },
        smoke: { on: 'binary.smoke.detected', off: 'binary.smoke.clear' },
        lock: { on: 'binary.lock.unlocked', off: 'binary.lock.locked' },
      };
      const key = deviceClassMap[dc]?.[normalized];
      if (key) return t(key);
    }

    return stateMap[normalized] || String(value);
  };

  const numericState = isNumeric ? parseFloat(state) : null;
  const convertedNumericState =
    isNumeric && inferredUnitKind
      ? convertValueByKind(numericState, {
          kind: inferredUnitKind,
          fromUnit: unit,
          unitMode: effectiveUnitMode,
        })
      : numericState;
  const displayUnit =
    isNumeric && inferredUnitKind
      ? getDisplayUnitForKind(inferredUnitKind, effectiveUnitMode)
      : unit;

  let displayState = isNumeric
    ? formatUnitValue(convertedNumericState, { fallback: '--' })
    : formatStateLabel(state, deviceClass);
  // Add prefix for Scene timestamps
  if (domain === 'scene' && String(state).match(/^\d{4}-\d{2}-\d{2}T/)) {
    displayState = `${t('state.sceneSet')} ${formatRelativeTime(state, t)}`;
  }

  const recentEvents = historyEvents
    .filter((e) => e && e.time && !Number.isNaN(new Date(e.time).getTime()))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  // Icon Logic
  const Icon = getIconComponent(attrs.icon) || Activity;
  const modalTitleId = `sensor-modal-title-${entityId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const isUnavailable = entity.state === 'unavailable';
  const statusLabel = `${String(displayState)} ${displayUnit || ''}`.trim();
  const statusTone = isUnavailable
    ? 'error'
    : ACTIVE_STATES.includes(String(state).toLowerCase())
      ? 'on'
      : 'neutral';
  const historyOptions = HISTORY_HOURS.map((hours) => ({
    value: hours,
    label: t(`sensor.graphRange${hours}h`),
  }));

  const renderGraph = () => (
    <SensorHistoryGraph
      data={history}
      height={350}
      noDataLabel={t('sensorInfo.noHistory')}
      strokeColor="var(--text-primary)"
      areaColor="var(--text-primary)"
    />
  );

  const spinner = (
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--text-primary)] opacity-20"></div>
  );

  return (
    <AccessibleModalShell
      open={isOpen && !!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      size="l"
    >
      {() => (
        <>
          <ModalHeader
            title={name}
            closeLabel={t('common.close')}
            onClose={onClose}
            icon={<Icon />}
            iconStyle={{
              backgroundColor: isUnavailable ? 'var(--status-error-bg)' : 'var(--status-info-bg)',
              color: isUnavailable ? 'var(--status-error-fg)' : 'var(--status-info-fg)',
            }}
            status={<StatusChip tone={statusTone} label={statusLabel} />}
          />

          <ModalBody className="grid gap-6 lg:grid-cols-5">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
              {(domain === 'select' || domain === 'input_select') && callService && (
                <ModernDropdown
                  label={t('sensor.select.label') || 'Select'}
                  icon={List}
                  options={attrs.options || []}
                  current={state || ''}
                  onChange={(option) => {
                    callService(domain, 'select_option', {
                      entity_id: entityId,
                      option,
                    });
                  }}
                  placeholder={t('sensor.select.label') || 'Select'}
                />
              )}

              {isNumeric && !hasActivity ? (
                <div className="relative min-h-[250px] w-full">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {spinner}
                    </div>
                  ) : (
                    renderGraph()
                  )}
                </div>
              ) : (
                <div className="flex flex-col">
                  {loading && (
                    <div className="flex h-[100px] items-center justify-center">{spinner}</div>
                  )}

                  {!loading && hasActivity && (
                    <>
                      <h3 className="modal-section-label mb-3">{t('history.activity')}</h3>
                      <div className="mb-6">
                        <BinaryTimeline
                          events={historyEvents}
                          startTime={timeWindow.start}
                          endTime={timeWindow.end}
                          activeLabel={t('state.active')}
                          eventLabel={t('history.log')}
                        />
                      </div>

                      <h3 className="modal-section-label mb-2 border-b border-[var(--glass-border)] pb-2">
                        {t('history.log')}
                      </h3>
                      <div className="space-y-1">
                        {recentEvents.length === 0 && (
                          <div className="py-8 text-center text-sm text-[var(--text-secondary)] opacity-60">
                            {t('sensorInfo.noHistory')}
                          </div>
                        )}
                        {recentEvents.map((event, idx) => {
                          let stateLabel = formatStateLabel(event.state, deviceClass);

                          // Specific formatting for Scenes in log
                          if (
                            domain === 'scene' &&
                            String(event.state).match(/^\d{4}-\d{2}-\d{2}T/)
                          ) {
                            stateLabel = `${t('state.sceneSet')} ${formatRelativeTime(event.state, t)}`;
                          }

                          return (
                            <div
                              key={`${event.lastChanged || idx}`}
                              className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-[var(--glass-bg-hover)]"
                            >
                              <div
                                className={`h-2 w-2 flex-shrink-0 rounded-full ${event.state === 'on' || event.state === 'true' || event.state === 'open' || event.state === 'unlocked' || event.state === 'playing' || event.state > 0 ? 'bg-[var(--status-success-fg)] opacity-80' : 'bg-[var(--text-secondary)] opacity-35'}`}
                              />
                              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                  {stateLabel}
                                </span>
                                <span
                                  className="text-xs whitespace-nowrap text-[var(--text-secondary)] tabular-nums"
                                  title={formatDateTime(event.time)}
                                >
                                  {formatRelativeTime(event.time, t)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {!loading && !hasActivity && isNumeric && renderGraph()}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
              <section>
                <h3 className="modal-section-label mb-3">{t('sensorInfo.timeline')}</h3>
                <div className="space-y-4">
                  {timestamps.map((item) => (
                    <div
                      key={item.key}
                      className="relative border-l border-[var(--glass-border)] pl-4"
                    >
                      <div
                        className={`absolute top-1.5 -left-[3px] h-1.5 w-1.5 rounded-full ${item.key === 'changed' ? 'bg-[var(--accent-color)]' : 'bg-[var(--text-secondary)]'}`}
                      ></div>
                      <p className="mb-0.5 text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {item.value ? formatRelativeTime(item.value, t) : '--'}
                      </p>
                      {item.value && (
                        <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                          {formatDateTime(item.value)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="modal-section-label mb-3">{t('history.rangeHours')}</h3>
                <Segmented
                  ariaLabel={t('history.rangeHours')}
                  value={historyHours}
                  onChange={setHistoryHours}
                  options={historyOptions}
                />
              </section>

              {visibleAttributes.length > 0 && (
                <section>
                  <h3 className="modal-section-label mb-3">{t('sensorInfo.attributes')}</h3>
                  <div className="space-y-3">
                    {visibleAttributes.map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm leading-snug font-medium break-words text-[var(--text-primary)]">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <details className="group popup-surface rounded-[var(--modal-surface-radius)] p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="modal-section-label">{t('sensor.technicalDetails')}</span>
                  <ChevronDown className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-3">
                  {technicalAttributes.map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-sm leading-snug break-words text-[var(--text-secondary)]">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                  <p className="font-mono text-xs break-all text-[var(--text-secondary)] select-all">
                    {entityId}
                  </p>
                </div>
              </details>
            </div>
          </ModalBody>
        </>
      )}
    </AccessibleModalShell>
  );
}
