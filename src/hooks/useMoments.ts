import { useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_MOMENTS_STATE,
  buildMomentActivities,
  collectMomentSources,
  getNextMomentConditionCheck,
  momentFitsScreen,
  stepMoments,
  type ActiveMoment,
  type MomentCardSettings,
} from '../utils/moments';
import type { GetCardSettingsKey } from '../utils/cardSettingsKey';
import type { EntityMap, PagesConfig } from '../types/dashboard';

export type { ActiveMoment };

export interface UseMomentsOptions {
  entities: EntityMap;
  entitiesLoaded: boolean;
  pagesConfig: PagesConfig;
  cardSettings: Record<string, MomentCardSettings | undefined>;
  getCardSettingsKey: GetCardSettingsKey;
  editMode: boolean;
  popupOpen: boolean;
  activeMoment: ActiveMoment | null;
  setActiveMoment: (moment: ActiveMoment | null) => void;
}

/** Opens and closes the full-screen view according to the rules in utils/moments. */
export function useMoments({
  entities,
  entitiesLoaded,
  pagesConfig,
  cardSettings,
  getCardSettingsKey,
  editMode,
  popupOpen,
  activeMoment,
  setActiveMoment,
}: UseMomentsOptions) {
  const sources = useMemo(
    () => collectMomentSources(pagesConfig, cardSettings, getCardSettingsKey),
    [pagesConfig, cardSettings, getCardSettingsKey]
  );
  const stateRef = useRef(INITIAL_MOMENTS_STATE);
  const [wakeCount, setWakeCount] = useState(0);

  useEffect(() => {
    if (!entitiesLoaded) return undefined;
    if (sources.length === 0 && stateRef.current.visibleCardId === null) return undefined;

    const now = Date.now();
    const { state, visible, wakeAt } = stepMoments(stateRef.current, {
      now,
      activities: buildMomentActivities(sources, entities),
      popupOpen,
      editing: editMode,
      screenFits: momentFitsScreen(window.innerWidth, window.innerHeight),
      viewOpen: activeMoment !== null,
    });
    stateRef.current = state;

    if (visible) {
      const unchanged =
        activeMoment &&
        !activeMoment.closing &&
        activeMoment.cardId === visible.cardId &&
        activeMoment.entityId === visible.entityId;
      if (!unchanged) {
        const settings = sources.find((source) => source.cardId === visible.cardId)?.settings;
        setActiveMoment({ ...visible, settings });
      }
    } else if (activeMoment && !activeMoment.closing) {
      setActiveMoment({ ...activeMoment, closing: true });
    }

    const wakeTimes = [wakeAt, getNextMomentConditionCheck(sources, entities, now)].filter(
      (time): time is number => time !== null
    );
    if (wakeTimes.length === 0) return undefined;
    const timer = setTimeout(
      () => setWakeCount((count) => count + 1),
      Math.max(0, Math.min(...wakeTimes) - now)
    );
    return () => clearTimeout(timer);
  }, [
    entities,
    entitiesLoaded,
    sources,
    editMode,
    popupOpen,
    activeMoment,
    setActiveMoment,
    wakeCount,
  ]);
}
