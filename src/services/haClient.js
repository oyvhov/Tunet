// Lightweight HA WebSocket client helpers
// All functions assume a valid Home Assistant connection `conn`
// via home-assistant-js-websocket createConnection.

export function callService(conn, domain, service, service_data) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    return Promise.reject(new Error('Invalid or disconnected HA connection'));
  }

  const { target, ...restData } = service_data || {};
  const message = {
    type: 'call_service',
    domain,
    service,
  };

  if (target) {
    message.target = target;
    message.service_data = restData;
  } else if (service_data && service_data.entity_id && service === 'clean_area') {
    message.target = { entity_id: service_data.entity_id };
    const { entity_id, ...rest } = service_data;
    message.service_data = rest;
  } else {
    message.service_data = service_data;
  }

  return conn
    .sendMessagePromise(message)
    .catch((error) => {
      console.error(`Service call failed (${domain}.${service}):`, error);
      throw error;
    });
}

export async function getHistory(
  conn,
  { start, end, entityId, minimal_response = false, no_attributes = true }
) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: [entityId],
    minimal_response,
    no_attributes,
  });
  let payload = res;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (Array.isArray(payload.result)) payload = payload.result;
    else if (Array.isArray(payload.response)) payload = payload.response;
    else if (Array.isArray(payload.data)) payload = payload.data;
    else if (Array.isArray(payload.history)) payload = payload.history;
  }

  // Support both object keyed by entity_id and array formats
  let historyData = payload && payload[entityId];
  if (!historyData && Array.isArray(payload) && payload.length > 0) {
    historyData = Array.isArray(payload[0]) ? payload[0] : payload;
  }
  return Array.isArray(historyData) ? historyData : [];
}

export function canUseHistoryRest(baseUrl, currentOrigin = globalThis?.window?.location?.origin) {
  if (!baseUrl) return false;
  if (!currentOrigin) return true;

  try {
    const targetUrl = new URL(baseUrl, currentOrigin);
    return targetUrl.origin === currentOrigin;
  } catch {
    return false;
  }
}

export async function getHistoryRest(
  baseUrl,
  token,
  {
    start,
    end: _end,
    entityId,
    minimal_response = false,
    no_attributes = false,
    significant_changes_only = false,
  }
) {
  if (!baseUrl) throw new Error('Missing HA url');
  const root = String(baseUrl).replace(/\/$/, '');
  const startIso = start.toISOString();
  const params = new URLSearchParams({
    filter_entity_id: entityId,
    minimal_response: minimal_response ? '1' : '0',
    no_attributes: no_attributes ? '1' : '0',
    significant_changes_only: significant_changes_only ? '1' : '0',
  });
  const url = `${root}/api/history/period/${startIso}?${params.toString()}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`History REST failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return Array.isArray(data[0]) ? data[0] : data;
  }
  return [];
}

export async function getStatistics(conn, { start, end, statisticId, period = '5minute' }) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: [statisticId],
    period,
  });
  const stats = res && res[statisticId];
  return Array.isArray(stats) ? stats : [];
}

export async function getForecast(conn, { entityId, type = 'hourly' }) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  });

  const extractForecast = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj.forecast)) return obj.forecast;
    return null;
  };

  const candidates = [
    res?.service_response?.weather?.[entityId],
    res?.service_response?.[entityId],
    res?.response?.weather?.[entityId],
    res?.response?.[entityId],
    res?.result?.weather?.[entityId],
    res?.result?.[entityId],
    res?.weather?.[entityId],
    res?.[entityId],
    res,
  ];

  for (const candidate of candidates) {
    const forecast = extractForecast(candidate);
    if (Array.isArray(forecast)) return forecast;
  }

  return [];
}

export async function getCalendarEvents(conn, { start, end, entityIds }) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({
    type: 'call_service',
    domain: 'calendar',
    service: 'get_events',
    target: { entity_id: entityIds },
    service_data: {
      start_date_time: start.toISOString(),
      end_date_time: end.toISOString(),
    },
    return_response: true,
  });

  const normalized = {};
  const addEntries = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.entries(obj).forEach(([key, value]) => {
      if (value && Array.isArray(value.events)) {
        normalized[key] = value;
      } else if (Array.isArray(value)) {
        normalized[key] = { events: value };
      }
    });
  };

  // Common response shapes
  addEntries(res?.service_response?.calendar);
  addEntries(res?.service_response);
  addEntries(res?.response?.calendar);
  addEntries(res?.response);
  addEntries(res?.result?.calendar);
  addEntries(res?.result);
  addEntries(res?.calendar);
  addEntries(res);

  // If still empty but single calendar returns events directly
  if (!Object.keys(normalized).length && res?.events && Array.isArray(res.events)) {
    const key = Array.isArray(entityIds) && entityIds.length === 1 ? entityIds[0] : 'calendar';
    normalized[key] = { events: res.events };
  }

  return normalized;
}

// ─── Todo helpers ─────────────────────────────────────────────

export async function getTodoItems(conn, entityId) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }

  // Try the dedicated WebSocket command first (preferred for frontends)
  try {
    const res = await conn.sendMessagePromise({
      type: 'todo/item/list',
      entity_id: entityId,
    });
    if (res && Array.isArray(res.items)) {
      return res.items;
    }
  } catch {
    // If todo/item/list is not available or fails, fall back to service call
  }

  const res = await conn.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'get_items',
    target: { entity_id: entityId },
    service_data: { status: ['needs_action', 'completed'] },
    return_response: true,
  });

  // HA can wrap the response in several layers
  const extract = (obj) => {
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj.items)) return obj.items;
    const inner = obj[entityId] || obj.response?.[entityId] || obj.service_response?.[entityId];
    if (inner && Array.isArray(inner.items)) return inner.items;
    // Walk first level
    for (const val of Object.values(obj)) {
      if (val && Array.isArray(val.items)) return val.items;
    }
    return [];
  };

  return (
    extract(res?.service_response) ||
    extract(res?.response) ||
    extract(res?.result) ||
    extract(res) ||
    []
  );
}

export async function addTodoItem(conn, entityId, summary) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  return conn.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'add_item',
    target: { entity_id: entityId },
    service_data: { item: summary },
  });
}

export async function updateTodoItem(conn, entityId, uid, status) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  return conn.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'update_item',
    target: { entity_id: entityId },
    service_data: { item: uid, status },
  });
}

export async function removeTodoItem(conn, entityId, uid) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  return conn.sendMessagePromise({
    type: 'call_service',
    domain: 'todo',
    service: 'remove_item',
    target: { entity_id: entityId },
    service_data: { item: uid },
  });
}

// ─── Area / Room registry helpers ─────────────────────────────

export async function getAreas(conn) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({ type: 'config/area_registry/list' });
  return Array.isArray(res) ? res : res?.result || [];
}

export async function getDeviceRegistry(conn) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({ type: 'config/device_registry/list' });
  return Array.isArray(res) ? res : res?.result || [];
}

export async function getEntityRegistry(conn) {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  const res = await conn.sendMessagePromise({ type: 'config/entity_registry/list' });
  return Array.isArray(res) ? res : res?.result || [];
}

/**
 * Get related entity IDs for a source entity using HA registry linkage.
 * Relations are determined by shared device_id and/or config entry id.
 */
export async function getRelatedEntityIds(conn, sourceEntityId, options = {}) {
  if (!sourceEntityId) return [];

  const domains = Array.isArray(options.domains) ? options.domains : null;
  const [entityReg] = await Promise.all([getEntityRegistry(conn)]);
  if (!Array.isArray(entityReg) || entityReg.length === 0) return [];

  const source = entityReg.find((entry) => entry?.entity_id === sourceEntityId);
  if (!source) return [];

  const sourceDeviceId = source.device_id || null;
  const sourceConfigEntries = new Set(
    [
      source.config_entry_id,
      ...(Array.isArray(source.config_entry_ids) ? source.config_entry_ids : []),
    ].filter(Boolean)
  );

  const related = entityReg.filter((entry) => {
    if (!entry?.entity_id) return false;
    if (entry.disabled_by || entry.hidden_by) return false;

    const sameDevice = sourceDeviceId && entry.device_id === sourceDeviceId;
    const entryConfigIds = [
      entry.config_entry_id,
      ...(Array.isArray(entry.config_entry_ids) ? entry.config_entry_ids : []),
    ].filter(Boolean);
    const sameConfigEntry =
      sourceConfigEntries.size > 0 &&
      entryConfigIds.some((configId) => sourceConfigEntries.has(configId));

    if (!sameDevice && !sameConfigEntry) return false;

    if (!domains || domains.length === 0) return true;
    return domains.some((domain) => entry.entity_id.startsWith(`${domain}.`));
  });

  return related.map((entry) => entry.entity_id);
}

/**
 * Get all entity IDs that belong to a given area.
 * Resolves via entity registry (direct area_id) and device registry (device -> area).
 */
export async function getEntitiesForArea(conn, areaId) {
  const [entityReg, deviceReg] = await Promise.all([
    getEntityRegistry(conn),
    getDeviceRegistry(conn),
  ]);

  // Devices in the area
  const deviceIds = new Set(deviceReg.filter((d) => d.area_id === areaId).map((d) => d.id));

  // Entities directly in area OR belonging to a device in the area
  const entityIds = entityReg
    .filter((e) => e.area_id === areaId || (e.device_id && deviceIds.has(e.device_id)))
    .filter((e) => !e.disabled_by && !e.hidden_by)
    .map((e) => e.entity_id);

  return entityIds;
}
