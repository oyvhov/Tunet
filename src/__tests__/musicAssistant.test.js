import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getMusicAssistantConfigEntryId,
  getMusicAssistantLibrary,
  searchMusicAssistant,
  toMusicAssistantChoice,
  toMusicAssistantChoices,
} from '../services/musicAssistant';
import { useMusicAssistantChoices } from '../hooks/useMusicAssistantChoices';

const album = {
  media_type: 'album',
  uri: 'library://album/53',
  name: 'Born To Die',
  version: 'The Paradise Edition',
  image: 'https://i.scdn.co/image/abc',
  artists: [{ media_type: 'artist', uri: 'library://artist/9', name: 'Lana Del Rey' }],
};
const track = {
  media_type: 'track',
  uri: 'library://track/60',
  name: '13 Beaches',
  version: '',
  image: null,
  artists: [{ name: 'Lana Del Rey' }],
  album: { name: 'Lust For Life', image: 'https://i.scdn.co/image/lfl' },
};

function connFor(handlers = {}) {
  return {
    sendMessagePromise: vi.fn(async (message) => {
      if (message.type === 'config/entity_registry/get') {
        return { entity_id: message.entity_id, config_entry_id: 'ma-entry' };
      }
      if (message.type === 'call_service' && message.domain === 'music_assistant') {
        const response = handlers[message.service]?.(message.service_data) ?? {};
        return { context: { id: 'x' }, response };
      }
      throw new Error(`unexpected ${message.type}`);
    }),
  };
}

describe('Music Assistant service', () => {
  it('reads the config entry of a player once per connection', async () => {
    const conn = connFor();
    await expect(getMusicAssistantConfigEntryId(conn, 'media_player.kitchen')).resolves.toBe(
      'ma-entry'
    );
    await getMusicAssistantConfigEntryId(conn, 'media_player.kitchen');
    expect(conn.sendMessagePromise).toHaveBeenCalledTimes(1);
    expect(conn.sendMessagePromise).toHaveBeenCalledWith({
      type: 'config/entity_registry/get',
      entity_id: 'media_player.kitchen',
    });
  });

  it('searches every media type and reads library pages with response data', async () => {
    const conn = connFor({
      search: () => ({ tracks: [track], albums: [album] }),
      get_library: () => ({ items: [album], limit: 50, offset: 0 }),
    });
    const results = await searchMusicAssistant(conn, 'ma-entry', 'lana');
    expect(results.tracks).toEqual([track]);
    expect(results.radio).toEqual([]);
    expect(conn.sendMessagePromise).toHaveBeenLastCalledWith({
      type: 'call_service',
      domain: 'music_assistant',
      service: 'search',
      service_data: { config_entry_id: 'ma-entry', name: 'lana', limit: 8 },
      return_response: true,
    });

    await expect(
      getMusicAssistantLibrary(conn, 'ma-entry', 'album', {
        favorite: true,
        limit: 25,
        orderBy: 'last_played_desc',
      })
    ).resolves.toEqual([album]);
    expect(conn.sendMessagePromise.mock.lastCall[0].service_data).toEqual({
      config_entry_id: 'ma-entry',
      media_type: 'album',
      favorite: true,
      limit: 25,
      order_by: 'last_played_desc',
    });
  });

  it('turns media items into chooser choices', () => {
    expect(toMusicAssistantChoice(album)).toEqual({
      id: 'library://album/53',
      label: 'Born To Die (The Paradise Edition)',
      type: 'album',
      image: 'https://i.scdn.co/image/abc',
      source: 'Lana Del Rey',
      musicAssistant: true,
    });
    expect(toMusicAssistantChoice(track).image).toBe('https://i.scdn.co/image/lfl');
    expect(toMusicAssistantChoice({ name: 'No uri' })).toBeNull();
    expect(toMusicAssistantChoices([album, album, track]).map((choice) => choice.id)).toEqual([
      'library://album/53',
      'library://track/60',
    ]);
  });
});

describe('useMusicAssistantChoices', () => {
  it('stays out of the way for other players', () => {
    const { result } = renderHook(() =>
      useMusicAssistantChoices({ conn: connFor(), playerId: null, active: true, query: '' })
    );
    expect(result.current).toBeNull();
  });

  it('loads favorites, playlists and albums, then searches as the user types', async () => {
    const conn = connFor({
      get_library: (data) => {
        if (data.favorite) return { items: data.media_type === 'album' ? [album] : [] };
        if (data.media_type === 'playlist') {
          return { items: [{ media_type: 'playlist', uri: 'library://playlist/1', name: 'Mix' }] };
        }
        return { items: [album] };
      },
      search: () => ({ tracks: [track] }),
    });
    const { result, rerender } = renderHook((props) => useMusicAssistantChoices(props), {
      initialProps: { conn, playerId: 'media_player.kitchen', active: true, query: '' },
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.favorites.map((choice) => choice.label)).toEqual([
      'Born To Die (The Paradise Edition)',
    ]);
    expect(result.current.playlists.map((choice) => choice.label)).toEqual(['Mix']);
    expect(result.current.library).toHaveLength(1);
    expect(result.current.search).toEqual([]);

    rerender({ conn, playerId: 'media_player.kitchen', active: true, query: 'lana' });
    await waitFor(() =>
      expect(result.current.search.map((choice) => choice.label)).toEqual(['13 Beaches'])
    );
    expect(result.current.loading).toBe(false);
  });

  it('reports an error when the player has no Music Assistant entry', async () => {
    const conn = {
      sendMessagePromise: vi.fn().mockResolvedValue({ entity_id: 'media_player.x' }),
    };
    const { result } = renderHook(() =>
      useMusicAssistantChoices({ conn, playerId: 'media_player.x', active: true, query: '' })
    );
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loaded).toBe(false);
  });
});
