/**
 * Frontend API client for the Tunet backend.
 * All calls go to /api/* which Vite proxies to the backend in dev mode,
 * and Express serves directly in production.
 */

const API_BASE = './api';

async function request(path, options = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

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

const userHeaders = (haUserId) => (
  haUserId ? { 'x-ha-user-id': String(haUserId) } : {}
);

// ── Profiles ─────────────────────────────────────────────────────────

export function fetchProfiles(haUserId) {
  return request(`/profiles?ha_user_id=${encodeURIComponent(haUserId)}`, {
    headers: userHeaders(haUserId),
  });
}

export function fetchProfile(id, haUserId) {
  return request(`/profiles/${id}`, {
    headers: userHeaders(haUserId),
  });
}

export function createProfile({ ha_user_id, name, device_label, data }) {
  return request('/profiles', {
    method: 'POST',
    headers: userHeaders(ha_user_id),
    body: JSON.stringify({ ha_user_id, name, device_label, data }),
  });
}

export function updateProfile(id, { ha_user_id, name, device_label, data }) {
  return request(`/profiles/${id}`, {
    method: 'PUT',
    headers: userHeaders(ha_user_id),
    body: JSON.stringify({ ha_user_id, name, device_label, data }),
  });
}

export function deleteProfile(id, haUserId) {
  return request(`/profiles/${id}`, {
    method: 'DELETE',
    headers: userHeaders(haUserId),
  });
}

// ── Templates ────────────────────────────────────────────────────────
