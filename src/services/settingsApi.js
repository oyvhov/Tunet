const API_BASE = './api';

import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
} from './apiAuth';

async function request(
  path,
  options = {},
  { retryOnOAuthUnauthorized = true, authHeadersOverride = null } = {}
) {
  const authHeaders = authHeadersOverride ?? (await getValidatedHomeAssistantRequestHeadersAsync());
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    if (res.status === 401 && retryOnOAuthUnauthorized && getStoredAuthMethod() === 'oauth') {
      const retryHeaders = await getValidatedHomeAssistantRequestHeadersAsync({
        forceRefreshOAuth: true,
      });
      return request(
        path,
        {
          ...options,
        },
        {
          retryOnOAuthUnauthorized: false,
          authHeadersOverride: retryHeaders,
        }
      );
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw notifyHomeAssistantApiUnauthorized(
        body.error || 'Home Assistant authentication failed'
      );
    }
    const error = /** @type {any} */ (new Error(body.error || `API error ${res.status}`));
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

export function fetchCurrentSettings(haUserId, deviceId, revision) {
  const revisionQuery = Number.isFinite(Number(revision))
    ? `&revision=${encodeURIComponent(revision)}`
    : '';
  return request(
    `/settings/current?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}${revisionQuery}`,
    {}
  );
}

export function fetchSettingsHistory(haUserId, deviceId, limit = 20) {
  return request(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&limit=${encodeURIComponent(limit)}`,
    {}
  );
}

export function deleteSettingsHistory(haUserId, deviceId, keepLatest = true) {
  const keepLatestQuery = keepLatest ? '1' : '0';
  return request(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&keep_latest=${keepLatestQuery}`,
    {
      method: 'DELETE',
    }
  );
}

export function saveCurrentSettings(
  { ha_user_id, device_id, data, base_revision, history_keep_limit, device_label },
  fetchOptions = {}
) {
  return request('/settings/current', {
    method: 'PUT',
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
  return request(`/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}`, {});
}

export function deleteSettingsDevice(haUserId, deviceId) {
  return request(
    `/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'DELETE',
    }
  );
}

export function updateSettingsDeviceLabel(haUserId, deviceId, deviceLabel) {
  return request('/settings/devices/label', {
    method: 'PUT',
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
  base_revisions,
}) {
  return request('/settings/publish', {
    method: 'POST',
    body: JSON.stringify({
      ha_user_id,
      source_device_id,
      target_device_id,
      history_keep_limit,
      base_revisions,
    }),
  });
}
