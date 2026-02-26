function normalizeEntityList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
}

export function getEffectiveRoomEntityIds(settings) {
  const baseEntityIds = normalizeEntityList(settings?.entityIds);
  const includedEntityIds = normalizeEntityList(settings?.includedEntityIds);
  const excluded = new Set(normalizeEntityList(settings?.excludedEntityIds));

  const merged = [...baseEntityIds, ...includedEntityIds];
  const deduped = [];
  const seen = new Set();

  merged.forEach((entityId) => {
    if (excluded.has(entityId)) return;
    if (seen.has(entityId)) return;
    seen.add(entityId);
    deduped.push(entityId);
  });

  return deduped;
}

export function filterEntitiesByDomain(entityIds, domains) {
  const domainSet = new Set(Array.isArray(domains) ? domains : []);
  return (Array.isArray(entityIds) ? entityIds : []).filter((entityId) => {
    const domain = entityId.split('.')[0];
    return domainSet.has(domain);
  });
}
