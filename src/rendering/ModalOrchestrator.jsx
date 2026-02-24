/**
 * ModalOrchestrator – renders every modal / sidebar for the dashboard.
 *
 * Extracted from the bottom of App.jsx's return block so that the main
 * component only deals with layout and grid rendering.
 *
 * Each modal is lazy-loaded and wrapped in <ModalSuspense> just like before.
 */
import { lazy, useMemo } from 'react';
import { ModalSuspense, getServerInfo } from '../components';
import { themes } from '../config/themes';
import { formatDuration } from '../utils';
import { buildOnboardingSteps, validateUrl } from '../config/onboarding';
import { prepareNordpoolData } from '../services';
import { useHomeAssistantMeta } from '../contexts';
import { useProfiles } from '../hooks/useProfiles';

// Lazy load all modals
const AddPageModal = lazy(() => import('../modals/AddPageModal'));
const AddCardContent = lazy(() => import('../modals/AddCardContent'));
const CalendarModal = lazy(() => import('../modals/CalendarModal'));
const ConfigModal = lazy(() => import('../modals/ConfigModal'));
const CostModal = lazy(() => import('../modals/CostModal'));
const EditCardModal = lazy(() => import('../modals/EditCardModal'));
const EditPageModal = lazy(() => import('../modals/EditPageModal'));
const GenericAndroidTVModal = lazy(() => import('../modals/GenericAndroidTVModal'));
const GenericClimateModal = lazy(() => import('../modals/GenericClimateModal'));
const GenericFanModal = lazy(() => import('../modals/GenericFanModal'));
const CoverModal = lazy(() => import('../modals/CoverModal'));
const AlarmModal = lazy(() => import('../modals/AlarmModal'));
const AlarmActionPinModal = lazy(() => import('../modals/AlarmActionPinModal'));
const CameraModal = lazy(() => import('../modals/CameraModal'));
const WeatherModal = lazy(() => import('../modals/WeatherModal'));
const LeafModal = lazy(() => import('../modals/LeafModal'));
const LightModal = lazy(() => import('../modals/LightModal'));
const MediaModal = lazy(() => import('../modals/MediaModal'));
const NordpoolModal = lazy(() => import('../modals/NordpoolModal'));
const PersonModal = lazy(() => import('../modals/PersonModal'));
const SensorModal = lazy(() => import('../modals/SensorModal'));
const StatusPillsConfigModal = lazy(() => import('../modals/StatusPillsConfigModal'));
const TodoModal = lazy(() => import('../modals/TodoModal'));
const RoomModal = lazy(() => import('../modals/RoomModal'));
const VacuumModal = lazy(() => import('../modals/VacuumModal'));
const ReminderModal = lazy(() => import('../modals/ReminderModal'));
const ReminderPopup = lazy(() => import('../modals/ReminderPopup'));

const ThemeSidebar = lazy(() => import('../components/sidebars/ThemeSidebar'));
const LayoutSidebar = lazy(() => import('../components/sidebars/LayoutSidebar'));
const HeaderSidebar = lazy(() => import('../components/sidebars/HeaderSidebar'));

export default function ModalOrchestrator({
  entities, conn, activeUrl, connected, authRef,
  config, setConfig,
  t, language, setLanguage,
  modals, appearance, layout, onboarding,
  pageManagement, entityHelpers, addCard, cardConfig,
  mediaTick,
  reminderProps,
}) {
  // ── Destructure grouped props ──────────────────────────────────────────
  const {
    showNordpoolModal, setShowNordpoolModal,
    showCostModal, setShowCostModal,
    activeClimateEntityModal, setActiveClimateEntityModal,
    showLightModal, setShowLightModal,
    activeCarModal, setActiveCarModal,
    showPersonModal, setShowPersonModal,
    showAndroidTVModal, setShowAndroidTVModal,
    showVacuumModal, setShowVacuumModal,
    showFanModal, setShowFanModal,
    showSensorInfoModal, setShowSensorInfoModal,
    showCalendarModal, setShowCalendarModal,
    showTodoModal, setShowTodoModal,
    showRoomModal, setShowRoomModal,
    showCoverModal, setShowCoverModal,
    showAlarmModal, setShowAlarmModal,
    showAlarmActionModal, setShowAlarmActionModal,
    showCameraModal, setShowCameraModal,
    showWeatherModal, setShowWeatherModal,
    activeMediaModal, setActiveMediaModal,
    activeMediaGroupKey, setActiveMediaGroupKey,
    activeMediaGroupIds, setActiveMediaGroupIds,
    activeMediaSessionSensorIds, setActiveMediaSessionSensorIds,
    activeMediaId, setActiveMediaId,
    showAddCardModal, setShowAddCardModal,
    showConfigModal, setShowConfigModal,
    showAddPageModal, setShowAddPageModal,
    showHeaderEditModal, setShowHeaderEditModal,
    showEditCardModal, setShowEditCardModal,
    showStatusPillsConfig, setShowStatusPillsConfig,
    activeVacuumId, setActiveVacuumId,
    showThemeSidebar, setShowThemeSidebar,
    showLayoutSidebar, setShowLayoutSidebar,
    editCardSettingsKey, setEditCardSettingsKey,
    configTab, setConfigTab,
    showReminderModal, setShowReminderModal,
  } = modals;

  const {
    currentTheme, setCurrentTheme,
    bgMode, setBgMode, bgColor, setBgColor,
    bgGradient, setBgGradient, bgImage, setBgImage,
    cardTransparency, setCardTransparency,
    cardBorderOpacity, setCardBorderOpacity,
    cardBgColor, setCardBgColor,
    inactivityTimeout, setInactivityTimeout,
  } = appearance;

  const {
    gridGapH, setGridGapH, gridGapV, setGridGapV,
    gridColumns, setGridColumns,
    dynamicGridColumns, setDynamicGridColumns,
    effectiveGridColumns,
    cardBorderRadius, setCardBorderRadius,
    sectionSpacing, updateSectionSpacing,
    headerTitle, headerScale, headerSettings,
    updateHeaderTitle, updateHeaderScale, updateHeaderSettings,
  } = layout;

  const {
    showOnboarding, setShowOnboarding, isOnboardingActive,
    onboardingStep, setOnboardingStep,
    onboardingUrlError, setOnboardingUrlError,
    onboardingTokenError, setOnboardingTokenError,
    testingConnection, testConnection,
    connectionTestResult, setConnectionTestResult,
    startOAuthLogin, handleOAuthLogout, canAdvanceOnboarding,
  } = onboarding;

  const {
    pageDefaults, editingPage, setEditingPage,
    newPageLabel, setNewPageLabel, newPageIcon, setNewPageIcon,
    createPage, createMediaPage, deletePage,
    pageSettings, savePageSetting, persistPageSettings,
    pagesConfig, persistConfig,
    activePage,
  } = pageManagement;

  const {
    callService, getEntityImageUrl, getA, getS,
    optimisticLightBrightness, setOptimisticLightBrightness,
    hvacMap, fanMap, swingMap,
    isSonosActive, isMediaActive,
  } = entityHelpers;

  const {
    addCardTargetPage, addCardType, setAddCardType,
    searchTerm, setSearchTerm,
    selectedEntities, setSelectedEntities,
    selectedWeatherId, setSelectedWeatherId,
    selectedTempId, setSelectedTempId,
    selectedAndroidTVMediaId, setSelectedAndroidTVMediaId,
    selectedAndroidTVRemoteId, setSelectedAndroidTVRemoteId,
    selectedCostTodayId, setSelectedCostTodayId,
    selectedCostMonthId, setSelectedCostMonthId,
    costSelectionTarget, setCostSelectionTarget,
    selectedNordpoolId, setSelectedNordpoolId,
    nordpoolDecimals, setNordpoolDecimals,
    selectedSpacerVariant, setSelectedSpacerVariant,
    onAddSelected,
    getAddCardAvailableLabel, getAddCardNoneLeftLabel,
  } = addCard;

  const {
    cardSettings, saveCardSetting, persistCardSettings,
    customNames, saveCustomName, persistCustomNames,
    customIcons, saveCustomIcon, persistCustomIcons,
    hiddenCards, toggleCardVisibility, persistHiddenCards,
    getCardSettingsKey,
    statusPillsConfig, saveStatusPillsConfig,
  } = cardConfig;

  // ── Edit modal props (computed here, not passed from App) ──────────────
  const resolveCarSettings = (_cardId, settings = {}) => settings;
  const editSettingsKey = showEditCardModal
    ? (editCardSettingsKey || getCardSettingsKey(showEditCardModal))
    : null;
  const editModalProps = useMemo(() => {
    if (!showEditCardModal) return {};
    const rawEditSettings = editSettingsKey
      ? (cardSettings[editSettingsKey] || cardSettings[showEditCardModal] || {})
      : {};
    const editId = showEditCardModal;
    const editEntity = editId ? entities[editId] : null;
    const isEditLight = !!editId && (editId.startsWith('light_') || editId.startsWith('light.'));
    const isEditMedia = !!editId && (editId.startsWith('media_player.') || editId === 'media_player' || editId.startsWith('media_group_'));
    const isEditCalendar = !!editId && editId.startsWith('calendar_card_');
    const isEditTodo = !!editId && editId.startsWith('todo_card_');
    const isEditCost = !!editId && editId.startsWith('cost_card_');
    const isEditAndroidTV = !!editId && editId.startsWith('androidtv_card_');
    const isEditVacuum = !!editId && editId.startsWith('vacuum.');
    const isEditAutomation = !!editId && editId.startsWith('automation.');
    const isEditCar = !!editId && (editId === 'car' || editId.startsWith('car_card_'));
    const isEditRoom = !!editId && editId.startsWith('room_card_');
    const isEditCover = !!editId && editId.startsWith('cover_card_');
    const isEditAlarm = !!editId && editId.startsWith('alarm_card_');
    const isEditSpacer = !!editId && editId.startsWith('spacer_card_');
    const isEditCamera = !!editId && editId.startsWith('camera_card_');
    const isEditFan = !!editId && (editId.startsWith('fan.') || editId.startsWith('fan_card_'));
    const editSettings = isEditCar ? resolveCarSettings(editId, rawEditSettings) : rawEditSettings;
    const isEditGenericType = (!!editSettings?.type && (editSettings.type === 'entity' || editSettings.type === 'toggle' || editSettings.type === 'sensor')) || isEditVacuum || isEditAutomation || isEditCar || isEditAndroidTV || isEditRoom || isEditFan;
    const isEditSensor = !!editSettings?.type && editSettings.type === 'sensor';
    const isEditWeatherTemp = !!editId && editId.startsWith('weather_temp_');
    const canEditName = !!editId && !isEditWeatherTemp && !isEditSpacer && editId !== 'media_player' && editId !== 'sonos';
    const isEditNordpool = !!editId && editId.startsWith('nordpool_card_');
    const canEditIcon = !!editId && (isEditLight || isEditCalendar || isEditTodo || isEditRoom || isEditCover || isEditAlarm || isEditNordpool || editId.startsWith('automation.') || editId.startsWith('vacuum.') || editId.startsWith('climate_card_') || editId.startsWith('cost_card_') || editId.startsWith('camera_card_') || (!!editEntity && !isEditMedia) || editId === 'car' || editId.startsWith('car_card_') || isEditFan);
    const canEditStatus = !!editEntity && !!editSettingsKey && editSettingsKey.startsWith('settings::');
    return {
      canEditName, canEditIcon, canEditStatus,
      isEditLight, isEditMedia, isEditCalendar, isEditTodo, isEditCost, isEditNordpool, isEditGenericType,
      isEditAndroidTV, isEditCar, isEditRoom, isEditSpacer, isEditCamera, isEditSensor, isEditWeatherTemp, isEditFan, isEditAlarm,
      editSettingsKey, editSettings,
    };
  }, [showEditCardModal, editSettingsKey, cardSettings, entities]);

  const onboardingSteps = buildOnboardingSteps(t);

  // ── Profiles & templates ───────────────────────────────────────────────
  const { haUser } = useHomeAssistantMeta();
  const profilesHook = useProfiles({
    haUser,
    contextSetters: {
      // PageContext setters
      persistConfig,
      persistCardSettings,
      persistPageSettings,
      persistCustomNames,
      persistCustomIcons,
      persistHiddenCards,
      setGridColumns,
      setGridGapH,
      setGridGapV,
      setCardBorderRadius,
      updateHeaderScale,
      updateHeaderTitle,
      updateHeaderSettings,
      updateSectionSpacing,
      saveStatusPillsConfig,
      // Reminder setters
      setAllReminders: reminderProps?.setAllReminders,
      // ConfigContext setters
      setCurrentTheme,
      setLanguage,
      setBgMode,
      setBgColor,
      setBgGradient,
      setBgImage,
      setCardTransparency,
      setCardBorderOpacity,
      setCardBgColor,
      setInactivityTimeout,
    },
  });

  // Combine hook output with haUser for easy passing to ConfigModal
  const profilesProps = {
    ...profilesHook,
    haUser,
  };

  return (
    <>
      {/* ── Config / Onboarding ─────────────────────────────────────────── */}
      {(showConfigModal || showOnboarding) && (
        <ModalSuspense>
          <ConfigModal
            open={showConfigModal || showOnboarding}
            isOnboardingActive={isOnboardingActive}
            t={t}
            configTab={configTab}
            setConfigTab={setConfigTab}
            onboardingSteps={onboardingSteps}
            onboardingStep={onboardingStep}
            setOnboardingStep={setOnboardingStep}
            canAdvanceOnboarding={canAdvanceOnboarding}
            connected={connected}
            activeUrl={activeUrl}
            config={config}
            setConfig={setConfig}
            onboardingUrlError={onboardingUrlError}
            setOnboardingUrlError={setOnboardingUrlError}
            onboardingTokenError={onboardingTokenError}
            setOnboardingTokenError={setOnboardingTokenError}
            setConnectionTestResult={setConnectionTestResult}
            connectionTestResult={connectionTestResult}
            validateUrl={validateUrl}
            testConnection={testConnection}
            testingConnection={testingConnection}
            startOAuthLogin={startOAuthLogin}
            handleOAuthLogout={handleOAuthLogout}
            language={language}
            setLanguage={setLanguage}
            inactivityTimeout={inactivityTimeout}
            setInactivityTimeout={setInactivityTimeout}
            entities={entities}
            getEntityImageUrl={getEntityImageUrl}
            callService={callService}
            onClose={() => setShowConfigModal(false)}
            onFinishOnboarding={() => { setShowOnboarding(false); setShowConfigModal(false); }}
            profiles={profilesProps}
          />
        </ModalSuspense>
      )}

      {/* ── Sidebars ────────────────────────────────────────────────────── */}
      <ModalSuspense>
        <ThemeSidebar
          open={showThemeSidebar}
          onClose={() => setShowThemeSidebar(false)}
          onSwitchToLayout={() => { setShowThemeSidebar(false); setShowLayoutSidebar(true); }}
          onSwitchToHeader={() => { setShowThemeSidebar(false); setShowHeaderEditModal(true); }}
          t={t}
          themes={themes}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          language={language}
          setLanguage={setLanguage}
          bgMode={bgMode}
          setBgMode={setBgMode}
          bgColor={bgColor}
          setBgColor={setBgColor}
          bgGradient={bgGradient}
          setBgGradient={setBgGradient}
          bgImage={bgImage}
          setBgImage={setBgImage}
          inactivityTimeout={inactivityTimeout}
          setInactivityTimeout={setInactivityTimeout}
        />
      </ModalSuspense>

      <ModalSuspense>
        <LayoutSidebar
          open={showLayoutSidebar}
          onClose={() => setShowLayoutSidebar(false)}
          onSwitchToTheme={() => { setShowLayoutSidebar(false); setShowThemeSidebar(true); }}
          onSwitchToHeader={() => { setShowLayoutSidebar(false); setShowHeaderEditModal(true); }}
          t={t}
          gridGapH={gridGapH}
          setGridGapH={setGridGapH}
          gridGapV={gridGapV}
          setGridGapV={setGridGapV}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
          dynamicGridColumns={dynamicGridColumns}
          setDynamicGridColumns={setDynamicGridColumns}
          effectiveGridColumns={effectiveGridColumns}
          cardBorderRadius={cardBorderRadius}
          setCardBorderRadius={setCardBorderRadius}
          cardTransparency={cardTransparency}
          setCardTransparency={setCardTransparency}
          cardBorderOpacity={cardBorderOpacity}
          setCardBorderOpacity={setCardBorderOpacity}
          cardBgColor={cardBgColor}
          setCardBgColor={setCardBgColor}
          sectionSpacing={sectionSpacing}
          updateSectionSpacing={updateSectionSpacing}
          activePage={activePage}
          pageSettings={pageSettings}
          savePageSetting={savePageSetting}
        />
      </ModalSuspense>

      <ModalSuspense>
        <HeaderSidebar
          open={showHeaderEditModal}
          onClose={() => setShowHeaderEditModal(false)}
          headerTitle={headerTitle}
          headerScale={headerScale}
          headerSettings={headerSettings}
          updateHeaderTitle={updateHeaderTitle}
          updateHeaderScale={updateHeaderScale}
          updateHeaderSettings={updateHeaderSettings}
          onSwitchToTheme={() => { setShowHeaderEditModal(false); setShowThemeSidebar(true); }}
          onSwitchToLayout={() => { setShowHeaderEditModal(false); setShowLayoutSidebar(true); }}
          t={t}
        />
      </ModalSuspense>

      {/* ── Card-specific modals ────────────────────────────────────────── */}
      {showNordpoolModal && (() => {
        const data = prepareNordpoolData(showNordpoolModal, { getCardSettingsKey, cardSettings, entities, customNames });
        if (!data) return null;
        return (
          <ModalSuspense>
            <NordpoolModal
              show={true}
              onClose={() => setShowNordpoolModal(null)}
              entity={data.entity}
              fullPriceData={data.fullPriceData}
              currentPriceIndex={data.currentPriceIndex}
              priceStats={data.priceStats}
              name={data.name}
              t={t}
              language={language}
              saveCardSetting={saveCardSetting}
              cardId={showNordpoolModal}
              settings={data.settings}
            />
          </ModalSuspense>
        );
      })()}

      {showCostModal && (() => {
        const settingsKey = getCardSettingsKey(showCostModal);
        const settings = cardSettings[settingsKey] || cardSettings[showCostModal] || {};
        const name = customNames?.[showCostModal] || t('energyCost.title');
        const iconName = customIcons?.[showCostModal] || null;
        return (
          <ModalSuspense>
            <CostModal
              show={true}
              onClose={() => setShowCostModal(null)}
              conn={conn}
              entities={entities}
              todayEntityId={settings.todayId}
              monthEntityId={settings.monthId}
              name={name}
              iconName={iconName}
              currency={settings.currency}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {activeClimateEntityModal && entities[activeClimateEntityModal] && (
        <ModalSuspense>
          <GenericClimateModal
            entityId={activeClimateEntityModal}
            entity={entities[activeClimateEntityModal]}
            onClose={() => setActiveClimateEntityModal(null)}
            callService={callService}
            hvacMap={hvacMap}
            fanMap={fanMap}
            swingMap={swingMap}
            t={t}
          />
        </ModalSuspense>
      )}

      {showLightModal && (
        <ModalSuspense>
          <LightModal
            show={!!showLightModal}
            onClose={() => setShowLightModal(null)}
            lightId={showLightModal}
            entities={entities}
            callService={callService}
            getA={getA}
            optimisticLightBrightness={optimisticLightBrightness}
            setOptimisticLightBrightness={setOptimisticLightBrightness}
            customIcons={customIcons}
            t={t}
          />
        </ModalSuspense>
      )}

      {showAndroidTVModal && (() => {
        const settings = cardSettings[getCardSettingsKey(showAndroidTVModal)] || {};
        return (
          <ModalSuspense>
            <GenericAndroidTVModal
              show={true}
              onClose={() => setShowAndroidTVModal(null)}
              entities={entities}
              mediaPlayerId={settings.mediaPlayerId}
              remoteId={settings.remoteId}
              linkedMediaPlayers={settings.linkedMediaPlayers}
              callService={callService}
              getA={getA}
              getEntityImageUrl={getEntityImageUrl}
              customNames={customNames}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showVacuumModal && (
        <ModalSuspense>
          <VacuumModal
            show={showVacuumModal}
            onClose={() => { setShowVacuumModal(false); setActiveVacuumId(null); }}
            entities={entities}
            callService={callService}
            getA={getA}
            t={t}
            vacuumId={activeVacuumId}
          />
        </ModalSuspense>
      )}

      {showFanModal && entities[showFanModal] && (
        <ModalSuspense>
          <GenericFanModal
            show={true}
            onClose={() => setShowFanModal(null)}
            entityId={showFanModal}
            entity={entities[showFanModal]}
            callService={callService}
            t={t}
          />
        </ModalSuspense>
      )}

      {activeCarModal && (() => {
        const settingsKey = getCardSettingsKey(activeCarModal);
        const settings = resolveCarSettings(activeCarModal, cardSettings[settingsKey] || cardSettings[activeCarModal] || {});
        const name = customNames[activeCarModal] || t('car.defaultName');
        return (
          <ModalSuspense>
            <LeafModal
              show={true}
              onClose={() => setActiveCarModal(null)}
              entities={entities}
              callService={callService}
              getS={getS}
              getA={getA}
              t={t}
              car={{ name, ...settings }}
            />
          </ModalSuspense>
        );
      })()}

      {showWeatherModal && (() => {
        const settingsKey = getCardSettingsKey(showWeatherModal);
        const settings = cardSettings[settingsKey] || cardSettings[showWeatherModal] || {};
        const weatherEntity = settings.weatherId ? entities[settings.weatherId] : null;
        const tempEntity = settings.tempId ? entities[settings.tempId] : null;
        if (!weatherEntity) return null;
        return (
          <ModalSuspense>
            <WeatherModal
              show={true}
              onClose={() => setShowWeatherModal(null)}
              conn={conn}
              weatherEntity={weatherEntity}
              tempEntity={tempEntity}
              language={language}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showCalendarModal && (
        <ModalSuspense>
          <CalendarModal
            show={showCalendarModal}
            onClose={() => setShowCalendarModal(false)}
            conn={conn}
            entities={entities}
            language={language}
            t={t}
          />
        </ModalSuspense>
      )}

      {showTodoModal && (() => {
        const todoSettingsKey = getCardSettingsKey(showTodoModal);
        const todoSettings = cardSettings[todoSettingsKey] || cardSettings[showTodoModal] || {};
        return (
          <ModalSuspense>
            <TodoModal
              show={true}
              onClose={() => setShowTodoModal(null)}
              conn={conn}
              entities={entities}
              settings={todoSettings}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showRoomModal && (() => {
        const roomSettingsKey = getCardSettingsKey(showRoomModal);
        const roomSettings = cardSettings[roomSettingsKey] || cardSettings[showRoomModal] || {};
        return (
          <ModalSuspense>
            <RoomModal
              show={true}
              onClose={() => setShowRoomModal(null)}
              settings={roomSettings}
              entities={entities}
              conn={conn}
              callService={(domain, service, data) => callService(domain, service, data)}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showCoverModal && (() => {
        const coverSettingsKey = getCardSettingsKey(showCoverModal);
        const coverSettings = cardSettings[coverSettingsKey] || cardSettings[showCoverModal] || {};
        const coverEntityId = coverSettings.coverId;
        const coverEntity = coverEntityId ? entities[coverEntityId] : null;
        if (!coverEntityId || !coverEntity) return null;
        return (
          <ModalSuspense>
            <CoverModal
              show={true}
              onClose={() => setShowCoverModal(null)}
              entityId={coverEntityId}
              entity={coverEntity}
              callService={callService}
              customIcons={customIcons}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showAlarmModal && (() => {
        const isDirectEntityId = typeof showAlarmModal === 'string' && showAlarmModal.startsWith('alarm_control_panel.');
        const alarmSettingsKey = isDirectEntityId ? null : getCardSettingsKey(showAlarmModal);
        const alarmSettings = isDirectEntityId ? {} : (cardSettings[alarmSettingsKey] || cardSettings[showAlarmModal] || {});
        const alarmEntityId = isDirectEntityId ? showAlarmModal : alarmSettings.alarmId;
        const alarmEntity = alarmEntityId ? entities[alarmEntityId] : null;
        if (!alarmEntityId || !alarmEntity) return null;
        return (
          <ModalSuspense>
            <AlarmModal
              show={true}
              onClose={() => setShowAlarmModal(null)}
              entityId={alarmEntityId}
              entity={alarmEntity}
              callService={callService}
              customName={isDirectEntityId ? null : customNames?.[showAlarmModal]}
              customIcon={isDirectEntityId ? null : customIcons?.[showAlarmModal]}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showAlarmActionModal && (() => {
        const actionCardId = showAlarmActionModal.cardId;
        const actionKey = showAlarmActionModal.actionKey;
        const alarmSettingsKey = getCardSettingsKey(actionCardId);
        const alarmSettings = cardSettings[alarmSettingsKey] || cardSettings[actionCardId] || {};
        const alarmEntityId = alarmSettings.alarmId;
        const alarmEntity = alarmEntityId ? entities[alarmEntityId] : null;
        if (!alarmEntityId || !alarmEntity || !actionKey) return null;

        return (
          <ModalSuspense>
            <AlarmActionPinModal
              show={true}
              onClose={() => setShowAlarmActionModal(null)}
              actionKey={actionKey}
              entityId={alarmEntityId}
              entity={alarmEntity}
              callService={callService}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {showCameraModal && (() => {
        const cameraSettingsKey = getCardSettingsKey(showCameraModal);
        const cameraSettings = cardSettings[cameraSettingsKey] || cardSettings[showCameraModal] || {};
        const cameraEntityId = cameraSettings.cameraId;
        const cameraEntity = cameraEntityId ? entities[cameraEntityId] : null;
        if (!cameraEntityId || !cameraEntity) return null;
        return (
          <ModalSuspense>
            <CameraModal
              show={true}
              onClose={() => setShowCameraModal(null)}
              entityId={cameraEntityId}
              entity={cameraEntity}
              customName={customNames?.[showCameraModal]}
              customIcon={customIcons?.[showCameraModal]}
              getEntityImageUrl={getEntityImageUrl}
              settings={cameraSettings}
              t={t}
            />
          </ModalSuspense>
        );
      })()}

      {/* ── Edit / Add modals ───────────────────────────────────────────── */}
      {showAddCardModal && (
        <ModalSuspense>
          <AddCardContent
            onClose={() => setShowAddCardModal(false)}
            addCardTargetPage={addCardTargetPage}
            addCardType={addCardType}
            setAddCardType={setAddCardType}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            entities={entities}
            pagesConfig={pagesConfig}
            selectedEntities={selectedEntities}
            setSelectedEntities={setSelectedEntities}
            selectedWeatherId={selectedWeatherId}
            setSelectedWeatherId={setSelectedWeatherId}
            selectedTempId={selectedTempId}
            setSelectedTempId={setSelectedTempId}
            selectedAndroidTVMediaId={selectedAndroidTVMediaId}
            setSelectedAndroidTVMediaId={setSelectedAndroidTVMediaId}
            selectedAndroidTVRemoteId={selectedAndroidTVRemoteId}
            setSelectedAndroidTVRemoteId={setSelectedAndroidTVRemoteId}
            selectedCostTodayId={selectedCostTodayId}
            setSelectedCostTodayId={setSelectedCostTodayId}
            selectedCostMonthId={selectedCostMonthId}
            setSelectedCostMonthId={setSelectedCostMonthId}
            costSelectionTarget={costSelectionTarget}
            setCostSelectionTarget={setCostSelectionTarget}
            selectedNordpoolId={selectedNordpoolId}
            setSelectedNordpoolId={setSelectedNordpoolId}
            nordpoolDecimals={nordpoolDecimals}
            setNordpoolDecimals={setNordpoolDecimals}
            selectedSpacerVariant={selectedSpacerVariant}
            setSelectedSpacerVariant={setSelectedSpacerVariant}
            onAddSelected={onAddSelected}
            onAddRoom={(area, areaEntityIds) => {
              const cardId = `room_card_${Date.now()}`;
              const newConfig = { ...pagesConfig };
              newConfig[addCardTargetPage] = [...(newConfig[addCardTargetPage] || []), cardId];
              persistConfig(newConfig);
              const settingsKey = getCardSettingsKey(cardId, addCardTargetPage);
              const newSettings = {
                ...cardSettings,
                [settingsKey]: {
                  areaId: area.area_id,
                  areaName: area.name || area.area_id,
                  entityIds: areaEntityIds,
                  showLights: true,
                  showTemp: true,
                  showMotion: true,
                  showHumidity: false,
                  showClimate: false,
                  size: 'large',
                }
              };
              persistCardSettings(newSettings);
              saveCustomName(cardId, area.name || area.area_id);
              setShowAddCardModal(false);
              setShowEditCardModal(cardId);
              setEditCardSettingsKey(settingsKey);
            }}
            conn={conn}
            getAddCardAvailableLabel={getAddCardAvailableLabel}
            getAddCardNoneLeftLabel={getAddCardNoneLeftLabel}
            t={t}
          />
        </ModalSuspense>
      )}

      {editingPage && (
        <ModalSuspense>
          <EditPageModal
            isOpen={!!editingPage}
            onClose={() => setEditingPage(null)}
            t={t}
            editingPage={editingPage}
            pageSettings={pageSettings}
            savePageSetting={savePageSetting}
            pageDefaults={pageDefaults}
            onDelete={deletePage}
          />
        </ModalSuspense>
      )}

      {showAddPageModal && (
        <ModalSuspense>
          <AddPageModal
            isOpen={showAddPageModal}
            onClose={() => setShowAddPageModal(false)}
            t={t}
            newPageLabel={newPageLabel}
            setNewPageLabel={setNewPageLabel}
            newPageIcon={newPageIcon}
            setNewPageIcon={setNewPageIcon}
            onCreate={createPage}
            onCreateMedia={createMediaPage}
          />
        </ModalSuspense>
      )}

      {showEditCardModal && (
        <ModalSuspense>
          <EditCardModal
            isOpen={!!showEditCardModal}
            onClose={() => { setShowEditCardModal(null); setEditCardSettingsKey(null); }}
            t={t}
            entityId={showEditCardModal}
            entities={entities}
            conn={conn}
            customNames={customNames}
            saveCustomName={saveCustomName}
            customIcons={customIcons}
            saveCustomIcon={saveCustomIcon}
            saveCardSetting={saveCardSetting}
            hiddenCards={hiddenCards}
            toggleCardVisibility={toggleCardVisibility}
            gridColumns={gridColumns}
            {...editModalProps}
          />
        </ModalSuspense>
      )}

      {showSensorInfoModal && (
        <ModalSuspense>
          <SensorModal
            isOpen={!!showSensorInfoModal}
            onClose={() => setShowSensorInfoModal(null)}
            entityId={showSensorInfoModal}
            entity={entities[showSensorInfoModal]}
            customName={customNames[showSensorInfoModal]}
            conn={conn}
            haUrl={activeUrl}
            haToken={config.authMethod === 'oauth' ? (authRef?.current?.accessToken || '') : config.token}
            t={t}
          />
        </ModalSuspense>
      )}

      {showPersonModal && (
        <ModalSuspense>
          <PersonModal
            show={!!showPersonModal}
            onClose={() => setShowPersonModal(null)}
            personId={showPersonModal}
            entity={showPersonModal ? entities[showPersonModal] : null}
            entities={entities}
            customName={showPersonModal ? customNames[showPersonModal] : null}
            getEntityImageUrl={getEntityImageUrl}
            conn={conn}
            t={t}
            settings={showPersonModal ? (cardSettings[getCardSettingsKey(showPersonModal, 'header')] || cardSettings[showPersonModal] || {}) : {}}
          />
        </ModalSuspense>
      )}

      {/* ── Media modal ─────────────────────────────────────────────────── */}
      {activeMediaModal && (
        <ModalSuspense>
          <MediaModal
            show={!!activeMediaModal}
            onClose={() => {
              setActiveMediaModal(null);
              setActiveMediaGroupKey(null);
              setActiveMediaGroupIds(null);
              setActiveMediaSessionSensorIds(null);
            }}
            activeMediaModal={activeMediaModal}
            activeMediaGroupKey={activeMediaGroupKey}
            activeMediaGroupIds={activeMediaGroupIds}
            activeMediaSessionSensorIds={activeMediaSessionSensorIds}
            activeMediaId={activeMediaId}
            setActiveMediaId={setActiveMediaId}
            entities={entities}
            cardSettings={cardSettings}
            customNames={customNames}
            mediaTick={mediaTick}
            conn={conn}
            callService={callService}
            getA={getA}
            getEntityImageUrl={getEntityImageUrl}
            isMediaActive={isMediaActive}
            isSonosActive={isSonosActive}
            t={t}
            formatDuration={formatDuration}
            getServerInfo={getServerInfo}
          />
        </ModalSuspense>
      )}

      {showStatusPillsConfig && (
        <ModalSuspense>
          <StatusPillsConfigModal
            show={showStatusPillsConfig}
            onClose={() => setShowStatusPillsConfig(false)}
            statusPillsConfig={statusPillsConfig}
            onSave={saveStatusPillsConfig}
            entities={entities}
            t={t}
          />
        </ModalSuspense>
      )}

      {/* ── Reminder management modal ───────────────────────────────────── */}
      {showReminderModal && reminderProps && (
        <ModalSuspense>
          <ReminderModal
            show={true}
            onClose={() => setShowReminderModal(false)}
            reminders={reminderProps.reminders}
            onAdd={reminderProps.addReminder}
            onUpdate={reminderProps.updateReminder}
            onDelete={reminderProps.deleteReminder}
            entities={entities}
            t={t}
          />
        </ModalSuspense>
      )}

      {/* ── Reminder auto-popup (when due) ──────────────────────────────── */}
      {reminderProps?.activePopup && (
        <ModalSuspense>
          <ReminderPopup
            reminder={reminderProps.activePopup}
            onComplete={reminderProps.handleComplete}
            onSnooze={reminderProps.handleSnooze}
            onDismiss={reminderProps.handleDismiss}
            t={t}
          />
        </ModalSuspense>
      )}
    </>
  );
}
