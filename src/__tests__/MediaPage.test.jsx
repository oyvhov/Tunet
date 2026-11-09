import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MediaPage from '../components/pages/MediaPage';

vi.mock('../components/media/MusicAssistantLink', () => ({ default: () => null }));

const makeBaseProps = (overrides = {}) => {
  const entities = overrides.entities || {
    'media_player.kitchen': {
      entity_id: 'media_player.kitchen',
      state: 'idle',
      attributes: {
        friendly_name: 'Kitchen',
        integration: 'sonos',
        supported_features: 0,
      },
    },
  };

  const getA = (entityId, attr, fallback = null) =>
    entities[entityId]?.attributes?.[attr] ?? fallback;

  return {
    pageId: 'sonos',
    entities,
    conn: null,
    pageSettings: {},
    editMode: false,
    isSonosActive: () => false,
    activeMediaId: null,
    setActiveMediaId: vi.fn(),
    getA,
    getEntityImageUrl: (value) => value || null,
    callService: vi.fn(),
    savePageSetting: vi.fn(),
    formatDuration: (value) => String(value ?? 0),
    t: (key) => key,
    mode: 'sonos',
    ...overrides,
  };
};

describe('MediaPage Sonos discovery', () => {
  it('renders Sonos players discovered through integration metadata', () => {
    render(
      <MediaPage
        {...makeBaseProps({
          entities: {
            'media_player.living_room': {
              entity_id: 'media_player.living_room',
              state: 'idle',
              attributes: {
                friendly_name: 'Living Room',
                integration: 'sonos',
                supported_features: 0,
              },
            },
            'media_player.bedroom_tv': {
              entity_id: 'media_player.bedroom_tv',
              state: 'idle',
              attributes: {
                friendly_name: 'Bedroom TV',
                integration: 'cast',
                supported_features: 0,
              },
            },
          },
        })}
      />
    );

    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    expect(screen.queryByText('media.noPlayersFound')).not.toBeInTheDocument();
    expect(screen.queryByText('Bedroom TV')).not.toBeInTheDocument();
  });

  it('shows neutral-named Sonos players in the selector even when page selection is curated', () => {
    render(
      <MediaPage
        {...makeBaseProps({
          editMode: true,
          pageSettings: {
            sonos: {
              mediaIds: ['media_player.kitchen'],
            },
          },
          entities: {
            'media_player.kitchen': {
              entity_id: 'media_player.kitchen',
              state: 'idle',
              attributes: {
                friendly_name: 'Kitchen',
                integration: 'sonos',
                supported_features: 0,
              },
            },
            'media_player.living_room': {
              entity_id: 'media_player.living_room',
              state: 'idle',
              attributes: {
                friendly_name: 'Living Room',
                sonos_favorites: ['Radio'],
                supported_features: 0,
              },
            },
          },
        })}
      />
    );

    expect(screen.getAllByText('Kitchen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
    expect(screen.getByRole('switch', { name: 'Kitchen' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Living Room' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('uses one clear switch per player while editing the page', () => {
    const savePageSetting = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          editMode: true,
          savePageSetting,
          pageSettings: { sonos: { mediaIds: ['media_player.kitchen'] } },
        })}
      />
    );

    const kitchenSwitch = screen.getByRole('switch', { name: 'Kitchen' });
    fireEvent.click(kitchenSwitch);

    expect(savePageSetting).toHaveBeenCalledWith('sonos', 'mediaIds', []);
  });
});

describe('MediaPage Sonos empty state', () => {
  it('renders the empty state when no Sonos players are present', () => {
    render(<MediaPage {...makeBaseProps({ entities: {} })} />);
    expect(screen.getByText('sonos.empty.title')).toBeInTheDocument();
    expect(screen.getByText('sonos.empty.subtitle')).toBeInTheDocument();
    expect(screen.queryByText('media.noPlayersFound')).not.toBeInTheDocument();
  });
});

describe('MediaPage empty selection', () => {
  it.each([
    ['cleared', []],
    ['pointing only at removed players', ['media_player.gone']],
  ])('shows every player and keeps Manage when the selection is %s', (_label, mediaIds) => {
    render(<MediaPage {...makeBaseProps({ pageSettings: { sonos: { mediaIds } } })} />);

    expect(screen.getAllByText('Kitchen').length).toBeGreaterThan(0);
    expect(screen.queryByText('sonos.empty.title')).not.toBeInTheDocument();
    expect(screen.queryByText('media.noPlayersFound')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'sonos.managePlayers' })).toBeInTheDocument();
  });

  it('starts a curated list from the first player picked after Clear', () => {
    const savePageSetting = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          editMode: true,
          savePageSetting,
          pageSettings: { sonos: { mediaIds: [] } },
        })}
      />
    );

    const kitchenSwitch = screen.getByRole('switch', { name: 'Kitchen' });
    expect(kitchenSwitch).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(kitchenSwitch);
    expect(savePageSetting).toHaveBeenCalledWith('sonos', 'mediaIds', ['media_player.kitchen']);
  });
});

const GROUPING = 524288;

describe('MediaPage grouping feature', () => {
  const player = (id, supported_features, extra = {}) => ({
    entity_id: `media_player.${id}`,
    state: 'idle',
    attributes: { friendly_name: id, group_members: [], supported_features, ...extra },
  });
  const pageProps = (entities, mode = 'media') => ({
    ...makeBaseProps({ pageId: 'media', mode, entities, conn: { sendMessagePromise: vi.fn() } }),
    activeMediaId: Object.keys(entities)[0],
  });

  it('offers grouping to non-Sonos players that support it', () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...pageProps({
          'media_player.den': player('den', GROUPING),
          'media_player.hall': player('hall', GROUPING),
          'media_player.tv': player('tv', 0),
        })}
        callService={callService}
      />
    );

    fireEvent.click(screen.getAllByLabelText('sonos.groupAll')[0]);

    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: 'media_player.den',
      group_members: ['media_player.hall'],
    });
    expect(screen.getAllByTitle('tooltip.addToGroup')).toHaveLength(1);
  });

  it('hides grouping on a Sonos page whose players do not report the feature', () => {
    render(
      <MediaPage
        {...pageProps(
          {
            'media_player.a': player('a', 0, { integration: 'sonos' }),
            'media_player.b': player('b', 0, { integration: 'sonos' }),
          },
          'sonos'
        )}
      />
    );

    expect(screen.queryByLabelText('sonos.groupAll')).not.toBeInTheDocument();
    expect(screen.queryByTitle('tooltip.addToGroup')).not.toBeInTheDocument();
  });

  it('does not offer to group players from different integrations', () => {
    render(
      <MediaPage
        {...pageProps({
          'media_player.squeeze': player('squeeze', GROUPING, { platform: 'squeezebox' }),
          'media_player.cast': player('cast', GROUPING, { platform: 'cast' }),
        })}
      />
    );

    expect(screen.queryByLabelText('sonos.groupAll')).not.toBeInTheDocument();
  });
});

describe('MediaPage Sonos grouping', () => {
  const groupingEntities = {
    'media_player.kitchen': {
      entity_id: 'media_player.kitchen',
      state: 'playing',
      attributes: {
        friendly_name: 'Kitchen',
        integration: 'sonos',
        group_members: ['media_player.kitchen'],
        supported_features: GROUPING,
      },
    },
    'media_player.bedroom': {
      entity_id: 'media_player.bedroom',
      state: 'idle',
      attributes: {
        friendly_name: 'Bedroom',
        integration: 'sonos',
        group_members: ['media_player.bedroom'],
        supported_features: GROUPING,
      },
    },
  };

  it('joins all other players when "Group" is clicked and no group exists yet', () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          entities: groupingEntities,
          activeMediaId: 'media_player.kitchen',
          callService,
          conn: { sendMessagePromise: vi.fn() },
        })}
      />
    );

    const groupBtn = screen.getByLabelText('sonos.groupAll');
    fireEvent.click(groupBtn);

    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: 'media_player.kitchen',
      group_members: ['media_player.bedroom'],
    });
  });

  it('does not call join when there is no active connection', () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          entities: groupingEntities,
          activeMediaId: 'media_player.kitchen',
          callService,
          conn: null,
        })}
      />
    );

    const groupBtn = screen.getByLabelText('sonos.groupAll');
    fireEvent.click(groupBtn);

    expect(callService).not.toHaveBeenCalled();
  });
});

// PAUSE | SEEK | VOLUME_SET | VOLUME_MUTE | PREVIOUS | NEXT | PLAY | SHUFFLE | REPEAT
const ALL_TRANSPORT = 1 + 2 + 4 + 8 + 16 + 32 + 16384 + 32768 + 262144;

describe('MediaPage player state', () => {
  const renderPlayer = (state, attributes = {}) => {
    const entities = {
      'media_player.den': {
        entity_id: 'media_player.den',
        state,
        attributes: { friendly_name: 'Den', supported_features: ALL_TRANSPORT, ...attributes },
      },
    };
    render(<MediaPage {...makeBaseProps({ pageId: 'media', mode: 'media', entities })} />);
    return {
      shuffle: screen.getByRole('button', { name: 'media.shuffle' }),
      repeat: screen.getByRole('button', { name: /^media\.repeat/ }),
      previous: screen.getByRole('button', { name: 'media.previous' }),
      next: screen.getByRole('button', { name: 'media.next' }),
      play: screen.getByRole('button', { name: /^media\.(play|pause)$/ }),
      mute: screen.getByRole('button', { name: 'media.volume.mute' }),
    };
  };
  const heading = () => screen.getByRole('heading', { level: 2 });

  it('shows Idle instead of Unknown and only offers play on an idle player', () => {
    const controls = renderPlayer('idle');
    expect(heading()).toHaveTextContent('state.idle');
    expect(controls.play).toBeEnabled();
    expect(controls.mute).toBeEnabled();
    expect(controls.shuffle).toBeDisabled();
    expect(controls.previous).toBeDisabled();
  });

  it('shows Unavailable and disables every control on an offline player', () => {
    const controls = renderPlayer('unavailable');
    expect(heading()).toHaveTextContent('status.unavailable');
    Object.values(controls).forEach((control) => expect(control).toBeDisabled());
    screen.getAllByRole('slider').forEach((slider) => expect(slider).toBeDisabled());
  });

  it('labels a player without a title with its state in the player list', () => {
    renderPlayer('off');
    expect(screen.getAllByText('status.off').length).toBe(2);
  });

  it('disables controls the player does not support while it plays', () => {
    const controls = renderPlayer('playing', {
      media_title: 'A Song',
      media_duration: 200,
      supported_features: 1 + 16384 + 4,
    });
    expect(heading()).toHaveTextContent('A Song');
    expect(controls.play).toBeEnabled();
    expect(controls.next).toBeDisabled();
    expect(controls.previous).toBeDisabled();
    expect(controls.shuffle).toBeDisabled();
    expect(controls.repeat).toBeDisabled();
    expect(controls.mute).toBeDisabled();
    const [seek, volume] = screen.getAllByRole('slider');
    expect(seek).toBeDisabled();
    expect(volume).toBeEnabled();
  });
});

describe('MediaPage touch targets', () => {
  it('gives the volume and group buttons a 44 px hit area', () => {
    const player = (id, name) => ({
      entity_id: id,
      state: 'playing',
      attributes: {
        friendly_name: name,
        integration: 'sonos',
        group_members: [id],
        supported_features: 4 + 524288,
      },
    });
    render(
      <MediaPage
        {...makeBaseProps({
          conn: {},
          activeMediaId: 'media_player.kitchen',
          entities: {
            'media_player.kitchen': player('media_player.kitchen', 'Kitchen'),
            'media_player.bedroom': player('media_player.bedroom', 'Bedroom'),
          },
        })}
      />
    );

    ['Volume down', 'Volume up', 'media.volume.mute'].forEach((name) =>
      expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'w-11')
    );
    [screen.getByTitle('tooltip.addToGroup'), ...screen.getAllByTitle('sonos.groupAll')].forEach(
      (button) => expect(button).toHaveClass('relative', 'after:h-11', 'after:min-w-11')
    );
  });

  it('gives every transport button and tab a 44 px hit area', () => {
    render(
      <MediaPage
        {...makeBaseProps({
          entities: {
            'media_player.kitchen': {
              entity_id: 'media_player.kitchen',
              state: 'playing',
              attributes: {
                friendly_name: 'Kitchen',
                integration: 'sonos',
                supported_features: 128 + 256,
              },
            },
          },
        })}
      />
    );

    ['media.shuffle', /^media\.repeat/, 'media.previous', 'media.next', 'media.pause'].forEach(
      (name) => expect(screen.getByRole('button', { name })).toHaveClass('min-h-11', 'min-w-11')
    );
    expect(screen.getByTitle('status.off')).toHaveClass('min-h-11', 'min-w-11');
    ['media.tab.players', 'media.tab.media', 'sonos.managePlayers'].forEach((name) =>
      expect(screen.getByRole('button', { name })).toHaveClass('min-h-11')
    );

    fireEvent.click(screen.getByRole('button', { name: 'media.tab.media' }));
    ['favorites', 'playlists', 'library', 'search'].forEach((tab) =>
      expect(screen.getByRole('button', { name: `media.choose.tab.${tab}` })).toHaveClass(
        'min-h-11'
      )
    );
  });
});

describe('MediaPage slider commands', () => {
  const playingEntities = {
    'media_player.den': {
      entity_id: 'media_player.den',
      state: 'playing',
      attributes: {
        friendly_name: 'Den',
        media_title: 'A Song',
        media_duration: 200,
        media_position: 10,
        media_position_updated_at: '2026-11-08T10:00:00+00:00',
        volume_level: 0.2,
        supported_features: ALL_TRANSPORT,
      },
    },
  };
  const setup = () => {
    const callService = vi.fn();
    render(
      <MediaPage
        {...makeBaseProps({
          pageId: 'media',
          mode: 'media',
          entities: playingEntities,
          callService,
        })}
      />
    );
    const [seek, volume] = screen.getAllByRole('slider');
    return { callService, seek, volume };
  };
  const calls = (callService, service) =>
    callService.mock.calls.filter(
      ([domain, name]) => domain === 'media_player' && name === service
    );

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const drag = (slider, value) => {
    fireEvent.change(slider, { target: { value: String(value) } });
    act(() => vi.advanceTimersByTime(20));
  };

  it('seeks once on release and follows the finger until then', () => {
    const { callService, seek } = setup();
    fireEvent.pointerDown(seek);
    drag(seek, 50);
    drag(seek, 90);
    expect(calls(callService, 'media_seek')).toHaveLength(0);
    expect(screen.getByText('90')).toBeInTheDocument();
    fireEvent.pointerUp(seek);
    expect(calls(callService, 'media_seek')).toEqual([
      ['media_player', 'media_seek', { entity_id: 'media_player.den', seek_position: 90 }],
    ]);
  });

  it('keeps the released position on screen until Home Assistant reports it', () => {
    const { seek } = setup();
    fireEvent.pointerDown(seek);
    drag(seek, 90);
    fireEvent.pointerUp(seek);
    act(() => vi.advanceTimersByTime(500));
    expect(seek).toHaveValue('90');
  });

  it('sends only the last volume after a pause in the drag', () => {
    const { callService, volume } = setup();
    fireEvent.pointerDown(volume);
    drag(volume, 40);
    drag(volume, 55);
    expect(calls(callService, 'volume_set')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(400));
    expect(calls(callService, 'volume_set')).toEqual([
      ['media_player', 'volume_set', { entity_id: 'media_player.den', volume_level: 0.55 }],
    ]);
  });
});

describe('MediaPage Music Assistant chooser', () => {
  const entities = {
    'media_player.den': {
      entity_id: 'media_player.den',
      state: 'idle',
      attributes: { friendly_name: 'Den', mass_player_type: 'player', supported_features: 0 },
    },
  };
  const albums = (count, start = 0) =>
    Array.from({ length: count }, (_, index) => ({
      media_type: 'album',
      uri: `library://album/${start + index}`,
      name: `Album ${start + index}`,
    }));
  const makeConn = (handlers) => ({
    sendMessagePromise: vi.fn(async (message) => {
      if (message.type === 'config/entity_registry/get') return { config_entry_id: 'ma' };
      return { response: (await handlers[message.service]?.(message.service_data)) ?? {} };
    }),
  });
  const openChooser = async (conn, tab) => {
    render(<MediaPage {...makeBaseProps({ pageId: 'media', mode: 'media', entities, conn })} />);
    fireEvent.click(screen.getByRole('button', { name: 'media.tab.media' }));
    await waitFor(() =>
      expect(screen.queryByTestId('media-page-chooser-loading')).not.toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: `media.choose.tab.${tab}` }));
  };
  const tiles = () =>
    screen.getAllByRole('button').filter((button) => /^Album \d+/.test(button.textContent));

  it('hides No results while a search is running', async () => {
    let finishSearch;
    const conn = makeConn({
      get_library: () => ({ items: [] }),
      search: () =>
        new Promise((resolve) => {
          finishSearch = resolve;
        }),
    });
    await openChooser(conn, 'search');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nobody' } });

    await waitFor(() => expect(finishSearch).toBeTypeOf('function'));
    expect(screen.getByText('media.choose.loading')).toBeInTheDocument();
    expect(screen.queryByText('form.noResults')).not.toBeInTheDocument();

    await act(async () => finishSearch({}));
    await waitFor(() => expect(screen.getByText('form.noResults')).toBeInTheDocument());
  });

  it('reveals more tiles and fetches the next page once the loaded ones run out', async () => {
    const conn = makeConn({
      get_library: (data) => {
        if (data.favorite || data.media_type !== 'album') return { items: [] };
        return { items: data.offset ? albums(5, 100) : albums(100) };
      },
    });
    await openChooser(conn, 'library');
    expect(tiles()).toHaveLength(60);

    fireEvent.click(screen.getByRole('button', { name: 'media.choose.showMore' }));

    expect(tiles()).toHaveLength(100);
    await waitFor(() => expect(tiles()).toHaveLength(105));
    expect(
      conn.sendMessagePromise.mock.calls.some(([message]) => message.service_data?.offset === 100)
    ).toBe(true);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'media.choose.showMore' })).toBeNull()
    );
  });

  it('shows no Show more for a short list', async () => {
    const conn = makeConn({ get_library: () => ({ items: albums(3) }) });
    await openChooser(conn, 'library');
    expect(screen.queryByRole('button', { name: 'media.choose.showMore' })).toBeNull();
  });
});

describe('MediaPage media chooser', () => {
  it('browses nested favorites for generic players without replacing the chooser layout', async () => {
    const browseResults = {
      '': {
        title: 'Media sources',
        children: [
          {
            title: 'Music Assistant',
            media_class: 'app',
            media_content_type: 'app',
            media_content_id: 'media-source://music-assistant',
            can_play: false,
            can_expand: true,
          },
        ],
      },
      'media-source://music-assistant': {
        title: 'Music Assistant',
        children: [
          {
            title: 'Favorittar',
            media_content_type: 'music',
            media_content_id: 'library://favorites',
            can_play: false,
            can_expand: true,
          },
        ],
      },
      'library://favorites': {
        title: 'Favorittar',
        children: [
          {
            title: 'Born to Be Alive',
            media_content_type: 'music',
            media_content_id: 'spotify://track/favorite-1',
            can_play: true,
            can_expand: false,
          },
        ],
      },
    };
    const conn = {
      sendMessagePromise: vi.fn(async (message) => {
        const contentId = message.media_content_id || '';
        return browseResults[contentId] || { title: 'Empty', children: [] };
      }),
    };
    const entities = {
      'media_player.emby_tv': {
        entity_id: 'media_player.emby_tv',
        state: 'idle',
        attributes: {
          friendly_name: 'Emby TV',
          integration: 'emby',
          supported_features: 0,
        },
      },
    };

    render(
      <MediaPage
        {...makeBaseProps({
          pageId: 'media',
          mode: 'media',
          entities,
          conn,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'media.tab.media' }));

    expect(screen.getByTestId('media-page-chooser')).toBeInTheDocument();
    expect(screen.getByTestId('media-page-chooser-results')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('media-page-chooser-loading')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Born to Be Alive')).toBeInTheDocument());

    expect(screen.getByTestId('media-page-chooser-results')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByTestId('media-page-chooser-loading')).not.toBeInTheDocument();
    expect(conn.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ media_content_id: 'library://favorites' })
    );
  });
});
