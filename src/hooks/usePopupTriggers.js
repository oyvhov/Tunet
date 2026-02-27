import { useEffect, useRef } from 'react';
import {
  evaluateVisibilityConditionConfig,
  isConditionConfigured,
  resolveConditionEntityId,
} from '../utils';

const STARTUP_SUPPRESSION_MS = 15000;
const MIN_REOPEN_SUPPRESSION_MS = 10000;
const MAX_REOPEN_SUPPRESSION_MS = 3600000;
const MAX_AUTO_CLOSE_MS = 3600000;

function normalizeCooldownMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_REOPEN_SUPPRESSION_MS;
  const clampedSeconds = Math.min(3600, Math.max(10, Math.floor(parsed)));
  return Math.min(
    MAX_REOPEN_SUPPRESSION_MS,
    Math.max(MIN_REOPEN_SUPPRESSION_MS, clampedSeconds * 1000)
  );
}

function normalizeAutoCloseMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_AUTO_CLOSE_MS, Math.floor(parsed) * 1000);
}

function getCardSettingsForPage(cardId, pageId, cardSettings, getCardSettingsKey) {
  const scopedKey = getCardSettingsKey(cardId, pageId);
  return cardSettings?.[scopedKey] || cardSettings?.[cardId] || null;
}

function openPopupForCard(cardId, settings, modalActions, entities) {
  const {
    closeAllModals,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setActiveCarModal,
    setShowWeatherModal,
    setShowNordpoolModal,
    setShowCalendarModal,
    setShowTodoModal,
    setShowRoomModal,
    setShowCoverModal,
    setShowAlarmModal,
    setShowCameraModal,
    setActiveMediaModal,
    setActiveMediaId,
    setActiveMediaGroupKey,
    setActiveMediaGroupIds,
    setActiveMediaSessionSensorIds,
  } = modalActions;

  if (typeof cardId !== 'string' || !cardId.trim()) return false;

  const safeClose = typeof closeAllModals === 'function' ? closeAllModals : null;
  const closeAndOpen = (openFn) => {
    safeClose?.();
    openFn();
  };

  if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
    const resolvedLightId = resolveConditionEntityId(cardId, settings || {}, entities || {});
    const lightId =
      typeof resolvedLightId === 'string' && resolvedLightId.startsWith('light.')
        ? resolvedLightId
        : cardId.startsWith('light.')
          ? cardId
          : null;
    if (!lightId) return false;
    closeAndOpen(() => setShowLightModal(lightId));
    return true;
  }

  if (cardId.startsWith('vacuum.')) {
    closeAndOpen(() => {
      setActiveVacuumId(cardId);
      setShowVacuumModal(true);
    });
    return true;
  }

  if (cardId.startsWith('fan.') || cardId.startsWith('fan_card_')) {
    closeAndOpen(() => setShowFanModal(cardId));
    return true;
  }

  if (cardId.startsWith('climate_card_')) {
    const climateId = typeof settings?.climateId === 'string' ? settings.climateId : null;
    if (!climateId) return false;
    closeAndOpen(() => setActiveClimateEntityModal(climateId));
    return true;
  }

  if (cardId.startsWith('cost_card_')) {
    closeAndOpen(() => setShowCostModal(cardId));
    return true;
  }

  if (cardId.startsWith('androidtv_card_')) {
    closeAndOpen(() => setShowAndroidTVModal(cardId));
    return true;
  }

  if (cardId.startsWith('calendar_card_')) {
    closeAndOpen(() => setShowCalendarModal(true));
    return true;
  }

  if (cardId.startsWith('todo_card_')) {
    closeAndOpen(() => setShowTodoModal(cardId));
    return true;
  }

  if (cardId.startsWith('nordpool_card_')) {
    closeAndOpen(() => setShowNordpoolModal(cardId));
    return true;
  }

  if (cardId.startsWith('cover_card_')) {
    closeAndOpen(() => setShowCoverModal(cardId));
    return true;
  }

  if (cardId.startsWith('alarm_card_')) {
    closeAndOpen(() => setShowAlarmModal(cardId));
    return true;
  }

  if (cardId.startsWith('room_card_')) {
    closeAndOpen(() => setShowRoomModal(cardId));
    return true;
  }

  if (cardId.startsWith('camera_card_')) {
    closeAndOpen(() => setShowCameraModal(cardId));
    return true;
  }

  if (cardId.startsWith('weather_temp_')) {
    closeAndOpen(() => setShowWeatherModal(cardId));
    return true;
  }

  if (cardId.startsWith('car_card_') || cardId === 'car') {
    closeAndOpen(() => setActiveCarModal(cardId));
    return true;
  }

  if (cardId.startsWith('media_player.')) {
    closeAndOpen(() => {
      setActiveMediaSessionSensorIds(null);
      setActiveMediaGroupKey(null);
      setActiveMediaGroupIds(null);
      setActiveMediaId(cardId);
      setActiveMediaModal('media');
    });
    return true;
  }

  if (cardId.startsWith('media_group_')) {
    const entityIds = Array.isArray(settings?.entityIds)
      ? settings.entityIds.filter((id) => typeof id === 'string')
      : [];
    const firstEntityId = entityIds[0] || null;
    closeAndOpen(() => {
      setActiveMediaSessionSensorIds(null);
      setActiveMediaGroupKey(cardId);
      setActiveMediaGroupIds(entityIds);
      setActiveMediaId(firstEntityId);
      setActiveMediaModal('media');
    });
    return true;
  }

  if (cardId.includes('.')) {
    closeAndOpen(() => setShowSensorInfoModal(cardId));
    return true;
  }

  return false;
}

export function usePopupTriggers({
  entities,
  entitiesLoaded,
  pagesConfig,
  activePage,
  cardSettings,
  getCardSettingsKey,
  editMode,
  modalActions,
  enabled = true,
}) {
  const previousMatchRef = useRef({});
  const seenTriggerRef = useRef({});
  const lastOpenedAtRef = useRef({});
  const autoCloseTimerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const hasLoadedEntitiesRef = useRef(false);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const now = Date.now();

    if (!enabled) {
      previousMatchRef.current = {};
      seenTriggerRef.current = {};
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    if (!entitiesLoaded) {
      hasLoadedEntitiesRef.current = false;
      isInitializedRef.current = false;
      previousMatchRef.current = {};
      seenTriggerRef.current = {};
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    if (!hasLoadedEntitiesRef.current) {
      hasLoadedEntitiesRef.current = true;
      suppressUntilRef.current = now + STARTUP_SUPPRESSION_MS;
    }

    if (editMode) return;

    const cardIds = Array.isArray(pagesConfig?.[activePage]) ? pagesConfig[activePage] : [];
    const nextMatchState = { ...previousMatchRef.current };
    let cardToOpen = null;
    let cardSettingsToOpen = null;
    let triggerIdToOpen = null;
    const startupSuppressed = now < suppressUntilRef.current;

    cardIds.forEach((cardId) => {
      const settings = getCardSettingsForPage(cardId, activePage, cardSettings, getCardSettingsKey);
      const triggerConfig = settings?.popupTrigger;
      const isEnabled = triggerConfig?.enabled === true;
      const condition = triggerConfig?.condition || null;
      const reopenSuppressionMs = normalizeCooldownMs(triggerConfig?.cooldownSeconds);
      const triggerId = `${activePage}::${cardId}`;

      if (!isEnabled || !isConditionConfigured(condition)) {
        nextMatchState[triggerId] = false;
        return;
      }

      const fallbackEntityId = resolveConditionEntityId(cardId, settings || {}, entities || {});
      const fallbackEntity = fallbackEntityId ? entities?.[fallbackEntityId] : null;
      const matchesNow = evaluateVisibilityConditionConfig({
        condition,
        entity: fallbackEntity,
        entities,
        fallbackEntityId,
      });

      nextMatchState[triggerId] = matchesNow;

      if (!seenTriggerRef.current[triggerId]) {
        seenTriggerRef.current[triggerId] = true;
        return;
      }

      if (!isInitializedRef.current || startupSuppressed) return;

      const matchedBefore = Boolean(previousMatchRef.current[triggerId]);
      const lastOpenedAt = Number(lastOpenedAtRef.current[triggerId]) || 0;
      const isCoolingDown = now - lastOpenedAt < reopenSuppressionMs;

      if (matchesNow && !matchedBefore && !isCoolingDown && !cardToOpen) {
        cardToOpen = cardId;
        cardSettingsToOpen = settings;
        triggerIdToOpen = triggerId;
      }
    });

    previousMatchRef.current = nextMatchState;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    if (cardToOpen) {
      const opened = openPopupForCard(cardToOpen, cardSettingsToOpen, modalActions, entities);
      if (triggerIdToOpen) {
        lastOpenedAtRef.current[triggerIdToOpen] = now;
      }

      if (opened) {
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = null;
        }

        const autoCloseMs = normalizeAutoCloseMs(
          cardSettingsToOpen?.popupTrigger?.autoCloseSeconds
        );
        if (autoCloseMs > 0 && typeof modalActions?.closeAllModals === 'function') {
          autoCloseTimerRef.current = setTimeout(() => {
            modalActions.closeAllModals();
            autoCloseTimerRef.current = null;
          }, autoCloseMs);
        }
      }
    }
  }, [
    entities,
    entitiesLoaded,
    pagesConfig,
    activePage,
    cardSettings,
    getCardSettingsKey,
    editMode,
    modalActions,
    enabled,
  ]);

  useEffect(
    () => () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    },
    []
  );
}
