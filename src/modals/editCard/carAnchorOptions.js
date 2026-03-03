export const CAR_ANCHOR_CANDIDATE_DOMAINS = [
  'device_tracker',
  'sensor',
  'binary_sensor',
  'climate',
  'lock',
  'switch',
  'button',
  'number',
  'select',
  'input_number',
  'input_select',
];

export const CAR_ANCHOR_KEYWORDS = [
  'car',
  'vehicle',
  'ev',
  'battery',
  'range',
  'odometer',
  'charge',
  'charging',
  'plug',
  'climate',
  'lock',
  'tracker',
  'location',
];

export function buildCarAnchorOptions({
  entityEntries,
  mappedCandidates,
  matcherCandidates,
  sortByName,
}) {
  const keywordCandidates = entityEntries
    .filter(([id]) => CAR_ANCHOR_CANDIDATE_DOMAINS.some((domain) => id.startsWith(`${domain}.`)))
    .filter(([id, entity]) => {
      const text = `${id} ${entity?.attributes?.friendly_name || ''}`.toLowerCase();
      return CAR_ANCHOR_KEYWORDS.some((keyword) => text.includes(keyword));
    })
    .map(([id]) => id);

  const domainCandidates = entityEntries
    .filter(([id]) => CAR_ANCHOR_CANDIDATE_DOMAINS.some((domain) => id.startsWith(`${domain}.`)))
    .map(([id]) => id);

  const merged = Array.from(new Set([...mappedCandidates, ...matcherCandidates, ...keywordCandidates]));
  if (merged.length > 0) return sortByName(merged);
  return sortByName(Array.from(new Set(domainCandidates)));
}