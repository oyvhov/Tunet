import React from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getEntitiesForArea } from '../../services/haClient';

export function RoomSettingsSection({
  conn,
  editSettings,
  editSettingsKey,
  saveCardSetting,
  entities,
  t,
  pageOptions = [],
}) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [domainFilter, setDomainFilter] = React.useState('all');
  const [showEntityFilter, setShowEntityFilter] = React.useState(true);
  const [showCardFeatures, setShowCardFeatures] = React.useState(true);

  React.useEffect(() => {
    const keys = [
      'mainLightEntityId',
      'tempEntityId',
      'motionEntityId',
      'humidityEntityId',
      'climateEntityId',
    ];
    keys.forEach((key) => {
      if (editSettings[key] === '__none__') {
        saveCardSetting(editSettingsKey, key, null);
      }
    });
  }, [editSettings, editSettingsKey, saveCardSetting]);

  const roomEntityIds = React.useMemo(
    () => (Array.isArray(editSettings.entityIds) ? editSettings.entityIds : []),
    [editSettings.entityIds]
  );
  const excludedEntityIds = React.useMemo(
    () => (Array.isArray(editSettings.excludedEntityIds) ? editSettings.excludedEntityIds : []),
    [editSettings.excludedEntityIds]
  );
  const activeAreaEntityIds = React.useMemo(
    () => roomEntityIds.filter((id) => !excludedEntityIds.includes(id)),
    [roomEntityIds, excludedEntityIds]
  );

  const applySearchAndDomain = React.useCallback(
    (ids) =>
      ids.filter((id) => {
        if (domainFilter !== 'all') {
          if (domainFilter === '_motion') {
            const e = entities[id];
            const dc = e?.attributes?.device_class;
            if (dc !== 'motion' && dc !== 'occupancy' && dc !== 'presence') return false;
          } else if (domainFilter === '_temperature') {
            const e = entities[id];
            if (
              !(
                e?.attributes?.device_class === 'temperature' ||
                id.includes('temperature') ||
                id.includes('temp')
              )
            )
              return false;
          } else if (domainFilter === '_door') {
            const e = entities[id];
            const dc = e?.attributes?.device_class;
            if (dc !== 'door' && dc !== 'window' && dc !== 'garage_door') return false;
          } else if (!id.startsWith(`${domainFilter}.`)) {
            return false;
          }
        }
        if (!query) return true;
        const q = query.toLowerCase();
        const name = entities[id]?.attributes?.friendly_name || id;
        return id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      }),
    [domainFilter, query, entities]
  );

  const filteredAreaEntityIds = React.useMemo(
    () => applySearchAndDomain(roomEntityIds),
    [applySearchAndDomain, roomEntityIds]
  );

  const domainScopedEntityIds = React.useMemo(() => {
    if (domainFilter === 'all') return roomEntityIds;
    return roomEntityIds.filter((id) => id.startsWith(`${domainFilter}.`));
  }, [roomEntityIds, domainFilter]);

  const handleRefresh = async () => {
    if (!conn || !editSettings.areaId) return;
    setRefreshing(true);
    try {
      const newEntities = await getEntitiesForArea(conn, editSettings.areaId);
      saveCardSetting(editSettingsKey, 'entityIds', newEntities);
    } catch (err) {
      console.error('Failed to refresh room entities:', err);
    }
    setRefreshing(false);
  };

  const toggleEntityListMembership = (settingKey, entityId) => {
    const list = Array.isArray(editSettings[settingKey]) ? editSettings[settingKey] : [];
    const exists = list.includes(entityId);
    const next = exists ? list.filter((id) => id !== entityId) : [...list, entityId];
    saveCardSetting(editSettingsKey, settingKey, next);
  };

  const areAllDomainEntitiesExcluded =
    roomEntityIds.length > 0 && roomEntityIds.every((id) => excludedEntityIds.includes(id));
  const hasExcludedDomainEntities = roomEntityIds.some((id) => excludedEntityIds.includes(id));

  const handleExcludeAllEntities = () => {
    if (!roomEntityIds.length || areAllDomainEntitiesExcluded) return;
    const confirmed = globalThis.confirm(
      t('room.excludeAllConfirm') || 'Are you sure you want to exclude all entities in this room?'
    );
    if (!confirmed) return;
    const mergedExcluded = Array.from(
      new Set([
        ...(Array.isArray(editSettings.excludedEntityIds) ? editSettings.excludedEntityIds : []),
        ...roomEntityIds,
      ])
    );
    saveCardSetting(editSettingsKey, 'excludedEntityIds', mergedExcluded);
  };

  const handleIncludeAllEntities = () => {
    if (!roomEntityIds.length || !hasExcludedDomainEntities) return;
    const currentExcluded = Array.isArray(editSettings.excludedEntityIds)
      ? editSettings.excludedEntityIds
      : [];
    const nextExcluded = currentExcluded.filter((id) => !roomEntityIds.includes(id));
    saveCardSetting(editSettingsKey, 'excludedEntityIds', nextExcluded);
  };

  const cardToggleOptions = [
    { key: 'showLights', label: t('room.showLights'), defaultVal: true },
    { key: 'showTemp', label: t('room.showTemp'), defaultVal: true },
    { key: 'showMotion', label: t('room.showMotion'), defaultVal: true },
    { key: 'showLightChip', label: t('room.showLightChip') || 'Show light chip', defaultVal: true },
    { key: 'showMediaChip', label: t('room.showMediaChip') || 'Show media chip', defaultVal: true },
    {
      key: 'showActiveChip',
      label: t('room.showActiveChip') || 'Show active devices chip',
      defaultVal: true,
    },
    {
      key: 'showVacuumChip',
      label: t('room.showVacuumChip') || 'Show vacuum chip',
      defaultVal: true,
    },
    {
      key: 'showCoverChip',
      label: t('room.showCoverChip') || 'Show cover chip',
      defaultVal: true,
    },
    {
      key: 'showDoorChip',
      label: t('room.showDoorChip') || 'Show door/window chip',
      defaultVal: true,
    },
    {
      key: 'showOccupiedIndicator',
      label: t('room.showOccupiedIndicator') || 'Show occupied indicator',
      defaultVal: true,
    },
    {
      key: 'showIconWatermark',
      label: t('room.showIconWatermark') || 'Show icon watermark',
      defaultVal: true,
    },
  ];

  const hasAutoCandidates = React.useMemo(
    () => ({
      mainLightEntityId: activeAreaEntityIds.some((id) => id.startsWith('light.')),
      tempEntityId: activeAreaEntityIds.some((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'temperature' ||
            id.includes('temperature') ||
            id.includes('temp'))
        );
      }),
      motionEntityId: activeAreaEntityIds.some((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'motion' ||
            e.attributes?.device_class === 'occupancy' ||
            e.attributes?.device_class === 'presence')
        );
      }),
      vacuumEntityId: activeAreaEntityIds.some((id) => id.startsWith('vacuum.')),
      coverEntityId: activeAreaEntityIds.some((id) => id.startsWith('cover.')),
      doorEntityId: activeAreaEntityIds.some((id) => {
        const e = entities[id];
        return (
          e &&
          (e.attributes?.device_class === 'door' ||
            e.attributes?.device_class === 'window' ||
            e.attributes?.device_class === 'garage_door')
        );
      }),
    }),
    [activeAreaEntityIds, entities]
  );

  const hasSource = React.useMemo(() => {
    const selected = {
      mainLightEntityId: editSettings.mainLightEntityId,
      tempEntityId: editSettings.tempEntityId,
      motionEntityId: editSettings.motionEntityId,
      vacuumEntityId: editSettings.vacuumEntityId,
      coverEntityId: editSettings.coverEntityId,
      doorEntityId: editSettings.doorEntityId,
    };
    return {
      mainLightEntityId: !!selected.mainLightEntityId || hasAutoCandidates.mainLightEntityId,
      tempEntityId: !!selected.tempEntityId || hasAutoCandidates.tempEntityId,
      motionEntityId: !!selected.motionEntityId || hasAutoCandidates.motionEntityId,
      vacuumEntityId: !!selected.vacuumEntityId || hasAutoCandidates.vacuumEntityId,
      coverEntityId: !!selected.coverEntityId || hasAutoCandidates.coverEntityId,
      doorEntityId: !!selected.doorEntityId || hasAutoCandidates.doorEntityId,
    };
  }, [editSettings, hasAutoCandidates]);

  const compactFeatureOptions = cardToggleOptions.filter((option) => {
    if (['showLights', 'showLightChip'].includes(option.key)) return hasSource.mainLightEntityId;
    if (option.key === 'showTemp') return hasSource.tempEntityId;
    if (['showMotion', 'showOccupiedIndicator'].includes(option.key))
      return hasSource.motionEntityId;
    if (option.key === 'showVacuumChip') return hasSource.vacuumEntityId;
    if (option.key === 'showCoverChip') return hasSource.coverEntityId;
    if (option.key === 'showDoorChip') return hasSource.doorEntityId;
    if (option.key === 'showMediaChip')
      return activeAreaEntityIds.some((id) => id.startsWith('media_player.'));
    if (option.key === 'showActiveChip') return activeAreaEntityIds.length > 0;
    return true;
  });

  const domainLabelMap = {
    all: t('room.filterAll') || 'All',
    light: t('room.domain.light') || 'Lights',
    climate: t('room.domain.climate') || 'Climate',
    vacuum: t('room.domain.vacuum') || 'Vacuum',
    media_player: t('room.domain.mediaPlayer') || 'Media',
    sensor: t('room.domain.sensor') || 'Sensors',
    binary_sensor: t('room.domain.binarySensor') || 'Binary Sensors',
    switch: t('room.domain.switch') || 'Switches',
    fan: t('room.domain.fan') || 'Fans',
    cover: t('room.domain.cover') || 'Covers',
    _motion: t('room.motionShort') || 'Motion',
    _temperature: t('room.tempShort') || 'Temp',
    _door: t('room.doorShort') || 'Door',
  };

  const presentDomainFilters = React.useMemo(() => {
    const domainKeys = [
      'all',
      'light',
      'climate',
      '_motion',
      '_temperature',
      'vacuum',
      'media_player',
      'sensor',
      'binary_sensor',
      'switch',
      'fan',
      'cover',
      '_door',
    ];

    return domainKeys.filter((key) => {
      if (key === 'all') return true;
      if (key === '_motion')
        return roomEntityIds.some((id) => {
          const e = entities[id];
          return (
            e &&
            (e.attributes?.device_class === 'motion' ||
              e.attributes?.device_class === 'occupancy' ||
              e.attributes?.device_class === 'presence')
          );
        });
      if (key === '_temperature')
        return roomEntityIds.some((id) => {
          const e = entities[id];
          return (
            e &&
            (e.attributes?.device_class === 'temperature' ||
              id.includes('temperature') ||
              id.includes('temp'))
          );
        });
      if (key === '_door')
        return roomEntityIds.some((id) => {
          const e = entities[id];
          return (
            e &&
            (e.attributes?.device_class === 'door' ||
              e.attributes?.device_class === 'window' ||
              e.attributes?.device_class === 'garage_door')
          );
        });
      return roomEntityIds.some((id) => id.startsWith(`${key}.`));
    });
  }, [roomEntityIds, entities]);

  const entityActionLabels = {
    main: t('room.mainShort') || 'Main',
    climate: t('room.domain.climate') || 'Climate',
    vacuum: t('room.domain.vacuum') || 'Vacuum',
    temp: t('room.tempShort') || 'Temp',
    motion: t('room.motionShort') || 'Motion',
    humidity: t('room.humidityShort') || 'Humidity',
    door: t('room.doorShort') || 'Door',
  };

  const navigateOnTap = editSettings.navigateOnTap === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 uppercase">
          <span>
            {roomEntityIds.length} {t('room.entityCount')}
          </span>
          <span className="opacity-50">•</span>
          <span>
            {activeAreaEntityIds.length} {t('room.filterActive') || 'active'}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !conn}
          className="popup-surface popup-surface-hover flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-1.5 text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {t('room.refreshEntities')}
        </button>
      </div>

      <div className="popup-surface space-y-4 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowEntityFilter((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            {t('room.entityFilter') || 'Entity filter'}
          </div>
          <span className="text-[var(--text-secondary)] transition-transform">
            {showEntityFilter ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>

        {showEntityFilter && (
          <>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('room.searchEntities') || 'Search entities'}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />

            <div className="flex flex-wrap gap-2">
              {presentDomainFilters.map((domain) => (
                <button
                  type="button"
                  key={domain}
                  onClick={() => setDomainFilter(domain)}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${domainFilter === domain ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                >
                  {domainLabelMap[domain] || domain.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                  {t('room.filterAreaEntities') || 'Area entities'}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleIncludeAllEntities}
                    disabled={!domainScopedEntityIds.length || !hasExcludedDomainEntities}
                    className="rounded-lg border border-green-400/40 bg-green-500/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-green-300 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('room.includeAll') || 'Include all'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExcludeAllEntities}
                    disabled={!domainScopedEntityIds.length || areAllDomainEntitiesExcluded}
                    className="rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-red-300 uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('room.excludeAll') || 'Exclude all'}
                  </button>
                </div>
              </div>
              <div className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
                {filteredAreaEntityIds.map((id) => {
                  const isExcluded = excludedEntityIds.includes(id);
                  const isLightEntity = id.startsWith('light.');
                  const isMainLight = editSettings.mainLightEntityId === id;
                  const entity = entities[id];
                  const deviceClass = entity?.attributes?.device_class;
                  const isClimateEntity = id.startsWith('climate.');
                  const isMainClimate = editSettings.climateEntityId === id;
                  const isVacuumEntity = id.startsWith('vacuum.');
                  const isMainVacuum = editSettings.vacuumEntityId === id;
                  const isTempEntity =
                    deviceClass === 'temperature' ||
                    id.includes('temperature') ||
                    id.includes('temp');
                  const isMainTemp = editSettings.tempEntityId === id;
                  const isMotionEntity =
                    deviceClass === 'motion' ||
                    deviceClass === 'occupancy' ||
                    deviceClass === 'presence';
                  const isMainMotion = editSettings.motionEntityId === id;
                  const isHumidityEntity = deviceClass === 'humidity';
                  const isMainHumidity = editSettings.humidityEntityId === id;
                  const isDoorEntity =
                    deviceClass === 'door' ||
                    deviceClass === 'window' ||
                    deviceClass === 'garage_door';
                  const isMainDoor = editSettings.doorEntityId === id;
                  return (
                    <div
                      key={`area-${id}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                          {entities[id]?.attributes?.friendly_name || id}
                        </div>
                        <div className="truncate text-[10px] text-[var(--text-muted)]">{id}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isLightEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'mainLightEntityId',
                                isMainLight ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainLight ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainLight && <span className="mr-0.5">★</span>}
                            {entityActionLabels.main}
                          </button>
                        )}
                        {isClimateEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'climateEntityId',
                                isMainClimate ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainClimate ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainClimate && <span className="mr-0.5">★</span>}
                            {entityActionLabels.climate}
                          </button>
                        )}
                        {isVacuumEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'vacuumEntityId',
                                isMainVacuum ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainVacuum ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainVacuum && <span className="mr-0.5">★</span>}
                            {entityActionLabels.vacuum}
                          </button>
                        )}
                        {isTempEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'tempEntityId',
                                isMainTemp ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainTemp ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainTemp && <span className="mr-0.5">★</span>}
                            {entityActionLabels.temp}
                          </button>
                        )}
                        {isMotionEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'motionEntityId',
                                isMainMotion ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainMotion ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainMotion && <span className="mr-0.5">★</span>}
                            {entityActionLabels.motion}
                          </button>
                        )}
                        {isHumidityEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'humidityEntityId',
                                isMainHumidity ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainHumidity ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainHumidity && <span className="mr-0.5">★</span>}
                            {entityActionLabels.humidity}
                          </button>
                        )}
                        {isDoorEntity && (
                          <button
                            type="button"
                            onClick={() =>
                              saveCardSetting(
                                editSettingsKey,
                                'doorEntityId',
                                isMainDoor ? null : id
                              )
                            }
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isMainDoor ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                          >
                            {isMainDoor && <span className="mr-0.5">★</span>}
                            {entityActionLabels.door}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleEntityListMembership('excludedEntityIds', id)}
                          className={`rounded-lg border px-2 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors ${isExcluded ? 'border-red-400/40 bg-red-500/15 text-red-300' : 'popup-surface popup-surface-hover border-transparent text-[var(--text-secondary)]'}`}
                        >
                          {isExcluded
                            ? t('room.excluded') || 'Excluded'
                            : t('room.exclude') || 'Exclude'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredAreaEntityIds.length === 0 && (
                  <div className="py-2 text-xs text-[var(--text-muted)]">
                    {t('form.noResults') || 'No results'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="popup-surface space-y-4 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setShowCardFeatures((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            {t('room.cardFeatures') || 'Card features'}
          </div>
          <span className="text-[var(--text-secondary)] transition-transform">
            {showCardFeatures ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </button>
        {showCardFeatures && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {compactFeatureOptions.map((opt) => {
              const value =
                editSettings[opt.key] !== undefined ? editSettings[opt.key] : opt.defaultVal;
              return (
                <div
                  key={opt.key}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--glass-bg)]/60 px-2.5 py-2"
                >
                  <span className="truncate pr-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                    {opt.label}
                  </span>
                  <button
                    onClick={() => saveCardSetting(editSettingsKey, opt.key, !value)}
                    className={`relative h-5 w-10 rounded-full transition-colors ${value ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
                  >
                    <div
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="popup-surface space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-[var(--text-primary)] uppercase">
              {t('room.navigateOnTap') || 'Navigate on tap'}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {t('room.navigateOnTapHint') ||
                'Open a dashboard page instead of the room popup when tapping this card.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => saveCardSetting(editSettingsKey, 'navigateOnTap', !navigateOnTap)}
            className={`relative h-6 w-12 rounded-full transition-colors ${navigateOnTap ? 'border border-[var(--glass-border)] bg-[var(--glass-bg-hover)]' : 'bg-[var(--glass-bg-hover)]'}`}
          >
            <span
              className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${navigateOnTap ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {navigateOnTap && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {t('room.navigateToPage') || 'Target page'}
            </label>
            <select
              value={editSettings.navigateToPageId || ''}
              onChange={(e) =>
                saveCardSetting(editSettingsKey, 'navigateToPageId', e.target.value || null)
              }
              className="popup-surface w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--glass-border)]"
              style={{ color: 'var(--text-primary)' }}
            >
              <option
                value=""
                style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
              >
                {t('room.selectTargetPage') || 'Select page'}
              </option>
              {pageOptions.map((page) => (
                <option
                  key={page.id}
                  value={page.id}
                  style={{ backgroundColor: 'var(--modal-bg)', color: 'var(--text-primary)' }}
                >
                  {page.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}