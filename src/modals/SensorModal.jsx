import { useState, useMemo, useCallback } from 'react';
import { X, Activity } from 'lucide-react';
import SensorHistoryGraph from '../components/charts/SensorHistoryGraph';
import BinaryTimeline from '../components/charts/BinaryTimeline';
import { formatRelativeTime } from '../utils';
import { getIconComponent } from '../icons';
import { useConfig, useHomeAssistantMeta } from '../contexts';
import useModalHistory from '../hooks/useModalHistory';
import AccessibleModalShell from '../components/ui/AccessibleModalShell';
import {
  convertValueByKind,
  formatUnitValue,
  getDisplayUnitForKind,
  getEffectiveUnitMode,
  inferUnitKind,
} from '../utils';

export default function SensorModal({
  isOpen,
  onClose,
  entityId,
  entity,
  customName,
  conn,
  haUrl,
  haToken,
  t = (key) => key,
}) {
  const { unitsMode } = useConfig();
  const { haConfig } = useHomeAssistantMeta();
  const [historyHours, setHistoryHours] = useState(24);

  const attrs = entity?.attributes || {};
  const state = entity?.state;
  const domain = entityId?.split('.')?.[0];
  const isNumeric =
    !['script', 'scene'].includes(domain) &&
    !isNaN(parseFloat(state)) &&
    !String(state).match(/^unavailable|unknown$/) &&
    !String(entityId || '').startsWith('binary_sensor.');

  // Helper to determine if entity should show activity (called early before useEffect)
  const getShouldShowActivity = useCallback(() => {
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
      'input_select',
    ];

    if (!activityDomains.includes(domain)) return false;
    if (state === 'unavailable' || state === 'unknown') return false;
    if (isNumeric && domain !== 'light' && domain !== 'climate') return false;
    return true;
  }, [domain, state, isNumeric]);

  const needsActivity = getShouldShowActivity();
  const {
    points: history,
    events: rawEvents,
    loading,
    timeWindow,
  } = useModalHistory({
    enabled: isOpen && !!entity && !!conn,
    entityId: entity?.entity_id,
    conn,
    haUrl,
    haToken,
    hours: historyHours,
    strategy: 'rest',
    includeEvents: true,
    skipHistoryFetch: !(needsActivity || isNumeric),
    statsPeriod: 'hour',
    currentState: entity?.state,
  });

  // Event fallback — ensure BinaryTimeline always has at least one entry
  const historyEvents = useMemo(() => {
    if (rawEvents.length > 0) return rawEvents;
    if (entity?.state) {
      return [
        {
          state: entity.state,
          time: timeWindow.start,
          lastChanged: timeWindow.start?.toISOString(),
        },
      ];
    }
    return [];
  }, [rawEvents, entity?.state, timeWindow.start]);

  if (!isOpen || !entity) return null;

  const name = customName || attrs.friendly_name || entityId;
  const unit = attrs.unit_of_measurement ? `${attrs.unit_of_measurement}` : '';
  const deviceClass = attrs.device_class;
  const effectiveUnitMode = getEffectiveUnitMode(unitsMode, haConfig);
  const inferredUnitKind = inferUnitKind(deviceClass, unit);
  // Determine if entity should show activity timeline and log
  const shouldShowActivity = () => getShouldShowActivity();

  const hasActivity = shouldShowActivity();

  const lastChanged = entity.last_changed ? new Date(entity.last_changed).toLocaleString() : '--';
  const lastUpdated = entity.last_updated ? new Date(entity.last_updated).toLocaleString() : '--';

  const attributeEntries = Object.entries(attrs).filter(
    ([key]) => !['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'].includes(key)
  );

  const formatStateLabel = (value, dc = deviceClass) => {
    if (value === null || value === undefined) return '--';
    const normalized = String(value).toLowerCase();

    // Check for ISO Date (e.g. Scenes/Scripts)
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString();
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

  return (
    <AccessibleModalShell
      open={isOpen && !!entityId && !!entity}
      onClose={onClose}
      titleId={modalTitleId}
      overlayClassName="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6"
      overlayStyle={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      panelClassName="popup-anim relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl md:h-auto md:min-h-[550px] md:rounded-[3rem] lg:grid lg:grid-cols-5"
      panelStyle={{
        background: 'linear-gradient(135deg, var(--card-bg) 0%, var(--modal-bg) 100%)',
        borderColor: 'var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {() => (
        <>
        {/* Close Button */}
        <div className="absolute top-6 right-6 z-50 md:top-10 md:right-10">
          <button onClick={onClose} className="modal-close" aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* LEFT PANEL: Visuals & Graph (3 cols) */}
        <div
          className="relative flex shrink-0 flex-col overflow-hidden border-b p-6 md:p-10 lg:col-span-3 lg:border-r lg:border-b-0"
          style={{ borderColor: 'var(--glass-border)' }}
        >
          {/* Header */}
          <div className="mb-6 flex shrink-0 items-center gap-4">
            <div
              className="rounded-2xl p-4 transition-all duration-500"
              style={{
                backgroundColor:
                  entity.state === 'unavailable'
                    ? 'var(--status-error-bg)'
                    : 'var(--status-info-bg)',
                color:
                  entity.state === 'unavailable'
                    ? 'var(--status-error-fg)'
                    : 'var(--status-info-fg)',
              }}
            >
              <Icon className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <h2
                id={modalTitleId}
                className="truncate text-2xl leading-none font-light tracking-tight text-[var(--text-primary)] uppercase italic"
              >
                {name}
              </h2>
              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 ${entity.state === 'unavailable' ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${entity.state === 'unavailable' ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-success-fg)] shadow-[0_0_6px_var(--status-success-fg)]'}`}
                />
                <span className="pt-[1px] text-[10px] leading-none font-bold tracking-widest uppercase">
                  {String(displayState)} {displayUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {isNumeric && !hasActivity ? (
              <div className="relative h-full min-h-[250px] w-full">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--text-primary)] opacity-20"></div>
                  </div>
                ) : (
                  <div className="-mr-4 -ml-4 h-full md:mr-0">
                    <SensorHistoryGraph
                      data={history}
                      height={350}
                      noDataLabel={t('sensorInfo.noHistory')}
                      strokeColor="var(--text-primary)"
                      areaColor="var(--text-primary)"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="custom-scrollbar -mr-2 flex-1 overflow-y-auto pr-2">
                {loading && (
                  <div className="flex h-[100px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--text-primary)] opacity-20"></div>
                  </div>
                )}

                {!loading && hasActivity && (
                  <>
                    <h4 className="mb-4 bg-transparent text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-80">
                      {t('history.activity')}
                    </h4>
                    <div className="mb-6">
                      <BinaryTimeline
                        events={historyEvents}
                        startTime={timeWindow.start}
                        endTime={timeWindow.end}
                      />
                    </div>

                    <h4 className="mb-4 border-b border-[var(--glass-border)] bg-transparent pb-2 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-80 shadow-sm">
                      {t('history.log')}
                    </h4>
                    <div className="custom-scrollbar max-h-64 space-y-1 overflow-y-auto pr-2">
                      {recentEvents.length === 0 && (
                        <div className="py-8 text-center text-sm text-[var(--text-secondary)] italic opacity-60">
                          {t('sensorInfo.noHistory')}
                        </div>
                      )}
                      {recentEvents.map((event, idx) => {
                        let stateLabel = formatStateLabel(event.state, deviceClass);
                        const domain = entityId?.split('.')?.[0];

                        // Specific formatting for Scenes in log
                        if (
                          domain === 'scene' &&
                          String(event.state).match(/^\d{4}-\d{2}-\d{2}T/)
                        ) {
                          stateLabel = `${t('state.sceneSet')} ${formatRelativeTime(event.state, t)}`;
                        }

                        const useStateOnly =
                          (domain === 'binary_sensor' || domain === 'motion') &&
                          (deviceClass === 'motion' ||
                            deviceClass === 'occupancy' ||
                            deviceClass === 'presence');
                        const logLabel =
                          useStateOnly || domain === 'scene'
                            ? domain === 'scene'
                              ? stateLabel
                              : t('history.stateOnly').replace('{state}', stateLabel)
                            : t('history.wasState').replace('{state}', stateLabel);

                        return (
                          <div
                            key={`${event.lastChanged || idx}`}
                            className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-white/5 hover:bg-white/5"
                          >
                            <div
                              className={`h-2 w-2 flex-shrink-0 rounded-full ${event.state === 'on' || event.state === 'true' || event.state === 'open' || event.state === 'unlocked' || event.state === 'playing' || event.state > 0 ? 'bg-[var(--status-success-fg)] opacity-80' : 'bg-[var(--text-secondary)] opacity-35'}`}
                            />
                            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                              <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                                {logLabel}
                              </span>
                              <span className="font-mono text-xs whitespace-nowrap text-[var(--text-secondary)] opacity-70 transition-opacity group-hover:opacity-100">
                                {formatRelativeTime(event.time, t)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {!loading && !hasActivity && isNumeric && (
                  <div className="-mr-4 -ml-4 h-full md:mr-0">
                    <SensorHistoryGraph
                      data={history}
                      height={350}
                      noDataLabel={t('sensorInfo.noHistory')}
                      strokeColor="var(--text-primary)"
                      areaColor="var(--text-primary)"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Meta & Attributes (2 cols) */}
        <div className="relative flex flex-col gap-10 overflow-y-auto bg-[var(--glass-bg)]/10 p-6 md:p-10 lg:col-span-2">
          {/* Timestamps */}
          <div>
            <h4 className="mb-6 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-40">
              {t('sensorInfo.timeline')}
            </h4>
            <div className="space-y-6">
              <div className="relative border-l border-[var(--glass-border)] pl-4">
                <div className="absolute top-1.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-[var(--accent-color)]"></div>
                <p className="mb-0.5 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase opacity-50">
                  {t('sensorInfo.lastChanged')}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{lastChanged}</p>
              </div>
              <div className="relative border-l border-[var(--glass-border)] pl-4">
                <div className="absolute top-1.5 -left-[3px] h-1.5 w-1.5 rounded-full bg-purple-400"></div>
                <p className="mb-0.5 text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase opacity-50">
                  {t('sensorInfo.lastUpdated')}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">{lastUpdated}</p>
              </div>
            </div>
          </div>

          {/* History Range */}
          <div>
            <h4 className="mb-4 text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-40">
              {t('history.rangeHours')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {[6, 12, 24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setHistoryHours(hours)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${historyHours === hours ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          {/* Attributes */}
          {attributeEntries.length > 0 && (
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase opacity-40">
                  {t('sensorInfo.attributes')}
                </h4>
              </div>

              <div className="space-y-4">
                {attributeEntries.map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] capitalize uppercase opacity-40">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-sm leading-snug font-medium break-words text-[var(--text-primary)] opacity-80">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-10 opacity-30">
            <p className="text-center font-mono text-[10px] select-all">{entityId}</p>
          </div>
        </div>
        </>
      )}
    </AccessibleModalShell>
  );
}
