import { lazy } from 'react';
import { ModalSuspense } from '../../components';
import { prepareNordpoolData } from '../../services';

const CalendarModal = lazy(() => import('../../modals/CalendarModal'));
const CostModal = lazy(() => import('../../modals/CostModal'));
const GenericAndroidTVModal = lazy(() => import('../../modals/GenericAndroidTVModal'));
const GenericClimateModal = lazy(() => import('../../modals/GenericClimateModal'));
const GenericFanModal = lazy(() => import('../../modals/GenericFanModal'));
const CoverModal = lazy(() => import('../../modals/CoverModal'));
const AlarmModal = lazy(() => import('../../modals/AlarmModal'));
const AlarmActionPinModal = lazy(() => import('../../modals/AlarmActionPinModal'));
const CameraModal = lazy(() => import('../../modals/CameraModal'));
const WeatherModal = lazy(() => import('../../modals/WeatherModal'));
const LeafModal = lazy(() => import('../../modals/LeafModal'));
const LightModal = lazy(() => import('../../modals/LightModal'));
const NordpoolModal = lazy(() => import('../../modals/NordpoolModal'));
const PersonModal = lazy(() => import('../../modals/PersonModal'));
const SensorModal = lazy(() => import('../../modals/SensorModal'));
const TodoModal = lazy(() => import('../../modals/TodoModal'));
const RoomModal = lazy(() => import('../../modals/RoomModal'));
const VacuumModal = lazy(() => import('../../modals/VacuumModal'));

export function ModalEntitySlice({ core, modals, cardConfig, entityHelpers, resolveCarSettings }) {
  const { entities, conn, activeUrl, authRef, config, t, language } = core;
  const {
    showNordpoolModal,
    setShowNordpoolModal,
    showCostModal,
    setShowCostModal,
    activeClimateEntityModal,
    setActiveClimateEntityModal,
    showLightModal,
    setShowLightModal,
    activeCarModal,
    setActiveCarModal,
    showPersonModal,
    setShowPersonModal,
    showAndroidTVModal,
    setShowAndroidTVModal,
    showVacuumModal,
    setShowVacuumModal,
    showFanModal,
    setShowFanModal,
    showSensorInfoModal,
    setShowSensorInfoModal,
    showCalendarModal,
    setShowCalendarModal,
    showTodoModal,
    setShowTodoModal,
    showRoomModal,
    setShowRoomModal,
    showCoverModal,
    setShowCoverModal,
    showAlarmModal,
    setShowAlarmModal,
    showAlarmActionModal,
    setShowAlarmActionModal,
    showCameraModal,
    setShowCameraModal,
    showWeatherModal,
    setShowWeatherModal,
    activeVacuumId,
    setActiveVacuumId,
  } = modals;
  const {
    cardSettings,
    saveCardSetting,
    customNames,
    customIcons,
    getCardSettingsKey,
  } = cardConfig;
  const {
    callService,
    getEntityImageUrl,
    getA,
    getS,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    hvacMap,
    fanMap,
    swingMap,
  } = entityHelpers;

  return (
    <>
      {showNordpoolModal &&
        (() => {
          const data = prepareNordpoolData(showNordpoolModal, {
            getCardSettingsKey,
            cardSettings,
            entities,
            customNames,
          });
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

      {showCostModal &&
        (() => {
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

      {showAndroidTVModal &&
        (() => {
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
            onClose={() => {
              setShowVacuumModal(false);
              setActiveVacuumId(null);
            }}
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

      {activeCarModal &&
        (() => {
          const settingsKey = getCardSettingsKey(activeCarModal);
          const settings = resolveCarSettings(
            activeCarModal,
            cardSettings[settingsKey] || cardSettings[activeCarModal] || {}
          );
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

      {showWeatherModal &&
        (() => {
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

      {showTodoModal &&
        (() => {
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

      {showRoomModal &&
        (() => {
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
                getEntityImageUrl={getEntityImageUrl}
                t={t}
              />
            </ModalSuspense>
          );
        })()}

      {showCoverModal &&
        (() => {
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

      {showAlarmModal &&
        (() => {
          const isDirectEntityId =
            typeof showAlarmModal === 'string' && showAlarmModal.startsWith('alarm_control_panel.');
          const alarmSettingsKey = isDirectEntityId ? null : getCardSettingsKey(showAlarmModal);
          const alarmSettings = isDirectEntityId
            ? {}
            : cardSettings[alarmSettingsKey] || cardSettings[showAlarmModal] || {};
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

      {showAlarmActionModal &&
        (() => {
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

      {showCameraModal &&
        (() => {
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
            haToken={config.authMethod === 'oauth' ? authRef?.current?.accessToken || '' : config.token}
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
            settings={
              showPersonModal
                ? cardSettings[getCardSettingsKey(showPersonModal, 'header')] ||
                  cardSettings[showPersonModal] ||
                  {}
                : {}
            }
          />
        </ModalSuspense>
      )}
    </>
  );
}
