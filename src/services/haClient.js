// Lightweight HA WebSocket client helpers
// All functions assume a valid Home Assistant connection `conn`
// via window.HAWS createConnection.

export function callService(conn, domain, service, service_data) {
  if (!conn) return Promise.reject(new Error('No HA connection'));
  return conn.sendMessagePromise({
    type: 'call_service',
    domain,
    service,
    service_data,
  });
}

export async function getHistory(conn, { start, end, entityId, minimal_response = false, no_attributes = true }) {
  if (!conn) throw new Error('No HA connection');
  const res = await conn.sendMessagePromise({
    type: 'history/history_during_period',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    entity_ids: [entityId],
    minimal_response,
    no_attributes,
  });
  // Support both object keyed by entity_id and array formats
  let historyData = res && res[entityId];
  if (!historyData && Array.isArray(res) && res.length > 0) historyData = res[0];
  return Array.isArray(historyData) ? historyData : [];
}

export async function getStatistics(conn, { start, end, statisticId, period = '5minute' }) {
  if (!conn) throw new Error('No HA connection');
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
  if (!conn) throw new Error('No HA connection');
  const res = await conn.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  });
  const fc = res && res[entityId] && res[entityId].forecast;
  return Array.isArray(fc) ? fc : [];
}
