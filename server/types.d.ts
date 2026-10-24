import 'express-serve-static-core';

export interface HaUser {
  id: string;
  name: string;
  is_admin: boolean;
  is_owner: boolean;
  source?: string;
}

export interface ProfileRow {
  id: string;
  ha_user_id: string;
  name: string;
  device_label: string | null;
  data: string;
  data_enc: string | null;
  created_at: string;
  updated_at: string;
}

export interface CurrentSettingsRow {
  ha_user_id: string;
  device_id: string;
  device_label: string | null;
  data: string;
  data_enc: string | null;
  revision: number;
  updated_at: string;
}

export interface SettingsHistoryRow {
  ha_user_id: string;
  device_id: string;
  revision: number;
  data: string;
  data_enc: string | null;
  updated_at: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    authenticatedHaUser?: HaUser;
    authenticatedHaUrl?: string | null;
  }
}
