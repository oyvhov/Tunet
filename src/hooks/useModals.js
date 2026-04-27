import { useMemo } from 'react';

/** @typedef {import('../types/dashboard').ModalState} ModalState */
/** @typedef {import('../types/dashboard').UseModalsResult} UseModalsResult */

// All modal keys with their "closed" value (null = entity-id modals, false = boolean modals)
/** @type {ModalState} */
const MODAL_DEFAULTS = {
  showNordpoolModal: null,
  showCostModal: null,
  activeClimateEntityModal: null,
  showLightModal: null,
  activeCarModal: null,
  showPersonModal: null,
  showAndroidTVModal: null,
  showVacuumModal: null,
  showMowerModal: null,
  showFanModal: null,
  showSensorInfoModal: null,
  showCalendarModal: null,
  showTodoModal: null,
  showRoomModal: null,
  showCoverModal: null,
  showCameraModal: null,
  showWeatherModal: null,
  showAlarmModal: null,
  showAlarmActionModal: null,
  activeMediaModal: null,
  activeMediaGroupKey: null,
  activeMediaGroupIds: null,
  activeMediaSessionSensorIds: null,
  activeMediaId: null,
  showAddCardModal: false,
  showConfigModal: false,
  showAddPageModal: false,
  showHeaderEditModal: false,
  showEditCardModal: null,
  showStatusPillsConfig: false,
};

// Keys checked by hasOpenModal
const OPEN_CHECK_KEYS = [
  'showNordpoolModal',
  'showCostModal',
  'activeClimateEntityModal',
  'showLightModal',
  'activeCarModal',
  'showAndroidTVModal',
  'showVacuumModal',
  'showMowerModal',
  'showFanModal',
  'showAddCardModal',
  'showConfigModal',
  'showEditCardModal',
  'showSensorInfoModal',
  'activeMediaModal',
  'showStatusPillsConfig',
  'showPersonModal',
  'showCalendarModal',
  'showTodoModal',
  'showRoomModal',
  'showWeatherModal',
  'showCoverModal',
  'showCameraModal',
  'showAlarmModal',
  'showAlarmActionModal',
];

function buildModalActions(setModalValue, closeAllModals, hasOpenModal) {
  const setters = {};
  for (const key of Object.keys(MODAL_DEFAULTS)) {
    const modalKey = /** @type {keyof ModalState} */ (key);
    const setterName = 'set' + key[0].toUpperCase() + key.slice(1);
    setters[setterName] = (value) => setModalValue(modalKey, value);
  }

  const entityModalActions = {
    setShowNordpoolModal: setters.setShowNordpoolModal,
    setShowCostModal: setters.setShowCostModal,
    setActiveClimateEntityModal: setters.setActiveClimateEntityModal,
    setShowLightModal: setters.setShowLightModal,
    setActiveCarModal: setters.setActiveCarModal,
    setShowPersonModal: setters.setShowPersonModal,
    setShowAndroidTVModal: setters.setShowAndroidTVModal,
    setShowVacuumModal: setters.setShowVacuumModal,
    setShowMowerModal: setters.setShowMowerModal,
    setShowFanModal: setters.setShowFanModal,
    setShowSensorInfoModal: setters.setShowSensorInfoModal,
    setShowCalendarModal: setters.setShowCalendarModal,
    setShowTodoModal: setters.setShowTodoModal,
    setShowRoomModal: setters.setShowRoomModal,
    setShowCoverModal: setters.setShowCoverModal,
    setShowCameraModal: setters.setShowCameraModal,
    setShowWeatherModal: setters.setShowWeatherModal,
    setShowAlarmModal: setters.setShowAlarmModal,
    setShowAlarmActionModal: setters.setShowAlarmActionModal,
  };

  const mediaModalActions = {
    setActiveMediaModal: setters.setActiveMediaModal,
    setActiveMediaGroupKey: setters.setActiveMediaGroupKey,
    setActiveMediaGroupIds: setters.setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds: setters.setActiveMediaSessionSensorIds,
    setActiveMediaId: setters.setActiveMediaId,
  };

  const managementModalActions = {
    setShowAddCardModal: setters.setShowAddCardModal,
    setShowConfigModal: setters.setShowConfigModal,
    setShowAddPageModal: setters.setShowAddPageModal,
    setShowHeaderEditModal: setters.setShowHeaderEditModal,
    setShowEditCardModal: setters.setShowEditCardModal,
    setShowStatusPillsConfig: setters.setShowStatusPillsConfig,
  };

  return {
    ...setters,
    entityModalActions,
    mediaModalActions,
    managementModalActions,
    hasOpenModal,
    closeAllModals,
  };
}

function createModalStore() {
  let state = /** @type {ModalState} */ ({ ...MODAL_DEFAULTS });
  const listeners = new Set();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const getSnapshot = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const hasOpenModal = () => OPEN_CHECK_KEYS.some((key) => !!state[key]);
  const setModalValue = (key, value) => {
    if (Object.is(state[key], value)) return;
    state = { ...state, [key]: value };
    emit();
  };
  const closeAllModals = () => {
    state = { ...MODAL_DEFAULTS };
    emit();
  };
  const actions = buildModalActions(setModalValue, closeAllModals, hasOpenModal);

  return {
    getSnapshot,
    subscribe,
    actions,
  };
}

/**
 * Centralised modal state via a stable external store.
 * Adding a new modal = one entry in MODAL_DEFAULTS (+ OPEN_CHECK_KEYS if needed).
 */
export function useModals() {
  return useMemo(() => createModalStore(), []);
}
