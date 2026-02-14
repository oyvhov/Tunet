function hasCoords(entity) {
  const lat = entity?.attributes?.latitude;
  const lon = entity?.attributes?.longitude;
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
}

export function resolvePersonLocation(entities = {}, personId, preferredTrackerId = null) {
  const person = entities?.[personId];
  if (!person) return { lat: null, lon: null, trackerId: null };

  if (preferredTrackerId && hasCoords(entities?.[preferredTrackerId])) {
    const tracker = entities[preferredTrackerId];
    return {
      lat: Number(tracker.attributes.latitude),
      lon: Number(tracker.attributes.longitude),
      trackerId: preferredTrackerId,
    };
  }

  const sourceId = person?.attributes?.source;
  if (sourceId && hasCoords(entities?.[sourceId])) {
    const source = entities[sourceId];
    return {
      lat: Number(source.attributes.latitude),
      lon: Number(source.attributes.longitude),
      trackerId: sourceId,
    };
  }

  if (hasCoords(person)) {
    return {
      lat: Number(person.attributes.latitude),
      lon: Number(person.attributes.longitude),
      trackerId: personId,
    };
  }

  const personName = String(person?.attributes?.friendly_name || '').toLowerCase();
  const tokens = personName.split(' ').filter((s) => s.length > 2);
  const candidate = Object.values(entities).find((entity) => {
    const id = entity?.entity_id || '';
    if (!id.startsWith('device_tracker.') || !hasCoords(entity)) return false;
    const friendly = String(entity?.attributes?.friendly_name || '').toLowerCase();
    const lowerId = id.toLowerCase();
    return tokens.some((token) => friendly.includes(token) || lowerId.includes(token));
  });

  if (candidate) {
    return {
      lat: Number(candidate.attributes.latitude),
      lon: Number(candidate.attributes.longitude),
      trackerId: candidate.entity_id,
    };
  }

  return { lat: null, lon: null, trackerId: null };
}

export function buildOsmEmbedUrl(lat, lon, zoomSpan = 0.01) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

  const span = Number.isFinite(Number(zoomSpan)) ? Number(zoomSpan) : 0.01;
  const minLon = (lonNum - span).toFixed(6);
  const minLat = (latNum - span).toFixed(6);
  const maxLon = (lonNum + span).toFixed(6);
  const maxLat = (latNum + span).toFixed(6);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latNum.toFixed(6)}%2C${lonNum.toFixed(6)}`;
}
