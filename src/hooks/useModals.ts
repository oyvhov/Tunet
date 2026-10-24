import { useMemo } from 'react';
import type { ModalSetters, ModalState, UseModalsResult } from '../types/dashboard';

type ModalKey = keyof ModalState;
type ModalActions = Omit<UseModalsResult, ModalKey>;
type SetModalValue = <K extends ModalKey>(key: K, value: ModalState[K]) => void;

interface ModalStore {
  getSnapshot: () => ModalState;
  subscribe: (listener: () => void) => () => boolean;
  actions: ModalActions;
}

// All modal keys with their "closed" value (null = entity-id modals, false = boolean modals)
const MODAL_DEFAULTS: ModalState = {
  showNordpoolModal: null,
  showCostModal: null,
  activeClimateEntityModal: null,
  showLightModal: null,
  activeCarModal: null,
  showPersonModal: null,
  showAndroidTVModal: null,
  showAppleTVModal: null,
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
  showStatusGroupModal: null,
  showAddCardModal: false,
  showConfigModal: false,
  showAddPageModal: false,
  showHeaderEditModal: false,
  showEditCardModal: null,
  showStatusPillsConfig: false,
};

// Keys checked by hasOpenModal
const OPEN_CHECK_KEYS: ModalKey[] = [
  'showNordpoolModal',
  'showCostModal',
  'activeClimateEntityModal',
  'showLightModal',
  'activeCarModal',
  'showAndroidTVModal',
  'showAppleTVModal',
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
  'showStatusGroupModal',
];

function buildModalActions(
  setModalValue: SetModalValue,
  closeAllModals: () => void,
  hasOpenModal: () => boolean
): ModalActions {
  // Filled by the loop below with one setter per MODAL_DEFAULTS key.
  const setters = {} as ModalSetters;
  for (const key of Object.keys(MODAL_DEFAULTS)) {
    // Object.keys() is typed string[]; the keys come from MODAL_DEFAULTS.
    const modalKey = key as ModalKey;
    // Every ModalState key has a matching set<Key> entry in ModalSetters.
    const setterName = ('set' + key[0].toUpperCase() + key.slice(1)) as keyof ModalSetters;
    setters[setterName] = (value: ModalState[ModalKey]) => setModalValue(modalKey, value);
  }

  const entityModalActions = {
    setShowNordpoolModal: setters.setShowNordpoolModal,
    setShowCostModal: setters.setShowCostModal,
    setActiveClimateEntityModal: setters.setActiveClimateEntityModal,
    setShowLightModal: setters.setShowLightModal,
    setActiveCarModal: setters.setActiveCarModal,
    setShowPersonModal: setters.setShowPersonModal,
    setShowAndroidTVModal: setters.setShowAndroidTVModal,
    setShowAppleTVModal: setters.setShowAppleTVModal,
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

function createModalStore(): ModalStore {
  let state: ModalState = { ...MODAL_DEFAULTS };
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const getSnapshot = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const hasOpenModal = () => OPEN_CHECK_KEYS.some((key) => !!state[key]);
  const setModalValue: SetModalValue = (key, value) => {
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
export function useModals(): ModalStore {
  return useMemo(() => createModalStore(), []);
}
