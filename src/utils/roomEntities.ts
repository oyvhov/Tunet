function normalizeEntityList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export interface RoomEntitySettings {
  entityIds?: unknown;
  includedEntityIds?: unknown;
  excludedEntityIds?: unknown;
}

export function getEffectiveRoomEntityIds(
  settings: RoomEntitySettings | null | undefined
): string[] {
  const baseEntityIds = normalizeEntityList(settings?.entityIds);
  const includedEntityIds = normalizeEntityList(settings?.includedEntityIds);
  const excluded = new Set(normalizeEntityList(settings?.excludedEntityIds));

  const merged = [...baseEntityIds, ...includedEntityIds];
  const deduped: string[] = [];
  const seen = new Set<string>();

  merged.forEach((entityId) => {
    if (excluded.has(entityId)) return;
    if (seen.has(entityId)) return;
    seen.add(entityId);
    deduped.push(entityId);
  });

  return deduped;
}

export function filterEntitiesByDomain(
  entityIds: string[] | null | undefined,
  domains: string[] | null | undefined
): string[] {
  const domainSet = new Set<string>(Array.isArray(domains) ? domains : []);
  return (Array.isArray(entityIds) ? entityIds : []).filter((entityId) => {
    const domain = entityId.split('.')[0];
    return domainSet.has(domain);
  });
}
