import { useEffect, useState } from 'react';
import type { Connection } from 'home-assistant-js-websocket';
import {
  getMusicAssistantConfigEntryId,
  getMusicAssistantLibrary,
  MUSIC_ASSISTANT_SEARCH_TYPES,
  searchMusicAssistant,
  toMusicAssistantChoices,
} from '../services/musicAssistant';
import type { MusicAssistantChoice, MusicAssistantItem } from '../services/musicAssistant';

const FAVORITE_TYPES = ['playlist', 'album', 'artist', 'radio', 'track'];
const FAVORITES_PER_TYPE = 100;
const PLAYLIST_LIMIT = 200;
const ALBUM_PAGE_SIZE = 100;
const ALBUM_ORDER = 'last_played_desc';
const SEARCH_PAGE_SIZE = 25;
const SEARCH_MAX_LIMIT = 100;
const SEARCH_DELAY_MS = 350;

type LibraryChoices = {
  playerId: string;
  favorites: MusicAssistantChoice[];
  playlists: MusicAssistantChoice[];
  albums: MusicAssistantItem[];
  library: MusicAssistantChoice[];
  hasMoreAlbums: boolean;
};

export type MusicAssistantMoreTab = 'library' | 'search';

export type MusicAssistantChoices = {
  favorites: MusicAssistantChoice[];
  playlists: MusicAssistantChoice[];
  library: MusicAssistantChoice[];
  search: MusicAssistantChoice[];
  loading: boolean;
  error: boolean;
  loaded: boolean;
  hasMore: Record<MusicAssistantMoreTab, boolean>;
  loadMore: (tab: MusicAssistantMoreTab) => void;
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
    hasMore: boolean;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [widenedSearch, setWidenedSearch] = useState<{ key: string; limit: number } | null>(null);
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
              getMusicAssistantLibrary(conn, entryId, type, {
                favorite: true,
                limit: FAVORITES_PER_TYPE,
              })
            )
          ),
          getMusicAssistantLibrary(conn, entryId, 'playlist', {
            limit: PLAYLIST_LIMIT,
            orderBy: 'name',
          }),
          getMusicAssistantLibrary(conn, entryId, 'album', {
            limit: ALBUM_PAGE_SIZE,
            orderBy: ALBUM_ORDER,
          }),
        ]);
        if (cancelled) return;
        setLibraryChoices({
          playerId,
          favorites: toMusicAssistantChoices(favorites.flat()),
          playlists: toMusicAssistantChoices(playlists),
          albums,
          library: toMusicAssistantChoices(albums),
          hasMoreAlbums: albums.length === ALBUM_PAGE_SIZE,
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
  const searchLimit = widenedSearch?.key === searchKey ? widenedSearch.limit : SEARCH_PAGE_SIZE;

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
        const results = await searchMusicAssistant(conn, entryId, trimmedQuery, searchLimit);
        if (cancelled) return;
        setError(false);
        setSearchResults({
          key: `${playerId}::${trimmedQuery}`,
          choices: toMusicAssistantChoices(
            MUSIC_ASSISTANT_SEARCH_TYPES.flatMap((type) => results[type])
          ),
          hasMore:
            searchLimit < SEARCH_MAX_LIMIT &&
            MUSIC_ASSISTANT_SEARCH_TYPES.some((type) => results[type].length >= searchLimit),
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
  }, [conn, playerId, active, trimmedQuery, searchLimit]);

  if (!playerId) return null;
  const library = loadedForPlayer ? libraryChoices : null;
  const search = searchKey && searchResults?.key === searchKey ? searchResults : null;

  const loadMoreAlbums = async () => {
    if (!conn || !library?.hasMoreAlbums || libraryLoading) return;
    setLibraryLoading(true);
    try {
      const entryId = await getMusicAssistantConfigEntryId(conn, playerId);
      if (!entryId) throw new Error('music_assistant_entry_missing');
      const page = await getMusicAssistantLibrary(conn, entryId, 'album', {
        limit: ALBUM_PAGE_SIZE,
        offset: library.albums.length,
        orderBy: ALBUM_ORDER,
      });
      setError(false);
      setLibraryChoices((current) => {
        if (current?.playerId !== playerId) return current;
        const albums = [...current.albums, ...page];
        return {
          ...current,
          albums,
          library: toMusicAssistantChoices(albums),
          hasMoreAlbums: page.length === ALBUM_PAGE_SIZE,
        };
      });
    } catch {
      setError(true);
    } finally {
      setLibraryLoading(false);
    }
  };

  const loadMore = (tab: MusicAssistantMoreTab) => {
    if (tab === 'library') {
      void loadMoreAlbums();
    } else if (search?.hasMore) {
      setWidenedSearch({
        key: search.key,
        limit: Math.min(searchLimit + SEARCH_PAGE_SIZE, SEARCH_MAX_LIMIT),
      });
    }
  };

  return {
    favorites: library?.favorites || [],
    playlists: library?.playlists || [],
    library: library?.library || [],
    search: search?.choices || [],
    loading: libraryLoading || searchLoading,
    error,
    loaded: !!library,
    hasMore: { library: !!library?.hasMoreAlbums, search: !!search?.hasMore },
    loadMore,
  };
}
