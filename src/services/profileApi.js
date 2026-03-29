/**
 * Frontend API client for the Tunet backend.
 * All calls go to /api/* which Vite proxies to the backend in dev mode,
 * and Express serves directly in production.
 */

import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
} from './apiAuth';

const API_BASE = './api';

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
      throw notifyHomeAssistantApiUnauthorized(body.error || 'Home Assistant authentication failed');
    }
    const error = /** @type {any} */ (new Error(body.error || `API error ${res.status}`));
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

// ── Profiles ─────────────────────────────────────────────────────────

export function fetchProfiles(haUserId) {
  return request(`/profiles?ha_user_id=${encodeURIComponent(haUserId)}`, {});
}

export function fetchProfile(id, _haUserId) {
  return request(`/profiles/${id}`, {});
}

export function createProfile({ ha_user_id, name, device_label, data }) {
  return request('/profiles', {
    method: 'POST',
    body: JSON.stringify({ ha_user_id, name, device_label, data }),
  });
}

export function updateProfile(id, { ha_user_id, name, device_label, data } = {}) {
  const body = {};
  if (ha_user_id !== undefined) body.ha_user_id = ha_user_id;
  if (name !== undefined) body.name = name;
  if (device_label !== undefined) body.device_label = device_label;
  if (data !== undefined) body.data = data;

  return request(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteProfile(id, _haUserId) {
  return request(`/profiles/${id}`, {
    method: 'DELETE',
  });
}

// ── Templates ────────────────────────────────────────────────────────
