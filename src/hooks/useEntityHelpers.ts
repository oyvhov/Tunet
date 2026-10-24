import { useCallback, useMemo } from 'react';
import { ENTITY_UPDATE_THRESHOLD, MEDIA_TIMEOUT } from '../config/constants';
import { callService as haCallService } from '../services';
import { logger } from '../utils/logger';
import { useToast } from '../contexts/ToastContext';
import type { Connection } from 'home-assistant-js-websocket';
import type { ServiceData } from '../services/haClient';
import type { EntityMap } from '../types/dashboard';
import type { Translate } from '../types/ha';

export interface UseEntityHelpersDeps {
  entities: EntityMap;
  conn: Connection | null;
  activeUrl: string;
  now: Date;
  t: Translate;
  language?: string;
}

type ActivityEntity = { state?: string; last_updated?: string } | null | undefined;

/**
 * Shared Home-Assistant entity accessor helpers:  getS, getA, getEntityImageUrl,
 * callService, isSonosActive, isMediaActive, hvacMap/fanMap/swingMap.
 *
 * Everything is stable-ref (useCallback / useMemo) so consumers don't re-render.
 */
export function useEntityHelpers({ entities, conn, activeUrl, now, t }: UseEntityHelpersDeps) {
  const { addToast } = useToast();
  // ── Attribute / state accessors ────────────────────────────────────────
  const getS = useCallback(
    (id: string, fallback = '--') => {
      const state = entities[id]?.state;
      if (!state || state === 'unavailable' || state === 'unknown') return fallback;
      if (state === 'home') return t('status.home');
      if (state === 'not_home') return t('status.notHome');
      return state.charAt(0).toUpperCase() + state.slice(1);
    },
    [entities, t]
  );

  const getA = useCallback(
    (id: string, attr: string, fallback: unknown = null) =>
      entities[id]?.attributes?.[attr] ?? fallback,
    [entities]
  );

  const getEntityImageUrl = useCallback(
    (rawUrl: string | null | undefined) => {
      if (!rawUrl) return null;
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
      return `${activeUrl.replace(/\/$/, '')}${rawUrl}`;
    },
    [activeUrl]
  );

  // ── Service calls ──────────────────────────────────────────────────────
  const callService = useCallback(
    (domain: string, service: string, data?: ServiceData | null) => {
      if (!conn) {
        logger.warn(`Service call attempted while disconnected: ${domain}.${service}`);
        return Promise.reject(new Error('No connection'));
      }
      return haCallService(conn, domain, service, data).catch((error) => {
        const msg = t?.('toast.serviceFailed') || 'Action failed';
        addToast(`${msg}: ${domain}.${service}`, 'error');
        throw error;
      });
    },
    [conn, addToast, t]
  );

  // ── Activity helpers ───────────────────────────────────────────────────
  const isSonosActive = (entity: ActivityEntity) => {
    if (!entity?.state) return false;
    if (entity.state === 'playing') return true;
    if (entity.state === 'paused') {
      // Cast: a missing last_updated gives an Invalid Date, so the check is false.
      return Date.now() - new Date(entity.last_updated as string).getTime() < MEDIA_TIMEOUT;
    }
    return false;
  };

  const isMediaActive = (entity: ActivityEntity) => {
    if (!entity?.state) return false;
    if (entity.state === 'playing') return true;
    // Cast: a missing last_updated gives an Invalid Date, so the check is false.
    return (
      now.getTime() - new Date(entity.last_updated as string).getTime() < ENTITY_UPDATE_THRESHOLD
    );
  };

  // ── i18n maps for climate modal ────────────────────────────────────────
  const hvacMap = useMemo(
    () => ({
      off: t('climate.hvac.off'),
      auto: t('climate.hvac.auto'),
      cool: t('climate.hvac.cool'),
      dry: t('climate.hvac.dry'),
      fan_only: t('climate.hvac.fanOnly'),
      heat: t('climate.hvac.heat'),
      heat_cool: t('climate.hvac.heatCool'),
    }),
    [t]
  );

  const fanMap = useMemo(
    () => ({
      Auto: t('climate.fan.auto'),
      Low: t('climate.fan.low'),
      LowMid: t('climate.fan.lowMid'),
      Mid: t('climate.fan.mid'),
      HighMid: t('climate.fan.highMid'),
      High: t('climate.fan.high'),
    }),
    [t]
  );

  const swingMap = useMemo(
    () => ({
      Auto: t('climate.swing.auto'),
      Up: t('climate.swing.up'),
      UpMid: t('climate.swing.upMid'),
      Mid: t('climate.swing.mid'),
      DownMid: t('climate.swing.downMid'),
      Down: t('climate.swing.down'),
      Swing: t('climate.swing.swing'),
    }),
    [t]
  );

  return {
    getS,
    getA,
    getEntityImageUrl,
    callService,
    isSonosActive,
    isMediaActive,
    hvacMap,
    fanMap,
    swingMap,
  };
}
