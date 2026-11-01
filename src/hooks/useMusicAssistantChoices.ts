import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import {
  getMusicAssistantConfigEntryId,
  getMusicAssistantLibrary,
  MUSIC_ASSISTANT_SEARCH_TYPES,
  searchMusicAssistant,
  toMusicAssistantChoices,
} from '../services/musicAssistant';
import type { MusicAssistantChoice } from '../services/musicAssistant';

const FAVORITE_TYPES = ['playlist', 'album', 'artist', 'radio', 'track'];
const SEARCH_DELAY_MS = 350;

type LibraryChoices = {
  playerId: string;
  favorites: MusicAssistantChoice[];
  playlists: MusicAssistantChoice[];
  library: MusicAssistantChoice[];
};

export type MusicAssistantChoices = {
  favorites: MusicAssistantChoice[];
  playlists: MusicAssistantChoice[];
  library: MusicAssistantChoice[];
  search: MusicAssistantChoice[];
  loading: boolean;
  error: boolean;
  loaded: boolean;
};

/**
 * Favorites, playlists, recently played albums and live search for a Music Assistant player.
 * Returns null when `playerId` is empty, so callers keep their generic media browser.
 */
export function useMusicAssistantChoices({
  conn,
  playerId,
  active,
  query,
}: {
  conn: Connection | null | undefined;
  playerId: string | null | undefined;
  active: boolean;
  query: string;
}): MusicAssistantChoices | null {
  const [libraryChoices, setLibraryChoices] = useState<LibraryChoices | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    key: string;
    choices: MusicAssistantChoice[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(false);
  const trimmedQuery = query.trim();
  const loadedForPlayer = !!playerId && libraryChoices?.playerId === playerId;

  useEffect(() => {
    if (!conn || !playerId || !active || loadedForPlayer) return undefined;
    let cancelled = false;
    setLibraryLoading(true);
    setError(false);
    (async () => {
      try {
        const entryId = await getMusicAssistantConfigEntryId(conn, playerId);
        if (!entryId) throw new Error('music_assistant_entry_missing');
        const [favorites, playlists, albums] = await Promise.all([
          Promise.all(
            FAVORITE_TYPES.map((type) =>
              getMusicAssistantLibrary(conn, entryId, type, { favorite: true, limit: 25 })
            )
          ),
          getMusicAssistantLibrary(conn, entryId, 'playlist', { limit: 50, orderBy: 'name' }),
          getMusicAssistantLibrary(conn, entryId, 'album', {
            limit: 50,
            orderBy: 'last_played_desc',
          }),
        ]);
        if (cancelled) return;
        setLibraryChoices({
          playerId,
          favorites: toMusicAssistantChoices(favorites.flat()),
          playlists: toMusicAssistantChoices(playlists),
          library: toMusicAssistantChoices(albums),
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, playerId, active, loadedForPlayer]);

  const searchKey = playerId && trimmedQuery ? `${playerId}::${trimmedQuery}` : '';

  useEffect(() => {
    if (!conn || !playerId || !active || !trimmedQuery) {
      setSearchLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const entryId = await getMusicAssistantConfigEntryId(conn, playerId);
        if (!entryId) throw new Error('music_assistant_entry_missing');
        const results = await searchMusicAssistant(conn, entryId, trimmedQuery);
        if (cancelled) return;
        setError(false);
        setSearchResults({
          key: `${playerId}::${trimmedQuery}`,
          choices: toMusicAssistantChoices(
            MUSIC_ASSISTANT_SEARCH_TYPES.flatMap((type) => results[type])
          ),
        });
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [conn, playerId, active, trimmedQuery]);

  if (!playerId) return null;
  const library = loadedForPlayer ? libraryChoices : null;
  return {
    favorites: library?.favorites || [],
    playlists: library?.playlists || [],
    library: library?.library || [],
    search: searchKey && searchResults?.key === searchKey ? searchResults.choices : [],
    loading: libraryLoading || searchLoading,
    error,
    loaded: !!library,
  };
}
