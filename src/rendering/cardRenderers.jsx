/**
 * Card renderer functions extracted from App.jsx.
 *
 * Each function receives (cardId, dragProps, getControls, cardStyle, settingsKey, ctx)
 * where `ctx` is a shared context object containing entities, settings, callbacks, etc.
 *
 * Usage in App.jsx:
 *   const ctx = { entities, editMode, conn, ... };
 *   dispatchCardRender(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
 */
import {
  CalendarCard,
  CameraCard,
  CarCard,
  CoverCard,
  TodoCard,
  GenericAndroidTVCard,
  GenericClimateCard,
  GenericEnergyCostCard,
  GenericNordpoolCard,
  LightCard,
  MediaPlayerCard,
  MediaGroupCard,
  MissingEntityCard,
  RoomCard,
  SensorCard,
  VacuumCard,
  WeatherTempCard,
} from '../components';

import { Activity, Hash, ToggleRight, Power, Workflow } from '../icons';
import { getIconComponent } from '../icons';
import { getLocaleForLanguage } from '../i18n';

// ─── Individual Card Renderers ───────────────────────────────────────────────

export function renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, conn, cardSettings, customNames, customIcons, getA, callService, setShowSensorInfoModal, t } = ctx;
  const entity = entities[cardId];

  if (!entity) {
    if (editMode) {
      return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
    }
    return null;
  }

  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const name = customNames[cardId] || getA(cardId, 'friendly_name', cardId);
  const domain = cardId.split('.')[0];
  const defaultIcons = { sensor: Activity, input_number: Hash, input_boolean: ToggleRight, switch: Power, default: Activity };
  const DefaultIcon = defaultIcons[domain] || defaultIcons.default;
  const sensorIconName = customIcons[cardId] || entity?.attributes?.icon;
  const Icon = sensorIconName ? (getIconComponent(sensorIconName) || DefaultIcon) : DefaultIcon;

  const handleControl = (action) => {
    if (domain === 'input_number') {
      if (action === 'increment') callService('input_number', 'increment', { entity_id: cardId });
      if (action === 'decrement') callService('input_number', 'decrement', { entity_id: cardId });
    }
    if (domain === 'input_boolean' || domain === 'switch' || domain === 'light' || domain === 'automation') {
      if (action === 'toggle') callService(domain, 'toggle', { entity_id: cardId });
    }
    if (domain === 'script' || domain === 'scene') {
      if (action === 'turn_on') callService(domain, 'turn_on', { entity_id: cardId });
    }
  };

  return (
    <SensorCard
      key={cardId}
      entity={entity}
      conn={conn}
      settings={settings}
      dragProps={dragProps}
      cardStyle={cardStyle}
      editMode={editMode}
      controls={getControls(cardId)}
      Icon={Icon}
      name={name}
      t={t}
      onControl={handleControl}
      onOpen={() => { if (!editMode) setShowSensorInfoModal(cardId); }}
    />
  );
}

export function renderLightCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, getA, callService, optimisticLightBrightness, setOptimisticLightBrightness, setShowLightModal, t } = ctx;
  return (
    <LightCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getA={getA} callService={callService}
      onOpen={() => { if (!editMode) setShowLightModal(cardId); }}
      optimisticLightBrightness={optimisticLightBrightness}
      setOptimisticLightBrightness={setOptimisticLightBrightness}
      t={t}
    />
  );
}

export function renderAutomationCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, customNames, customIcons, getA, callService, t } = ctx;
  const isOn = entities[cardId]?.state === 'on';
  const friendlyName = customNames[cardId] || getA(cardId, 'friendly_name') || cardId;
  const automationIconName = customIcons[cardId] || entities[cardId]?.attributes?.icon;
  const Icon = automationIconName ? (getIconComponent(automationIconName) || Workflow) : Workflow;

  return (
    <div
      key={cardId} {...dragProps}
      data-haptic={editMode ? undefined : 'card'}
      className={`touch-feedback w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border group relative overflow-hidden font-sans mb-3 break-inside-avoid ${!editMode ? 'cursor-pointer active:scale-98' : 'cursor-move'}`}
      style={{
        ...cardStyle,
        backgroundColor: isOn ? 'rgba(59, 130, 246, 0.03)' : 'rgba(15, 23, 42, 0.6)',
        borderColor: isOn ? 'rgba(59, 130, 246, 0.15)' : (editMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.04)')
      }}
      onClick={(_e) => { if (!editMode) callService('automation', 'toggle', { entity_id: cardId }); }}
    >
      {getControls(cardId)}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl transition-all ${isOn ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}>
          <Icon className="w-5 h-5 stroke-[1.5px]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)] leading-tight">{friendlyName}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] mt-0.5">
            {isOn ? t('status.active') : t('status.off')}
          </span>
        </div>
      </div>
      <div className={`w-10 h-6 rounded-full relative transition-all ${isOn ? 'bg-blue-500/80' : 'bg-[var(--glass-bg-hover)]'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md ${isOn ? 'left-[calc(100%-20px)]' : 'left-1'}`} />
      </div>
    </div>
  );
}

export function renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, getS, getA, getEntityImageUrl, callService, setActiveCarModal, isMobile, t } = ctx;
  return (
    <CarCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getS={getS} getA={getA} getEntityImageUrl={getEntityImageUrl} callService={callService}
      onOpen={() => { if (!editMode) setActiveCarModal(cardId); }}
      isMobile={isMobile} t={t}
    />
  );
}

export function renderVacuumCard(vacuumId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, getA, callService, setActiveVacuumId, setShowVacuumModal, isMobile, t } = ctx;
  return (
    <VacuumCard
      key={vacuumId} vacuumId={vacuumId} dragProps={dragProps} controls={getControls(vacuumId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} customIcons={customIcons}
      getA={getA} callService={callService}
      onOpen={() => { if (!editMode) { setActiveVacuumId(vacuumId); setShowVacuumModal(true); } }}
      isMobile={isMobile} t={t}
    />
  );
}

export function renderMediaPlayerCard(mpId, dragProps, getControls, cardStyle, _settingsKey, ctx) {
  const { entities, editMode, customNames, getA, getEntityImageUrl, callService, isMediaActive, openMediaModal, t } = ctx;
  return (
    <MediaPlayerCard
      key={mpId} mpId={mpId} dragProps={dragProps} controls={getControls(mpId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      customNames={customNames} getA={getA} getEntityImageUrl={getEntityImageUrl}
      callService={callService} isMediaActive={isMediaActive}
      onOpen={openMediaModal} t={t}
    />
  );
}

export function renderMediaGroupCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, getA, getEntityImageUrl, callService, isMediaActive, saveCardSetting, openMediaModal, t } = ctx;
  return (
    <MediaGroupCard
      key={cardId} cardId={cardId} dragProps={dragProps} controls={getControls(cardId)}
      cardStyle={cardStyle} entities={entities} editMode={editMode}
      cardSettings={cardSettings} settingsKey={settingsKey}
      customNames={customNames} getA={getA} getEntityImageUrl={getEntityImageUrl}
      callService={callService} isMediaActive={isMediaActive}
      saveCardSetting={saveCardSetting} onOpen={openMediaModal} t={t}
    />
  );
}

export function renderWeatherTempCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, tempHistoryById, setShowWeatherModal, t } = ctx;
  return (
    <WeatherTempCard
      cardId={cardId}
      dragProps={dragProps}
      getControls={getControls}
      cardStyle={cardStyle}
      settingsKey={settingsKey}
      cardSettings={cardSettings}
      entities={entities}
      tempHistory={[]}
      tempHistoryById={tempHistoryById}
      outsideTempId={null}
      weatherEntityId={null}
      editMode={editMode}
      onOpen={() => { if (!editMode) setShowWeatherModal(cardId); }}
      t={t}
    />
  );
}

export function renderGenericClimateCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, callService, setActiveClimateEntityModal, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entityId = settings.climateId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    if (editMode) {
      return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
    }
    return null;
  }

  return (
    <GenericClimateCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setActiveClimateEntityModal(entityId)}
      onSetTemperature={(temp) => callService('climate', 'set_temperature', { entity_id: entityId, temperature: temp })}
      settings={settings}
      t={t}
    />
  );
}

export function renderGenericCostCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, setShowCostModal, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  return (
    <GenericEnergyCostCard
      cardId={cardId}
      todayEntityId={settings.todayId}
      monthEntityId={settings.monthId}
      entities={entities}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      decimals={settings.decimals ?? 0}
      settings={settings}
      onOpen={() => setShowCostModal(cardId)}
      t={t}
    />
  );
}

export function renderGenericAndroidTVCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, getA, getEntityImageUrl, setShowAndroidTVModal, callService, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const mediaPlayerId = settings.mediaPlayerId;
  const remoteId = settings.remoteId;
  const linkedMediaPlayers = settings.linkedMediaPlayers;

  if (!mediaPlayerId) return null;

  return (
    <GenericAndroidTVCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      entities={entities}
      mediaPlayerId={mediaPlayerId}
      remoteId={remoteId}
      linkedMediaPlayers={linkedMediaPlayers}
      size={settings.size}
      getA={getA}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => setShowAndroidTVModal(cardId)}
      customNames={customNames}
      t={t}
      callService={callService}
    />
  );
}

export function renderCalendarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, conn, cardSettings, customNames, customIcons, language, setShowCalendarModal, setShowEditCardModal, setEditCardSettingsKey, t } = ctx;
  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  const locale = getLocaleForLanguage(language);
  return (
    <CalendarCard
      key={cardId}
      cardId={cardId}
      settings={cardSettings[settingsKey] || cardSettings[cardId] || {}}
      conn={conn}
      t={t}
      locale={locale}
      dragProps={dragProps}
      getControls={getControls}
      isEditMode={editMode}
      className="h-full"
      style={cardStyle}
      size={sizeSetting}
      iconName={customIcons[cardId] || null}
      customName={customNames[cardId] || null}
      onClick={(e) => {
        e.stopPropagation();
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else {
          setShowCalendarModal(true);
        }
      }}
    />
  );
}

export function renderTodoCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, conn, cardSettings, customNames, customIcons, setShowTodoModal, setShowEditCardModal, setEditCardSettingsKey, t } = ctx;
  const sizeSetting = cardSettings[settingsKey]?.size || cardSettings[cardId]?.size;
  return (
    <TodoCard
      key={cardId}
      cardId={cardId}
      settings={cardSettings[settingsKey] || cardSettings[cardId] || {}}
      conn={conn}
      t={t}
      dragProps={dragProps}
      getControls={getControls}
      isEditMode={editMode}
      className="h-full"
      style={cardStyle}
      size={sizeSetting}
      iconName={customIcons[cardId] || null}
      customName={customNames[cardId] || null}
      onClick={(e) => {
        e.stopPropagation();
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else {
          setShowTodoModal(cardId);
        }
      }}
    />
  );
}

export function renderNordpoolCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, saveCardSetting, setShowNordpoolModal, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entity = entities[settings.nordpoolId];
  if (!entity) return null;

  return (
    <GenericNordpoolCard
      cardId={cardId}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      entity={entity}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setShowNordpoolModal(cardId)}
      settings={settings}
      saveCardSetting={saveCardSetting}
      t={t}
    />
  );
}

export function renderCoverCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, callService, setShowCoverModal, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entityId = settings.coverId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    if (editMode) {
      return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
    }
    return null;
  }

  return (
    <CoverCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => setShowCoverModal(cardId)}
      callService={callService}
      settings={settings}
      t={t}
    />
  );
}

export function renderRoomCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, conn, cardSettings, customNames, customIcons, callService, setShowRoomModal, setShowEditCardModal, setEditCardSettingsKey, t } = ctx;
  const roomSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  return (
    <RoomCard
      cardId={cardId}
      settings={roomSettings}
      entities={entities}
      conn={conn}
      callService={(domain, service, data) => callService(domain, service, data)}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      onOpen={() => {
        if (editMode) {
          setShowEditCardModal(cardId);
          setEditCardSettingsKey(settingsKey);
        } else {
          setShowRoomModal(cardId);
        }
      }}
      t={t}
    />
  );
}

export function renderCameraCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { entities, editMode, cardSettings, customNames, customIcons, getEntityImageUrl, setShowCameraModal, t } = ctx;
  const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  const entityId = settings.cameraId;
  const entity = entityId ? entities[entityId] : null;

  if (!entity || !entityId) {
    if (editMode) {
      return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={t} />;
    }
    return null;
  }

  return (
    <CameraCard
      key={cardId}
      cardId={cardId}
      entityId={entityId}
      entity={entity}
      dragProps={dragProps}
      controls={getControls(cardId)}
      cardStyle={cardStyle}
      editMode={editMode}
      customNames={customNames}
      customIcons={customIcons}
      getEntityImageUrl={getEntityImageUrl}
      onOpen={() => setShowCameraModal(cardId)}
      t={t}
    />
  );
}

// ─── Card Type Dispatch ──────────────────────────────────────────────────────

/**
 * Routes a cardId to the correct renderer based on its type/prefix.
 * Returns JSX for the card, or null if the card should not be rendered.
 */
/**
 * Card type registry — maps prefix patterns to render functions.
 * To add a new card type, simply add an entry here.
 * Entries are checked in order; first match wins.
 */
const CARD_REGISTRY = [
  { prefix: 'light_',          renderer: renderLightCard },
  { prefix: 'light.',          renderer: renderLightCard },
  { prefix: 'vacuum.',         renderer: renderVacuumCard },
  { prefix: 'media_player.',   renderer: renderMediaPlayerCard },
  { prefix: 'media_group_',    renderer: renderMediaGroupCard },
  { prefix: 'calendar_card_',  renderer: renderCalendarCard },
  { prefix: 'climate_card_',   renderer: renderGenericClimateCard },
  { prefix: 'todo_card_',      renderer: renderTodoCard },
  { prefix: 'cost_card_',      renderer: renderGenericCostCard },
  { prefix: 'weather_temp_',   renderer: renderWeatherTempCard },
  { prefix: 'androidtv_card_', renderer: renderGenericAndroidTVCard },
  { prefix: 'car_card_',       renderer: renderCarCard },
  { prefix: 'nordpool_card_',  renderer: renderNordpoolCard },
  { prefix: 'cover_card_',     renderer: renderCoverCard },
  { prefix: 'room_card_',      renderer: renderRoomCard },
  { prefix: 'camera_card_',    renderer: renderCameraCard },
];

export function dispatchCardRender(cardId, dragProps, getControls, cardStyle, settingsKey, ctx) {
  const { editMode, cardSettings, activePage } = ctx;

  // Automations may be overridden to entity/toggle/sensor type
  if (cardId.startsWith('automation.')) {
    const settings = cardSettings[settingsKey] || cardSettings[cardId] || {};
    if (['entity', 'toggle', 'sensor'].includes(settings.type)) {
      return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
    }
    return renderAutomationCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  // Registry-driven lookup
  for (const { prefix, renderer } of CARD_REGISTRY) {
    if (cardId.startsWith(prefix)) {
      return renderer(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
    }
  }

  // Generic entity/toggle/sensor type
  const genericSettings = cardSettings[settingsKey] || cardSettings[cardId] || {};
  if (['sensor', 'entity', 'toggle'].includes(genericSettings.type)) {
    return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  // Settings page fallback — render as sensor
  if (activePage === 'settings' && !['car'].includes(cardId) && !cardId.startsWith('light_') && !cardId.startsWith('media_player')) {
    return renderSensorCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  // Legacy media_player placeholder
  if (editMode && cardId === 'media_player') {
    return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} label="Legacy" t={ctx.t} />;
  }

  // Empty/missing media groups in edit mode
  if (editMode && cardId.startsWith('media_group_')) {
    return <MissingEntityCard cardId={cardId} dragProps={dragProps} controls={getControls(cardId)} cardStyle={cardStyle} t={ctx.t} />;
  }

  // Final fallback
  if (cardId === 'car') {
    return renderCarCard(cardId, dragProps, getControls, cardStyle, settingsKey, ctx);
  }

  return null;
}
