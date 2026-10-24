import { useEffect, useRef } from 'react';
import {
  evaluateVisibilityConditionConfig,
  isConditionConfigured,
  resolveConditionEntityId,
} from '../utils';
import type { CardSettingsEntry, GetCardSettingsKey } from '../utils/cardSettingsKey';
import type { VisibilityConditionInput } from '../utils/conditionUtils';
import type {
  EntityMap,
  EntityModalActions,
  MediaModalActions,
  PagesConfig,
} from '../types/dashboard';
import type { HassEntities, HassEntity } from '../types/ha';

export interface PopupTriggerConfig {
  enabled?: boolean;
  condition?: VisibilityConditionInput | null;
  cooldownSeconds?: unknown;
  autoCloseSeconds?: unknown;
}

export interface PopupCardSettings extends CardSettingsEntry {
  popupTrigger?: PopupTriggerConfig | null;
}

export type PopupCardSettingsMap = Record<string, PopupCardSettings | undefined>;

export type PopupModalActions = Pick<
  EntityModalActions,
  | 'setShowLightModal'
  | 'setShowSensorInfoModal'
  | 'setActiveClimateEntityModal'
  | 'setShowCostModal'
  | 'setShowVacuumModal'
  | 'setShowMowerModal'
  | 'setShowFanModal'
  | 'setShowAndroidTVModal'
  | 'setShowAppleTVModal'
  | 'setActiveCarModal'
  | 'setShowWeatherModal'
  | 'setShowNordpoolModal'
  | 'setShowCalendarModal'
  | 'setShowTodoModal'
  | 'setShowRoomModal'
  | 'setShowCoverModal'
  | 'setShowAlarmModal'
  | 'setShowCameraModal'
> &
  MediaModalActions & {
    closeAllModals: () => void;
    setActiveVacuumId: (id: string | null) => void;
    setActiveMowerId?: (id: string | null) => void;
  };

export interface UsePopupTriggersOptions {
  entities: EntityMap;
  entitiesLoaded: boolean;
  pagesConfig: PagesConfig;
  activePage: string;
  cardSettings: PopupCardSettingsMap;
  getCardSettingsKey: GetCardSettingsKey;
  editMode: boolean;
  modalActions: PopupModalActions;
  enabled?: boolean;
}

const STARTUP_SUPPRESSION_MS = 15000;
const MIN_REOPEN_SUPPRESSION_MS = 10000;
const MAX_REOPEN_SUPPRESSION_MS = 3600000;
const MAX_AUTO_CLOSE_MS = 3600000;

function normalizeCooldownMs(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_REOPEN_SUPPRESSION_MS;
  const clampedSeconds = Math.min(3600, Math.max(10, Math.floor(parsed)));
  return Math.min(
    MAX_REOPEN_SUPPRESSION_MS,
    Math.max(MIN_REOPEN_SUPPRESSION_MS, clampedSeconds * 1000)
  );
}

function normalizeAutoCloseMs(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_AUTO_CLOSE_MS, Math.floor(parsed) * 1000);
}

function getCardSettingsForPage(
  cardId: string,
  pageId: string,
  cardSettings: PopupCardSettingsMap,
  getCardSettingsKey: GetCardSettingsKey
) {
  const scopedKey = getCardSettingsKey(cardId, pageId);
  return cardSettings?.[scopedKey] || cardSettings?.[cardId] || null;
}

function openPopupForCard(
  cardId: string,
  settings: PopupCardSettings | null,
  modalActions: PopupModalActions,
  entities: EntityMap
) {
  const {
    closeAllModals,
    setShowLightModal,
    setShowSensorInfoModal,
    setActiveClimateEntityModal,
    setShowCostModal,
    setActiveVacuumId,
    setShowVacuumModal,
    setActiveMowerId,
    setShowMowerModal,
    setShowFanModal,
    setShowAndroidTVModal,
    setShowAppleTVModal,
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
  const closeAndOpen = (openFn: () => void) => {
    safeClose?.();
    openFn();
  };

  if (cardId.startsWith('entity_card_')) {
    const entityId = typeof settings?.entityId === 'string' ? settings.entityId : null;
    if (!entityId) return false;
    closeAndOpen(() => setShowSensorInfoModal({ entityId, cardId }));
    return true;
  }

  if (cardId.startsWith('light_') || cardId.startsWith('light.')) {
    // EntityMap holds HA state objects; the condition utils take the full HassEntity shape.
    const resolvedLightId = resolveConditionEntityId(
      cardId,
      settings || {},
      (entities || {}) as HassEntities
    );
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

  if (cardId.startsWith('lawn_mower.')) {
    closeAndOpen(() => {
      setActiveMowerId?.(cardId);
      setShowMowerModal?.(true);
    });
    return true;
  }

  if (cardId.startsWith('fan.') || cardId.startsWith('fan_card_')) {
    closeAndOpen(() => setShowFanModal(cardId));
    return true;
  }

  if (cardId.startsWith('lock_card_')) {
    const lockId = typeof settings?.lockId === 'string' ? settings.lockId : null;
    if (!lockId) return false;
    closeAndOpen(() => setShowSensorInfoModal(lockId));
    return true;
  }

  if (cardId.startsWith('climate_card_')) {
    const climateId = typeof settings?.climateId === 'string' ? settings.climateId : null;
    if (!climateId) return false;
    closeAndOpen(() => setActiveClimateEntityModal({ entityId: climateId, cardId }));
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

  if (cardId.startsWith('appletv_card_')) {
    closeAndOpen(() => setShowAppleTVModal(cardId));
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

  if (cardId.startsWith('media_group_') || cardId.startsWith('sonos_group_')) {
    const entityIds = Array.isArray(settings?.mediaIds)
      ? settings.mediaIds.filter((id: unknown): id is string => typeof id === 'string')
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
    const entityId = settings?.type === 'sensor' ? settings.entityId || cardId : cardId;
    closeAndOpen(() => setShowSensorInfoModal(entityId === cardId ? cardId : { entityId, cardId }));
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
}: UsePopupTriggersOptions) {
  const previousMatchRef = useRef<Record<string, boolean>>({});
  const seenTriggerRef = useRef<Record<string, boolean>>({});
  const lastOpenedAtRef = useRef<Record<string, number>>({});
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

    const cardIds: string[] = Array.isArray(pagesConfig?.[activePage])
      ? pagesConfig[activePage]
      : [];
    const nextMatchState = { ...previousMatchRef.current };
    // These are assigned inside forEach; the casts stop TS from narrowing them to null.
    let cardToOpen = null as string | null;
    let cardSettingsToOpen = null as PopupCardSettings | null;
    let triggerIdToOpen = null as string | null;
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

      // EntityMap holds HA state objects; the condition utils take the full HassEntity shape.
      const fallbackEntityId = resolveConditionEntityId(
        cardId,
        settings || {},
        (entities || {}) as HassEntities
      );
      const fallbackEntity = fallbackEntityId ? entities?.[fallbackEntityId] : null;
      const matchesNow = evaluateVisibilityConditionConfig({
        condition,
        entity: fallbackEntity as HassEntity | null | undefined,
        entities: entities as HassEntities,
        getAttribute: undefined,
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
