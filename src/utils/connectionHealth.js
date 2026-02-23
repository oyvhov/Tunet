export const ENTITY_STALE_DISCONNECT_GRACE_MS = 15_000;
export const ENTITY_STALE_NO_UPDATE_MS = 60_000;

/**
 * @param {Object} input
 * @param {boolean} input.entitiesLoaded
 * @param {boolean} input.connected
 * @param {number | null} input.disconnectedSince
 * @param {number} input.lastEntityUpdateAt
 * @param {number} [input.now]
 */
export const isEntityDataStale = ({
  entitiesLoaded,
  connected,
  disconnectedSince,
  lastEntityUpdateAt,
  now = Date.now(),
}) => {
  if (!entitiesLoaded) return false;

  if (!connected) {
    if (!disconnectedSince) return false;
    return (now - disconnectedSince) >= ENTITY_STALE_DISCONNECT_GRACE_MS;
  }

  if (!lastEntityUpdateAt) return false;
  return (now - lastEntityUpdateAt) >= ENTITY_STALE_NO_UPDATE_MS;
};
