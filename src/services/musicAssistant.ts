// Music Assistant actions (HA `music_assistant` integration) used by the media chooser.

import type { Connection } from 'home-assistant-js-websocket';

type HaConnection = Connection | null | undefined;

export type MusicAssistantItem = {
  media_type?: string;
  uri?: string;
  name?: string;
  version?: string | null;
  image?: string | null;
  favorite?: boolean;
  artists?: MusicAssistantItem[] | null;
  album?: MusicAssistantItem | null;
};

export type MusicAssistantChoice = {
  id: string;
  label: string;
  type: string;
  image: string | null;
  source: string;
  musicAssistant: true;
};

export const MUSIC_ASSISTANT_SEARCH_TYPES = [
  'tracks',
  'albums',
  'artists',
  'playlists',
  'radio',
  'podcasts',
  'audiobooks',
] as const;

const configEntryRequests = new WeakMap<Connection, Map<string, Promise<string | null>>>();

function requireConnection(conn: HaConnection): Connection {
  if (!conn || typeof conn.sendMessagePromise !== 'function') {
    throw new Error('Invalid or disconnected HA connection');
  }
  return conn;
}

/** The Music Assistant config entry that owns a player, read from the entity registry. */
export function getMusicAssistantConfigEntryId(
  conn: HaConnection,
  entityId: string
): Promise<string | null> {
  const connection = requireConnection(conn);
  let requests = configEntryRequests.get(connection);
  if (!requests) {
    requests = new Map();
    configEntryRequests.set(connection, requests);
  }
  let request = requests.get(entityId);
  if (!request) {
    request = connection
      .sendMessagePromise<{ config_entry_id?: string | null } | null>({
        type: 'config/entity_registry/get',
        entity_id: entityId,
      })
      .then((entry) => entry?.config_entry_id || null);
    request.catch(() => requests?.delete(entityId));
    requests.set(entityId, request);
  }
  return request;
}

async function callForResponse(
  conn: HaConnection,
  service: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await requireConnection(conn).sendMessagePromise<{ response?: unknown } | null>({
    type: 'call_service',
    domain: 'music_assistant',
    service,
    service_data: data,
    return_response: true,
  });
  const response = res?.response;
  return response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
}

const itemList = (value: unknown): MusicAssistantItem[] =>
  Array.isArray(value) ? (value as MusicAssistantItem[]) : [];

export async function searchMusicAssistant(
  conn: HaConnection,
  configEntryId: string,
  query: string,
  limit = 8
): Promise<Record<(typeof MUSIC_ASSISTANT_SEARCH_TYPES)[number], MusicAssistantItem[]>> {
  const response = await callForResponse(conn, 'search', {
    config_entry_id: configEntryId,
    name: query,
    limit,
  });
  return Object.fromEntries(
    MUSIC_ASSISTANT_SEARCH_TYPES.map((type) => [type, itemList(response[type])])
  ) as Record<(typeof MUSIC_ASSISTANT_SEARCH_TYPES)[number], MusicAssistantItem[]>;
}

export async function getMusicAssistantLibrary(
  conn: HaConnection,
  configEntryId: string,
  mediaType: string,
  options: { favorite?: boolean; limit?: number; orderBy?: string } = {}
): Promise<MusicAssistantItem[]> {
  const response = await callForResponse(conn, 'get_library', {
    config_entry_id: configEntryId,
    media_type: mediaType,
    ...(options.favorite ? { favorite: true } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
    ...(options.orderBy ? { order_by: options.orderBy } : {}),
  });
  return itemList(response.items);
}

export function toMusicAssistantChoice(item: MusicAssistantItem): MusicAssistantChoice | null {
  if (!item?.uri || !item.name) return null;
  const artists = (item.artists || [])
    .map((artist) => artist?.name)
    .filter(Boolean)
    .join(', ');
  return {
    id: item.uri,
    label: item.version ? `${item.name} (${item.version})` : item.name,
    type: item.media_type || 'track',
    image: item.image || item.album?.image || null,
    source: artists,
    musicAssistant: true,
  };
}

export function toMusicAssistantChoices(items: MusicAssistantItem[]): MusicAssistantChoice[] {
  const seen = new Set<string>();
  return items.reduce<MusicAssistantChoice[]>((choices, item) => {
    const choice = toMusicAssistantChoice(item);
    if (choice && !seen.has(choice.id)) {
      seen.add(choice.id);
      choices.push(choice);
    }
    return choices;
  }, []);
}
