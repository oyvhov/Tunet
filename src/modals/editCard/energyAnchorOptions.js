export const ENERGY_ANCHOR_CANDIDATE_DOMAINS = [
  'sensor',
  'binary_sensor',
  'number',
  'input_number',
  'weather',
];

export const ENERGY_ANCHOR_KEYWORDS = [
  'energy',
  'solar',
  'pv',
  'panel',
  'grid',
  'battery',
  'home',
  'house',
  'consumption',
  'production',
  'injection',
  'export',
  'import',
  'power',
  'load',
];

export function buildEnergyAnchorOptions({
  entityEntries,
  mappedCandidates,
  matcherCandidates,
  sortByName,
}) {
  const keywordCandidates = entityEntries
    .filter(([id]) => ENERGY_ANCHOR_CANDIDATE_DOMAINS.some((domain) => id.startsWith(`${domain}.`)))
    .filter(([id, entity]) => {
      const text = `${id} ${entity?.attributes?.friendly_name || ''}`.toLowerCase();
      return ENERGY_ANCHOR_KEYWORDS.some((keyword) => text.includes(keyword));
    })
    .map(([id]) => id);

  const domainCandidates = entityEntries
    .filter(([id]) => ENERGY_ANCHOR_CANDIDATE_DOMAINS.some((domain) => id.startsWith(`${domain}.`)))
    .map(([id]) => id);

  const merged = Array.from(new Set([...mappedCandidates, ...matcherCandidates, ...keywordCandidates]));
  if (merged.length > 0) return sortByName(merged);
  return sortByName(Array.from(new Set(domainCandidates)));
}
