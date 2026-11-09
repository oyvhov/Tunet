import {
  evaluateVisibilityConditionConfig,
  isConditionConfigured,
  resolveConditionEntityId,
  type VisibilityConditionInput,
} from './conditionUtils';
import type { CardSettingsEntry, GetCardSettingsKey } from './cardSettingsKey';
import type { EntityMap, PagesConfig } from '../types/dashboard';
import type { HassEntities, HassEntity } from '../types/ha';

export type MomentKind = 'media' | 'camera' | 'notice';

export interface MomentConfig {
  enabled?: boolean;
  closeAfterSeconds?: unknown;
  condition?: VisibilityConditionInput | null;
  message?: string;
}

export interface MomentCardSettings extends CardSettingsEntry {
  moment?: MomentConfig | null;
}

export interface MomentSource {
  cardId: string;
  kind: MomentKind;
  settings: MomentCardSettings;
  closeAfterMs: number;
}

/** What one card is doing right now. `entityId` is null while nothing is happening. */
export interface MomentActivity {
  cardId: string;
  kind: MomentKind;
  entityId: string | null;
  closeAfterMs: number;
  maxVisibleMs: number | null;
}

export interface VisibleMoment {
  cardId: string;
  kind: MomentKind;
  entityId: string | null;
}

export interface ActiveMoment extends VisibleMoment {
  settings?: MomentCardSettings;
  closing?: boolean;
}

interface MomentSession {
  kind: MomentKind;
  entityId: string | null;
  startedAt: number;
  stoppedSince: number | null;
  shownAt: number | null;
  seen: boolean;
}

export interface MomentsState {
  firstSeenAt: number | null;
  sessions: Record<string, MomentSession>;
  visibleCardId: string | null;
}

export interface MomentsInput {
  now: number;
  activities: MomentActivity[];
  popupOpen: boolean;
  editing: boolean;
  screenFits: boolean;
  viewOpen: boolean;
}

export interface MomentsResult {
  state: MomentsState;
  visible: VisibleMoment | null;
  wakeAt: number | null;
}

export const MOMENT_CLOSE_SECONDS_OPTIONS = [30, 60, 120, 300] as const;
export const DEFAULT_MOMENT_CLOSE_SECONDS = 60;
export const MOMENT_STARTUP_GRACE_MS = 15000;

const MAX_MOMENT_CLOSE_SECONDS = 3600;
const MIN_SCREEN_SIDE_PX = 600;

export const INITIAL_MOMENTS_STATE: MomentsState = {
  firstSeenAt: null,
  sessions: {},
  visibleCardId: null,
};

// A doorbell breaks through anything; a finished washing machine can wait for
// an open popup; music is only shown when nothing else is going on.
const KIND_RULES: Record<MomentKind, { priority: number; overPopups: boolean; waits: boolean }> = {
  camera: { priority: 2, overPopups: true, waits: false },
  notice: { priority: 1, overPopups: false, waits: true },
  media: { priority: 0, overPopups: false, waits: false },
};

export function getMomentKind(cardId: string): MomentKind {
  if (
    cardId.startsWith('media_player.') ||
    cardId.startsWith('media_group_') ||
    cardId.startsWith('sonos_group_')
  ) {
    return 'media';
  }
  return cardId.startsWith('camera_card_') ? 'camera' : 'notice';
}

/** Phones are left out, whichever way they are held: their short side is too small. */
export function momentFitsScreen(width: number, height: number): boolean {
  return Math.min(width, height) >= MIN_SCREEN_SIDE_PX;
}

function normalizeCloseMs(value: unknown): number {
  const seconds = Math.floor(Number(value));
  const usable = Number.isFinite(seconds) && seconds > 0;
  return Math.min(MAX_MOMENT_CLOSE_SECONDS, usable ? seconds : DEFAULT_MOMENT_CLOSE_SECONDS) * 1000;
}

/** Every card with a moment turned on, across all pages. */
export function collectMomentSources(
  pagesConfig: PagesConfig | null | undefined,
  cardSettings: Record<string, MomentCardSettings | undefined> | null | undefined,
  getCardSettingsKey: GetCardSettingsKey
): MomentSource[] {
  const sources: MomentSource[] = [];
  const added = new Set<string>();
  const pageIds = Array.isArray(pagesConfig?.pages) ? pagesConfig.pages : [];

  pageIds.forEach((pageId) => {
    const cardIds = pagesConfig?.[pageId];
    if (!Array.isArray(cardIds)) return;
    cardIds.forEach((cardId: unknown) => {
      if (typeof cardId !== 'string' || added.has(cardId)) return;
      const settings = cardSettings?.[getCardSettingsKey(cardId, pageId)] || cardSettings?.[cardId];
      if (settings?.moment?.enabled !== true) return;
      added.add(cardId);
      sources.push({
        cardId,
        kind: getMomentKind(cardId),
        settings,
        closeAfterMs: normalizeCloseMs(settings.moment.closeAfterSeconds),
      });
    });
  });

  return sources;
}

function mediaEntityIds({ cardId, settings }: MomentSource): string[] {
  if (cardId.startsWith('media_player.')) {
    return [
      typeof settings.entityId === 'string' && settings.entityId ? settings.entityId : cardId,
    ];
  }
  return Array.isArray(settings.mediaIds)
    ? settings.mediaIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];
}

function isShowablePlayback(entity: EntityMap[string] | undefined): boolean {
  if (entity?.state !== 'playing') return false;
  return Boolean(entity.attributes?.media_title || entity.attributes?.entity_picture);
}

function activeConditionEntityId(source: MomentSource, entities: EntityMap): string | null {
  const condition = source.settings.moment?.condition;
  if (!isConditionConfigured(condition)) return null;

  // EntityMap holds HA state objects; the condition utils take the full HassEntity shape.
  const haEntities = entities as HassEntities;
  const fallbackEntityId = resolveConditionEntityId(source.cardId, source.settings, haEntities);
  const matches = evaluateVisibilityConditionConfig({
    condition,
    entity: fallbackEntityId ? (haEntities[fallbackEntityId] as HassEntity | undefined) : null,
    entities: haEntities,
    getAttribute: undefined,
    fallbackEntityId,
  });
  if (!matches) return null;

  if (source.kind === 'camera') {
    return typeof source.settings.cameraId === 'string' ? source.settings.cameraId : null;
  }
  return fallbackEntityId ?? source.cardId;
}

export function buildMomentActivities(
  sources: MomentSource[],
  entities: EntityMap
): MomentActivity[] {
  return sources.map((source) => {
    const isNotice = source.kind === 'notice';
    return {
      cardId: source.cardId,
      kind: source.kind,
      entityId:
        source.kind === 'media'
          ? (mediaEntityIds(source).find((id) => isShowablePlayback(entities[id])) ?? null)
          : activeConditionEntityId(source, entities),
      // A finished washing machine can stay finished for hours, so a notice
      // goes by its time on screen. The others go by when things went quiet.
      closeAfterMs: isNotice ? 0 : source.closeAfterMs,
      maxVisibleMs: isNotice ? source.closeAfterMs : null,
    };
  });
}

function updateSessions(
  previous: MomentsState['sessions'],
  activities: MomentActivity[],
  now: number,
  inGrace: boolean
): MomentsState['sessions'] {
  const sessions: MomentsState['sessions'] = {};

  activities.forEach((activity) => {
    const session = previous[activity.cardId];
    if (activity.entityId) {
      sessions[activity.cardId] = session
        ? { ...session, entityId: activity.entityId, stoppedSince: null }
        : {
            kind: activity.kind,
            entityId: activity.entityId,
            startedAt: now,
            stoppedSince: null,
            shownAt: null,
            seen: inGrace,
          };
      return;
    }
    if (!session) return;
    const stoppedSince = session.stoppedSince ?? now;
    if (now - stoppedSince < activity.closeAfterMs) {
      sessions[activity.cardId] = { ...session, stoppedSince };
    }
  });

  return sessions;
}

function waitingCardIds(sessions: MomentsState['sessions']): string[] {
  return Object.keys(sessions)
    .filter((cardId) => !sessions[cardId].seen && sessions[cardId].stoppedSince === null)
    .sort((a, b) => {
      const byPriority =
        KIND_RULES[sessions[b].kind].priority - KIND_RULES[sessions[a].kind].priority;
      return byPriority || sessions[a].startedAt - sessions[b].startedAt;
    });
}

/**
 * One pass of the rules. Pure, so the timing can be tested without timers:
 * call it whenever something changes and again at `wakeAt`.
 */
export function stepMoments(previous: MomentsState, input: MomentsInput): MomentsResult {
  const { now, activities, popupOpen, editing, screenFits, viewOpen } = input;
  const firstSeenAt = previous.firstSeenAt ?? now;
  const sessions = updateSessions(
    previous.sessions,
    activities,
    now,
    now - firstSeenAt < MOMENT_STARTUP_GRACE_MS
  );
  let visibleCardId = previous.visibleCardId;

  if (visibleCardId !== null && !viewOpen) {
    // Closed from outside the rules, which means by the user. Other things of
    // the same kind count as closed too, but music can return after a doorbell.
    const closedKind = previous.sessions[visibleCardId]?.kind;
    Object.values(sessions).forEach((session) => {
      if (session.kind === closedKind) session.seen = true;
    });
    visibleCardId = null;
  }

  activities.forEach((activity) => {
    const session = visibleCardId === activity.cardId ? sessions[activity.cardId] : undefined;
    if (!session?.shownAt || activity.maxVisibleMs === null) return;
    if (now - session.shownAt >= activity.maxVisibleMs) {
      session.seen = true;
      visibleCardId = null;
    }
  });

  if (visibleCardId !== null && !sessions[visibleCardId]) visibleCardId = null;

  const canShow = (kind: MomentKind) =>
    screenFits && !editing && (KIND_RULES[kind].overPopups || !popupOpen);
  const waiting = waitingCardIds(sessions);

  if (visibleCardId !== null) {
    const current = sessions[visibleCardId];
    const best = waiting[0] ? sessions[waiting[0]] : undefined;
    const outranked = best && KIND_RULES[best.kind].priority > KIND_RULES[current.kind].priority;
    if (best && best !== current && canShow(best.kind)) {
      if (outranked || current.stoppedSince !== null) visibleCardId = waiting[0];
    }
  } else {
    for (const cardId of waiting) {
      const { kind } = sessions[cardId];
      if (canShow(kind)) {
        visibleCardId = cardId;
        break;
      }
      if (!KIND_RULES[kind].waits) sessions[cardId].seen = true;
    }
  }

  const shown = visibleCardId !== null ? sessions[visibleCardId] : undefined;
  if (shown && shown.shownAt === null) shown.shownAt = now;

  const deadlines = activities.flatMap((activity) => {
    const session = sessions[activity.cardId];
    if (!session) return [];
    const times: number[] = [];
    if (session.stoppedSince !== null) times.push(session.stoppedSince + activity.closeAfterMs);
    if (session === shown && session.shownAt !== null && activity.maxVisibleMs !== null) {
      times.push(session.shownAt + activity.maxVisibleMs);
    }
    return times;
  });

  return {
    state: { firstSeenAt, sessions, visibleCardId },
    visible:
      shown && visibleCardId !== null
        ? { cardId: visibleCardId, kind: shown.kind, entityId: shown.entityId }
        : null,
    wakeAt: deadlines.length ? Math.min(...deadlines) : null,
  };
}
