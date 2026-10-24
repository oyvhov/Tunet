// Logic for Status Pill component

import type { HassEntity } from '../types/ha';

/**
 * Filter and format player name based on pill configuration patterns
 * @param {string} value - The raw player name
 * @param {string} filterPattern - Comma-separated list of patterns to remove (e.g. "Kodi *")
 * @returns {string} - Cleaned name
 */
export const applyPlayerNameDisplayFilter = (
  value: string | null | undefined,
  filterPattern?: unknown
): string => {
  const name = String(value || '');
  const rawFilter = typeof filterPattern === 'string' ? filterPattern : '';
  const patterns = rawFilter
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!name || patterns.length === 0) return name;

  let cleaned = name;
  let didApply = false;
  patterns.forEach((pattern) => {
    const wildcardIndex = pattern.indexOf('*');
    const prefixCandidate = wildcardIndex >= 0 ? pattern.slice(0, wildcardIndex) : pattern;
    const prefix = prefixCandidate.trim();
    if (!prefix) return;

    const escapedPrefix = prefix.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedPrefix}`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      didApply = true;
    }
  });

  return didApply ? cleaned : name;
};

/**
 * Checks if a media entity has metadata
 * @param {Object} candidate - The entity object
 * @returns {boolean}
 */
export const hasCandidateMediaMetadata = (candidate: HassEntity | null | undefined): boolean => {
  if (!candidate) return false;
  const attrs = candidate.attributes || {};
  return Boolean(
    attrs.media_title ||
    attrs.media_channel ||
    attrs.media_artist ||
    attrs.media_album_name ||
    attrs.entity_picture ||
    attrs.media_image_url
  );
};

/**
 * Scores and picks the best entity to display from a list of candidates
 * @param {Array} candidates - Array of media player entities
 * @returns {Object|null} - The best entity to display
 */
export const pickBestDisplayEntity = (
  candidates: (HassEntity | null | undefined)[] | null | undefined
): HassEntity | null => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  // filter(Boolean) drops null/undefined but TS doesn't narrow the element type from it
  const scored = (candidates.filter(Boolean) as HassEntity[])
    .map((candidate) => {
      const attrs = candidate.attributes || {};
      const hasTitle = Boolean(attrs.media_title || attrs.media_channel || attrs.media_album_name);
      const hasImage = Boolean(attrs.entity_picture || attrs.media_image_url);
      const hasArtist = Boolean(attrs.media_artist || attrs.media_album_name);
      const hasMetadata = hasCandidateMediaMetadata(candidate);
      const isPlayingState = candidate.state === 'playing';
      const score =
        (isPlayingState ? 100 : 0) +
        (hasMetadata ? 25 : 0) +
        (hasTitle ? 10 : 0) +
        (hasImage ? 5 : 0) +
        (hasArtist ? 2 : 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.candidate || null;
};
