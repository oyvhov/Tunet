const API_BASE = './api';

import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
} from './apiAuth';
import { INGRESS_SESSION_INVALID, isIngressSessionRejection } from './ingressSession';

type AuthHeaders = Awaited<ReturnType<typeof getValidatedHomeAssistantRequestHeadersAsync>>;

type RequestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

type RetryOptions = {
  retryOnOAuthUnauthorized?: boolean;
  authHeadersOverride?: AuthHeaders | null;
};

type ApiErrorBody = { error?: string; [key: string]: unknown };

type ApiError = Error & { status?: number; body?: ApiErrorBody };

export interface CurrentSettingsRow {
  ha_user_id: string;
  device_id: string;
  data: unknown;
  revision: number;
  device_label: string | null;
  updated_at: string;
}

export interface SettingsHistoryEntry {
  revision: number;
  updated_at: string;
}

export interface SettingsDevice {
  device_id: string;
  device_label: string | null;
  revision: number;
  updated_at: string;
}

export interface DeleteSettingsHistoryResponse {
  success: boolean;
  deleted: number;
  kept_revision?: number;
}

export interface DeleteSettingsDeviceResponse {
  success: boolean;
  deleted_current: number;
  deleted_history: number;
}

export interface UpdateDeviceLabelResponse {
  success: boolean;
  ha_user_id: string;
  device_id: string;
  device_label: string | null;
}

export interface SaveCurrentSettingsPayload {
  ha_user_id: string;
  device_id: string;
  data: unknown;
  base_revision?: number | null;
  history_keep_limit?: number;
  device_label?: string;
}

export interface SaveCurrentSettingsResponse {
  ha_user_id: string;
  device_id: string;
  revision: number;
  updated_at: string;
}

export interface PublishCurrentSettingsPayload {
  ha_user_id: string;
  source_device_id: string;
  target_device_id?: string;
  history_keep_limit?: number;
  base_revisions?: Record<string, number>;
}

export interface PublishConflict {
  device_id: string;
  revision: number;
}

export interface PublishCurrentSettingsResponse {
  success: boolean;
  affected: number;
  conflicts: PublishConflict[];
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

export function fetchCurrentSettings(
  haUserId: string,
  deviceId: string,
  revision?: number
): Promise<CurrentSettingsRow | null> {
  const revisionQuery = Number.isFinite(Number(revision))
    ? // Number.isFinite(Number(undefined)) is false, so revision is defined here.
      `&revision=${encodeURIComponent(revision as number)}`
    : '';
  return request<CurrentSettingsRow | null>(
    `/settings/current?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}${revisionQuery}`,
    {}
  );
}

export function fetchSettingsHistory(
  haUserId: string,
  deviceId: string,
  limit = 20
): Promise<SettingsHistoryEntry[]> {
  return request<SettingsHistoryEntry[]>(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&limit=${encodeURIComponent(limit)}`,
    {}
  );
}

export function deleteSettingsHistory(
  haUserId: string,
  deviceId: string,
  keepLatest = true
): Promise<DeleteSettingsHistoryResponse> {
  const keepLatestQuery = keepLatest ? '1' : '0';
  return request<DeleteSettingsHistoryResponse>(
    `/settings/history?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}&keep_latest=${keepLatestQuery}`,
    {
      method: 'DELETE',
    }
  );
}

export function saveCurrentSettings(
  {
    ha_user_id,
    device_id,
    data,
    base_revision,
    history_keep_limit,
    device_label,
  }: SaveCurrentSettingsPayload,
  fetchOptions: RequestOptions = {}
): Promise<SaveCurrentSettingsResponse> {
  return request<SaveCurrentSettingsResponse>('/settings/current', {
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

export function fetchCurrentDevices(haUserId: string): Promise<SettingsDevice[]> {
  return request<SettingsDevice[]>(
    `/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}`,
    {}
  );
}

export function deleteSettingsDevice(
  haUserId: string,
  deviceId: string
): Promise<DeleteSettingsDeviceResponse> {
  return request<DeleteSettingsDeviceResponse>(
    `/settings/devices?ha_user_id=${encodeURIComponent(haUserId)}&device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'DELETE',
    }
  );
}

export function updateSettingsDeviceLabel(
  haUserId: string,
  deviceId: string,
  deviceLabel: string | null | undefined
): Promise<UpdateDeviceLabelResponse> {
  return request<UpdateDeviceLabelResponse>('/settings/devices/label', {
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
}: PublishCurrentSettingsPayload): Promise<PublishCurrentSettingsResponse> {
  return request<PublishCurrentSettingsResponse>('/settings/publish', {
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
