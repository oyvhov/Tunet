const API_BASE = './api';

async function request(path, options = {}) {
  const mergedHeaders = options.headers
    ? {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    : { 'Content-Type': 'application/json' };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `API error ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

const userHeaders = (haUserId) => (haUserId ? { 'x-ha-user-id': String(haUserId) } : {});

export function fetchCurrentSettings(haUserId, deviceId, revision) {
  const revisionQuery = Number.isFinite(Number(revision))
    ? `&revision=${encodeURIComponent(revision)}`
    : '';
  return request(
    `/settings/current?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}${revisionQuery}`,
    {
      headers: userHeaders(haUserId),
    }
  );
}

export function fetchSettingsHistory(haUserId, deviceId, limit = 20) {
  return request(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&limit=${encodeURIComponent(limit)}`,
    {
      headers: userHeaders(haUserId),
    }
  );
}

export function deleteSettingsHistory(haUserId, deviceId, keepLatest = true) {
  const keepLatestQuery = keepLatest ? '1' : '0';
  return request(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&keep_latest=${keepLatestQuery}`,
    {
      method: 'DELETE',
      headers: userHeaders(haUserId),
    }
  );
}

export function saveCurrentSettings(
  { ha_user_id, device_id, data, base_revision, history_keep_limit, device_label },
  fetchOptions = {}
) {
  return request('/settings/current', {
    method: 'PUT',
    headers: userHeaders(ha_user_id),
    body: JSON.stringify({
      ha_user_id,
      device_id,
      data,
      base_revision,
      history_keep_limit,
      device_label,
    }),
    ...fetchOptions,
  });
}

export function fetchCurrentDevices(haUserId) {
  return request(`/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}`, {
    headers: userHeaders(haUserId),
  });
}

export function deleteSettingsDevice(haUserId, deviceId) {
  return request(
    `/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'DELETE',
      headers: userHeaders(haUserId),
    }
  );
}

export function updateSettingsDeviceLabel(haUserId, deviceId, deviceLabel) {
  return request('/settings/devices/label', {
    method: 'PUT',
    headers: userHeaders(haUserId),
    body: JSON.stringify({
      ha_user_id: haUserId,
      device_id: deviceId,
      device_label: deviceLabel,
    }),
  });
}

export function publishCurrentSettings({
  ha_user_id,
  source_device_id,
  target_device_id,
  history_keep_limit,
}) {
  return request('/settings/publish', {
    method: 'POST',
    headers: userHeaders(ha_user_id),
    body: JSON.stringify({ ha_user_id, source_device_id, target_device_id, history_keep_limit }),
  });
}
