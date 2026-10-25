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
import { INGRESS_SESSION_INVALID, isIngressSessionRejection } from './ingressSession';

const API_BASE = './api';

type AuthHeaders = Awaited<ReturnType<typeof getValidatedHomeAssistantRequestHeadersAsync>>;

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

type RetryOptions = {
  retryOnOAuthUnauthorized?: boolean;
  authHeadersOverride?: AuthHeaders | null;
};

type ApiErrorBody = { error?: string; [key: string]: unknown };

type ApiError = Error & { status?: number; body?: ApiErrorBody };

export interface ProfileRow {
  id: string;
  ha_user_id: string;
  name: string;
  device_label?: string | null;
  data: unknown;
  created_at: string;
  updated_at: string;
}

export interface CreateProfilePayload {
  ha_user_id: string;
  name: string;
  device_label?: string | null;
  data: unknown;
}

export interface UpdateProfilePayload {
  ha_user_id?: string;
  name?: string;
  device_label?: string | null;
  data?: unknown;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  { retryOnOAuthUnauthorized = true, authHeadersOverride = null }: RetryOptions = {}
): Promise<T> {
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
    if (isIngressSessionRejection(res)) {
      // Keep the stored credentials: only the ingress session is stale.
      const error: ApiError = new Error('Home Assistant ingress session is not valid');
      error.status = res.status;
      error.body = { error: INGRESS_SESSION_INVALID };
      throw error;
    }
    if (res.status === 401 && retryOnOAuthUnauthorized && getStoredAuthMethod() === 'oauth') {
      const retryHeaders = await getValidatedHomeAssistantRequestHeadersAsync({
        forceRefreshOAuth: true,
      });
      return request<T>(
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

    const body: ApiErrorBody = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw notifyHomeAssistantApiUnauthorized(
        body.error || 'Home Assistant authentication failed'
      );
    }
    const error: ApiError = new Error(body.error || `API error ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

// ── Profiles ─────────────────────────────────────────────────────────

export function fetchProfiles(haUserId: string): Promise<ProfileRow[]> {
  return request<ProfileRow[]>(`/profiles?ha_user_id=${encodeURIComponent(haUserId)}`, {});
}

export function fetchProfile(id: string, _haUserId?: string): Promise<ProfileRow> {
  return request<ProfileRow>(`/profiles/${id}`, {});
}

export function createProfile({
  ha_user_id,
  name,
  device_label,
  data,
}: CreateProfilePayload): Promise<ProfileRow> {
  return request<ProfileRow>('/profiles', {
    method: 'POST',
    body: JSON.stringify({ ha_user_id, name, device_label, data }),
  });
}

export function updateProfile(id: string, payload: UpdateProfilePayload = {}): Promise<ProfileRow> {
  const { ha_user_id, name, device_label, data } = payload;
  const body: UpdateProfilePayload = {};
  if (ha_user_id !== undefined) body.ha_user_id = ha_user_id;
  if (name !== undefined) body.name = name;
  if (device_label !== undefined) body.device_label = device_label;
  if (data !== undefined) body.data = data;

  return request<ProfileRow>(`/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteProfile(id: string, _haUserId?: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/profiles/${id}`, {
    method: 'DELETE',
  });
}

// ── Templates ────────────────────────────────────────────────────────
