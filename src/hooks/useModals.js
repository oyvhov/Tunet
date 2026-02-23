import { useReducer, useCallback, useMemo } from 'react';

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
  'showNordpoolModal', 'showCostModal', 'activeClimateEntityModal',
  'showLightModal', 'activeCarModal', 'showAndroidTVModal', 'showVacuumModal',
  'showFanModal',
  'showAddCardModal', 'showConfigModal', 'showEditCardModal',
  'showSensorInfoModal', 'activeMediaModal', 'showStatusPillsConfig',
  'showPersonModal', 'showCalendarModal', 'showTodoModal',
  'showRoomModal', 'showWeatherModal', 'showCoverModal', 'showCameraModal',
  'showAlarmModal', 'showAlarmActionModal',
];

/** @param {ModalState} state @param {{ type: 'SET', key: keyof ModalState, value: ModalState[keyof ModalState] } | { type: 'CLOSE_ALL' }} action */
function modalReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.key]: action.value };
    case 'CLOSE_ALL':
      return { ...MODAL_DEFAULTS };
    default:
      return state;
  }
}

/**
 * Centralised modal state via useReducer.
 * Adding a new modal = one entry in MODAL_DEFAULTS (+ OPEN_CHECK_KEYS if needed).
 */
export function useModals() {
  /** @type {[ModalState, import('react').Dispatch<{ type: 'SET', key: keyof ModalState, value: ModalState[keyof ModalState] } | { type: 'CLOSE_ALL' }>]} */
  const [state, dispatch] = useReducer(modalReducer, MODAL_DEFAULTS);

  // Build a stable setter for each key (dispatch identity never changes)
  const setters = useMemo(() => {
    const result = {};
    for (const key of Object.keys(MODAL_DEFAULTS)) {
      const modalKey = /** @type {keyof ModalState} */ (key);
      const setterName = 'set' + key[0].toUpperCase() + key.slice(1);
      result[setterName] = (value) => dispatch({ type: 'SET', key: modalKey, value });
    }
    return result;
  }, []);

  const hasOpenModal = useCallback(
    () => OPEN_CHECK_KEYS.some((key) => !!state[key]),
    [state],
  );

  const closeAllModals = useCallback(
    () => dispatch({ type: 'CLOSE_ALL' }),
    [],
  );

  return /** @type {UseModalsResult} */ ({ ...state, ...setters, hasOpenModal, closeAllModals });
}
